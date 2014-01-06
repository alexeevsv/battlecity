var express = require("express"),
    app = express(),
    server = require("http").createServer(app),
    io = require("socket.io").listen(server, {
        log: false
    }),
    messages = [],
    path = require("path"),
    maxPlayersAmount = 4,
    Bullet = require("bullet"),
    Player = require("player"),
    Enum = require("enum"),
    fs = require("fs"),
    games = {};

server.listen(3000);

//setInterval(actualizeGames, 1500);
app.get("/", function (req, res, callback) {
    res.sendfile(__dirname + "/index.html");
});

app.use(express.static(__dirname));

start();

function initMap(gameId) {
    var data = {};
    if (countObjElements(games[gameId].mapLayout) == 0) {
        try {
            data = fs.readFileSync("resources/map.json");
            games[gameId].mapLayout = JSON.parse(data.toString());
        } catch (e) {
            logEvent("init map failed" + e.message);
        }
    }

    games[gameId].map = JSON.parse(JSON.stringify(games[gameId].mapLayout));
    io.sockets.in(gameId).emit("load_map", games[gameId].mapLayout);
}


function start() {
    logEvent("server started");

    io.sockets.on("connection", function (socket) {

        socket.on("load_map", function (gameId) {
            try {
                socket.emit("load_map", games[gameId].map);
            } catch (e) {
                logEvent(e.message);
            }
        });

        socket.on("get_current_games", function () {
            var tempGames = {};
            for (var key in games) {
                if (tempGames[key] == undefined) {
                    tempGames[key] = {};
                }
                tempGames[key].players = playersData(key);
                tempGames[key].gameName = games[key].gameName;
            }
            try {
                socket.emit("get_current_games", tempGames);
            } catch (e) {
                logEvent("getting current games failed: " + e.message)
            }
        });

        socket.on("create_new_game", function (data) {
            var game = createGame(data);

            try {
                if (game !== false) {
                    socket.emit("game_created", game);
                } else {
                    socket.emit("game_create_error", "");
                }
            } catch (e) {
                logEvent("create game error: " + e.message);
            }
        });

        socket.on("player_connected", function (data) {

            var connection = playerConnection(data);
            if (games[data.gameId] != undefined) {
                socket.join(data.gameId);
                try {
                    //TODO : change players object
                    socket.emit('authorizing', [
                        connection.mayConnect,
                        connection.playerNumber,
                        connection.clientPosition,
                        games[data.gameId].bonuses,
                        playersData(data.gameId),
                        games[data.gameId].mines
                    ]);
                } catch (e) {
                    logEvent("passing current game data error: " + e.message);
                }
            } else {
                logEvent("error creating game");
            }
        });

        socket.on("check_ping", function (time) {
            socket.emit("check_ping", time);
        });

        /* tank moves */
        socket.on("move", function (data) {
            //data[0] - direction
            //data[1] - playerNumber
            //data[2] - gameID
            move(data);
            sendBattlefieldInfo(data[2]);
        });

        /* tank shoots */
        socket.on("fire", function (data) {
            if (games[data.gameId] != undefined) {
                var player = games[data.gameId].players[data.playerNumber],
                    shot;
                if (player !== undefined && player.canFire === true && player.alive === true && player.currentWeapon !== undefined) {
                    shot = fire(data);
                    try {
                        io.sockets.in(data.gameId).emit("projectile_started",
                            [shot.projectileNum, shot.sx, shot.sy, data.direction, data.playerNumber, player.currentWeapon, player.inventory[player.currentWeapon]]
                        );
                        player.checkAmmo();
                    } catch (e) {
                        logEvent(e.stack);
                    }
                }
            }
        });

        socket.on("change_weapon", function (data) {
            var player;

            if (games[data.gameId] != undefined) {
                player = games[data.gameId].players[data.playerNumber];
                if (player != undefined) {
                    player.switchWeapon();
                    socket.emit("change_weapon", {currentWeapon: player.currentWeapon, ammo: player.inventory[player.currentWeapon]});
                }
            }
        });

        /* check if player is online */
        socket.on("check_player", function (data) {
            var playerNumber = data.playerNumber,
                gameId = data.gameId;

            if (games[gameId] != undefined) {
                if (games[gameId].players[playerNumber] != undefined) {
                    games[gameId].players[playerNumber].lastUpdate = parseInt(Date.now() / 1000);
                    games[gameId].players[playerNumber].addPing(data.ping);
                }
                try {
                    io.sockets.in(gameId).emit("check_player", playersData(gameId));
                } catch (e) {
                    logEvent(e.stack);
                }
            }
        });

        socket.on("save_map", function (data) {
            if (games[data.gameId] != undefined) {
                games[data.gameId].mapLayout = data.map;
            }
        });

        socket.on("reload_map", function (gameId) {
            initMap(gameId);
        });

        socket.on("check_if_locked", function (gameId) {
            var result = isLocked(gameId);

            socket.emit("check_if_locked", {
                gameId: gameId,
                locked: result.isLocked,
                reason: result.reason
            });
        });

        socket.on("check_password", function (data) {
            var correctPassword = false;
            if (isCorrectPassword(data.gameId, data.password)) {
                correctPassword = true;
            }
            socket.emit("check_password", {
                gameId: data.gameId,
                correctPassword: correctPassword
            });
        });

        socket.on("player_leaved", function (data) {
            var wasHost, avgPing = 0;
            if (games[data.gameId] != undefined && games[data.gameId].players[data.playerNumber] != undefined) {
                wasHost = games[data.gameId].players[data.playerNumber].host;
                avgPing = games[data.gameId].players[data.playerNumber].getAvgPing();
                delete games[data.gameId].players[data.playerNumber];
            }
            if (wasHost) redefineHost(data.gameId);
            logEvent("player " + data.playerNumber + " disconnected; avgping: " + avgPing);
            actualizeGames();
        });

        socket.on("change_player_name", function (data) {
            if (games[data.gameId] != undefined && games[data.gameId].players[data.playerNumber] != undefined) {
                var playerName = data.playerName.slice(0, 7);
                ;
                games[data.gameId].players[data.playerNumber].playerName = playerName;
                io.sockets.in(data.gameId).emit("change_player_name", {
                    playerNumber: data.playerNumber,
                    playerName: playerName
                })
            }
        });

        socket.on("get_current_weapon", function (data) {
            var player;

            if (games[data.gameId] !== undefined) {
                player = games[data.gameId].players[data.playerNumber];
                if (player !== undefined) {
                    socket.emit("get_current_weapon", {currentWeapon: player.currentWeapon, ammo: player.inventory[player.currentWeapon]});
                }
            }
        });

    });

    setInterval(checkPlayersConnections, 200);

    setInterval(checkBulletsExistanse, 5);

    setInterval(handleBonuses, Enum.bonusTimeoutMs);
}

function playersData(gameId) {
    var player, data = {};
    if (games[gameId] !== undefined) {
        for (var key in games[gameId].players) {
            if (games[gameId].players.hasOwnProperty(key)) {
                player = games[gameId].players[key];
                data[key] = {
                    playerName: player.playerName,
                    playerNumber: player.playerNumber,
                    host: player.host,
                    position: player.position,
                    hitPoints: player.hitPoints,
                    armor: player.armor,
                    hashCode: player.hashCode,
                    score: player.score
                }
            }
        }
    }
    return data;
}

function isCorrectPassword(gameId, password) {
    if (games[gameId] != undefined && games[gameId].gamePassword == password) {
        return true;
    }
    return false;
}

function isLocked(gameId) {
    var result = {
        isLocked: false,
        reason: ""
    };
    if (games[gameId] == undefined || games[gameId].gamePassword != "") {
        result.isLocked = true;
        result.reason = "password lock";
    }
    if (games[gameId] != undefined && countObjElements(games[gameId].players) >= maxPlayersAmount) {
        result.isLocked = true;
        result.reason = "no free slots";
    }
    return result;
}

function createGame(data) {
    var gameId = parseInt((Math.random() * 10000) * (Date.now() / 1000)),
        gameName = data[0],
        gamePassword = data[1];

    if (countObjElements(games) > 0) {
        for (var key in games) {
            if (games[key].gameName == gameName || key == gameId) {
                return false;
            }
        }
    }
    games[gameId] = {
        gameName: gameName,
        gamePassword: gamePassword,
        players: {},
        bonuses: {},
        bullets: {},
        mines: {},
        mapLayout: {},
        map: {}
    };
    initMap(gameId);
    logEvent("game " + gameId + " created");
    return gameId;
}

function countObjElements(obj) {
    var i = 0;
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            i++;
        }
    }
    return i;
}

function handlePlayerDeath(gameId, player, killerPlayerNumber) {

    var killerScore = 0;

    if (player.playerNumber !== killerPlayerNumber) {
        if (games[gameId].players[killerPlayerNumber] !== undefined)
            killerScore = ++games[gameId].players[killerPlayerNumber].score;
    } else {
        games[gameId].players[player.playerNumber].score--;
    }
    player.position.x = undefined;
    player.position.y = undefined;
    try {
        io.sockets.in(gameId).emit("player_died", [
            player.playerNumber,
            player.position,
            killerPlayerNumber,
            killerScore
        ]);
    } catch (e) {
        logEvent(e.stack);
    }
    var tempPlayerNumber = player.playerNumber;
    setTimeout(function () {
        resumePlayer(tempPlayerNumber, gameId);
        io.sockets.in(gameId).emit("get_current_weapon", {currentWeapon: player.currentWeapon, ammo: player.inventory[player.currentWeapon]});
    }, 3000);
}

/* calculates button collision with players and walls */

function calculateBulletCollision(gameId) {
    var bullet, player, block;
    for (var b in games[gameId].bullets) {
        bullet = games[gameId].bullets[b];
        for (var p in games[gameId].players) {
            player = games[gameId].players[p];
            if ((bullet.position.x >= player.position.x - 2 && bullet.position.x <= player.position.x + 32) && (bullet.position.y >= player.position.y && bullet.position.y <= player.position.y + 32) && (bullet.playerNumber != p)) {
                bullet.stop();
                player.shot(bullet.damage);
                try {
                    io.sockets.in(gameId).emit("explosion", [b, player.position, undefined, player.playerNumber, player.hitPoints, player.armor]);
                } catch (e) {
                    logEvent(e.stack);
                }
                if (player.alive === false) {
                    handlePlayerDeath(gameId, player, bullet.playerNumber);
                }
                break;
            }
        }

        for (var key in games[gameId].map) {
            block = games[gameId].map[key];
            if ((block.m == "wall") && (bullet.position.x >= block.x && bullet.position.x <= block.x + 32) && (bullet.position.y >= block.y && bullet.position.y <= block.y + 32)) {
                if (block.l > 0) {
                    block.l -= bullet.damage;
                    if (block.l <= 0) {
                        delete games[gameId].map[key];
                    }
                }
                io.sockets.in(gameId).emit("explosion", [b,
                    {
                        x: block.x,
                        y: block.y
                    },
                    block.l]);
                bullet.stop();
                break;
            }
        }
    }
}

/* calculates player's start position */

function calculateStartPosition(gameId) {

    var calculate = function () {
        return {
            x: parseInt(Math.random() * (Enum.fieldWidth - Enum.blockSize) / 32) * 32,
            y: parseInt(Math.random() * (Enum.fieldHeight - Enum.blockSize) / 32) * 32
        };
    }

    var wall, startPosition = calculate(),
        done, player;

    do {
        done = true;
        for (var key in games[gameId].map) {
            wall = games[gameId].map[key];
            if (wall.x == startPosition.x && wall.y == startPosition.y) {
                startPosition = calculate();
                done = false;
                break;
            }
        }
        for (var key in games[gameId].players) {
            player = games[gameId].players[key];
            if ((startPosition.x >= player.position.x && startPosition.x <= player.position.x + 32) && (startPosition.y >= player.position.y && startPosition.y <= player.position.y + 32)

                ) {
                startPosition = calculate();
                done = false;
                break;
            }
        }
    } while (done === false);
    return startPosition;
}

function createBonus(gameId) {
    if (games[gameId] != undefined) {
        var rndBonus = Enum.bonusArray[parseInt(Math.random() * Enum.bonusArray.length)];
        if (games[gameId].bonuses[rndBonus] == undefined) {
            var position = calculateStartPosition(gameId);
            games[gameId].bonuses[rndBonus] = {position: position, createdTime: Date.now()};
            return [rndBonus, position];
        }
    }
    return undefined;
}

/* defining player number and create player if there is a free spot ( returns 0 if no free spot ) */

function getPlayerNumber(gameId) {
    var playerNumber = 0;
    for (var i = 1; i <= maxPlayersAmount; i++) {
        if (games[gameId].players[i] == undefined) {
            games[gameId].players[i] = new Player(0, 0, i);
            playerNumber = i;
            break;
        }
    }
    return playerNumber;
}

function move(data) {
    //data[0] - direction
    //data[1] - playerNumber
    //data[2] - gameID
    var gameId = data[2];

    if (games[gameId] != undefined) {
        var currentPlayerNumber = data[1],
            player = games[gameId].players[currentPlayerNumber],
            direction = data[0],
            block;

        if (player != undefined) {

            player.prevDirection = player.direction;
            player.direction = direction;
            player.prevPosition.x = player.position.x;
            player.prevPosition.y = player.position.y;

            if (direction == player.prevDirection) {
                switch (direction) {
                    case Enum.directions.up:
                        player.position.y -= Enum.playerStep;
                        break;
                    case Enum.directions.down:
                        player.position.y += Enum.playerStep;
                        break;
                    case Enum.directions.left:
                        player.position.x -= Enum.playerStep;
                        break;
                    case Enum.directions.right:
                        player.position.x += Enum.playerStep;
                        break;
                }
                //TODO : исправить константы размера поля и игрока
                player.position.x = player.position.x < 0 ? 0 : player.position.x;
                player.position.x = player.position.x > Enum.fieldWidth - 32 ? Enum.fieldWidth - 32 : player.position.x;
                player.position.y = player.position.y < 0 ? 0 : player.position.y;
                player.position.y = player.position.y > Enum.fieldHeight - 32 ? Enum.fieldHeight - 32 : player.position.y;

                var pl;
                /* players collision check */
                for (var key in games[gameId].players) {
                    pl = games[gameId].players[key];
                    if (key != currentPlayerNumber) {
                        if ((player.position.x >= pl.position.x - 29 && player.position.x <= pl.position.x + 29) && (player.position.y >= pl.position.y - 29 && player.position.y <= pl.position.y + 29)) {
                            player.position.x = player.prevPosition.x;
                            player.position.y = player.prevPosition.y;
                            break;
                        }
                    }
                }

                /* walls collision check */
                for (var key in games[gameId].map) {
                    block = games[gameId].map[key];
                    if (
                        block.m != "woods"

                            && ((player.position.x >= block.x - 29 && player.position.x <= block.x + 29) && (player.position.y >= block.y - 29 && player.position.y <= block.y + 29))) {
                        player.position.x = player.prevPosition.x;
                        player.position.y = player.prevPosition.y;
                        break;

                    }
                }
            }

            /* bonuses collision check */
            var bonus,
                crateBonus;
            for (var bonusName in games[gameId].bonuses) {
                bonus = games[gameId].bonuses[bonusName];
                if (
                    (player.position.x >= bonus.position.x - 29 && player.position.x <= bonus.position.x + 29)
                        &&
                        (player.position.y >= bonus.position.y - 29 && player.position.y <= bonus.position.y + 29)) {

                    crateBonus = player.applyBonus(bonusName);
                    try {
                        io.sockets.in(gameId).emit("bonus_picked_up", [
                            bonusName,
                            currentPlayerNumber,
                            bonus,
                            player.hitPoints,
                            player.armor,
                            player.inventory,
                            crateBonus
                        ]);
                    } catch (e) {
                        logEvent(e.stack);
                    }
                    delete games[gameId].bonuses[bonusName];
                    break;
                }
            }

            /* mines collision check */
            var mine;
            for (var m in games[gameId].mines) {
                mine = games[gameId].mines[m];
                if ((player.position.x >= mine.position.x - 29 && player.position.x <= mine.position.x + 29) && (player.position.y >= mine.position.y - 29 && player.position.y <= mine.position.y + 29) && mine.activated === true) {
                    //TODO : count player HP after explosion
                    player.shot(Enum.weaponDamage[Enum.weapons.mine]);
                    try {
                        io.sockets.in(gameId).emit("mine_explode", [
                            currentPlayerNumber,
                            mine.position,
                            player.hitPoints,
                            player.armor,
                            m
                        ]);
                    } catch (e) {
                        logEvent(e.stack);
                    }
                    delete games[gameId].mines[m];

                    if (player.alive === false) {
                        handlePlayerDeath(gameId, player, mine.playerNumber);
                    }

                    break;
                }
            }

        }
    }

}

function fire(data) {
    var player = games[data.gameId].players[data.playerNumber];

    var sx = player.position.x; // start position x
    var sy = player.position.y; // start position y

    var projectileNum = parseInt(Date.now() / 1000) + "" + parseInt(Math.random() * 1000);

    switch (player.currentWeapon) {
        case Enum.weapons.cannon :
        case Enum.weapons.rocketLauncher :
            createBullet(player, sx, sy, data, projectileNum, player.currentWeapon);
            break;
        case Enum.weapons.mine:
            createMine(player, sx, sy, data, projectileNum);
            break;
    }

    player.inventory[player.currentWeapon]--;

    return {
        projectileNum: projectileNum,
        sx: sx,
        sy: sy
    };
}

function createMine(player, sx, sy, data, projectileNum) {
    games[data.gameId].mines[projectileNum] = {position: {x: sx, y: sy}, activated: false, playerNumber: player.playerNumber};
    setTimeout(function () {
        activateMine(data.gameId, projectileNum);
    }, 500);
}

function activateMine(gameId, mineId) {
    if (games[gameId] !== undefined && games[gameId].mines[mineId] !== undefined) {
        games[gameId].mines[mineId].activated = true;
    }
}

function createBullet(player, sx, sy, data, projectileNum, bulletType) {
    var bullet = new Bullet({
        x: sx,
        y: sy
    }, data.direction, Enum.bulletSpeed, data.playerNumber, bulletType);

    bullet.start();

    games[data.gameId].bullets[projectileNum] = bullet;

    player.canFire = false;
    setTimeout(function () {
        player.canFire = true;
    }, player.fireInterval);
}

function redefineHost(gameId) {
    var player;
    if (games[gameId] != undefined) {
        for (var key in games[gameId].players) {
            player = games[gameId].players[key];
            player.host = true;
            io.sockets.in(gameId).emit("redefine_host", {
                playerNumber: player.playerNumber
            });
            break;
        }
    }
}

function checkPlayersConnections() {
    var now = parseInt(Date.now() / 1000),
        player, wasHost;
    for (var key in games) {
        for (var k in games[key].players) {
            player = games[key].players[k];
            if (now - player.lastUpdate > 3 && player.lastUpdate != 0) {
                logEvent(player.playerName + " disconnected; avgping: " + player.getAvgPing());
                wasHost = games[key].players[k].host;
                delete games[key].players[k];
                if (wasHost) redefineHost(key);
                actualizeGames();
            }
        }
    }
}

function checkBulletsExistanse() {
    var gameId, bullet;
    for (var key in io.sockets.manager.rooms) {
        gameId = key.replace(/\//, "");
        if (gameId != "" && games[gameId] != undefined) {
            calculateBulletCollision(gameId);
            if (countObjElements(games[gameId].bullets) > 0) {
                for (var key in games[gameId].bullets) {
                    bullet = games[gameId].bullets[key];
                    if (bullet.alive === false) {
                        delete games[gameId].bullets[key];
                    }
                }
            }
        }
    }

}

function handleBonuses() {
    var gameId, bonus;
    for (var key in io.sockets.manager.rooms) {
        gameId = key.replace(/\//, "");
        if (gameId != "") {
            bonus = createBonus(gameId);
            if (bonus !== undefined) {
                io.sockets.in(gameId).emit("bonus_appeared", bonus);
            }
            if (games[gameId] !== undefined) {
                for (var key in games[gameId].bonuses) {
                    if (games[gameId].bonuses.hasOwnProperty(key)) {
                        bonus = games[gameId].bonuses[key];
                        if (Date.now() - bonus.createdTime >= 30000) {
                            io.sockets.in(gameId).emit("bonus_deleted", {position: bonus.position, bonusName: key});
                            delete games[gameId].bonuses[key];
                        }
                    }
                }
            }
        }
    }
}

function playerConnection(data) {
    if (games[data.gameId] != undefined) {

        var mayConnect = false,
            clientPosition = calculateStartPosition(data.gameId),
            playerNumber = getPlayerNumber(data.gameId),
            host = countObjElements(games[data.gameId].players) == 1 ? true : false;

        logEvent("player_" + playerNumber + " connected");

        if (playerNumber != 0) {
            mayConnect = true;
            games[data.gameId].players[playerNumber].hashCode = data.clientHash;
            games[data.gameId].players[playerNumber].position.x = clientPosition.x;
            games[data.gameId].players[playerNumber].position.y = clientPosition.y;
            games[data.gameId].players[playerNumber].lastUpdate = parseInt(Date.now() / 1000);
            games[data.gameId].players[playerNumber].playerName = "Player " + playerNumber;
            games[data.gameId].players[playerNumber].host = host;
        }

        return {
            mayConnect: mayConnect,
            playerNumber: playerNumber,
            clientPosition: clientPosition
        };
    }

    return {
        mayConnect: false,
        playerNumber: 0,
        clientPosition: {}
    };
}

function resumePlayer(playerNumber, gameId) {
    var position = calculateStartPosition(gameId),
        player = games[gameId].players[playerNumber];
    if (player != undefined) {
        player.reload(position);
    }
    sendBattlefieldInfo(gameId);
}

function sendBattlefieldInfo(gameId) {
    var playersTemp = [],
        player;
    if (games[gameId] != undefined) {
        for (var key in games[gameId].players) {
            player = games[gameId].players[key];
            playersTemp.push([
                [player.position.x, player.position.y],
                [player.prevPosition.x, player.prevPosition.y],
                player.direction,
                player.prevDirection,
                player.score,
                key,
                player.alive,
                player.visible,
                player.invincible
            ]);
        }
        try {
            io.sockets.in(gameId).emit("battlefieldInfo", playersTemp);
        } catch (e) {
            logEvent(e.stack);
        }
    }
}

function zip(s) {
    var dict = {};
    var data = (s + "").split("");
    var out = [];
    var currChar;
    var phrase = data[0];
    var code = 256;
    for (var i = 1; i < data.length; i++) {
        currChar = data[i];
        if (dict[phrase + currChar] != null) {
            phrase += currChar;
        } else {
            out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
            dict[phrase + currChar] = code;
            code++;
            phrase = currChar;
        }
    }
    out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
    for (var i = 0; i < out.length; i++) {
        out[i] = String.fromCharCode(out[i]);
    }
    return out.join("");
}

function actualizeGames() {
    for (var game in games) {
        if (countObjElements(games[game].players) == 0) {
            delete games[game];
            logEvent("game " + game + " ended")
        }
    }
}

function logEvent(message) {
    message = message == undefined ? "" : message;
    var time = new Date(),
        lz = function (v) {
            if ((v + "").length == 1) {
                return "0" + v;
            }
            return v;
        };
    console.log(lz(time.getHours()) + ":" + lz(time.getMinutes()) + ":" + lz(time.getSeconds()) + " " + lz(time.getDate()) + "." + lz(time.getMonth() + 1) + "." + (time.getYear() + 1900) + " : " + message);
}