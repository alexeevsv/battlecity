function showDrawLevelWindow() {


    var currentMaterial = "wall";

    $("#mapCreateWrapper").remove();

    var div = document.createElement("div");
    div.id = "mapCreateWrapper";

    var el = document.createElement("canvas");
    var canvas = el.getContext("2d");

    el.width = engine.field.width;
    el.height = engine.field.height;
    el.id = "paint";
    div.appendChild(el);

    var body = document.getElementsByTagName("body")[0];
    document.getElementById("playgroundContainer").appendChild(div);

    $("<div/>").attr({
        id: "editMapBtnsWrapper"
    }).appendTo("#mapCreateWrapper");

    $("<button/>", {
        text: "wall",
        class: "metal linear"
    }).click(function () {
            changeMaterial($(this).html())
        }).appendTo("#editMapBtnsWrapper");

    $("<button/>", {
        text: "water",
        class: "metal linear"
    }).click(function () {
            changeMaterial($(this).html())
        }).appendTo("#editMapBtnsWrapper");

    $("<button/>", {
        text: "woods",
        class: "metal linear"
    }).click(function () {
            changeMaterial($(this).html())
        }).appendTo("#editMapBtnsWrapper");

    $("<br/>").appendTo("#editMapBtnsWrapper");
    $("<br/>").appendTo("#editMapBtnsWrapper");

    $("<button/>").attr({
        id: "saveMapBtn",
        class: "metal linear"
    }).html("save").click(function () {
            socket.emit("save_map", {
                map: createdMap,
                gameId: currentGameId
            });
        }).appendTo("#editMapBtnsWrapper");

    $("<button/>").attr({
        id: "clearMapEditBtn",
        class: "metal linear"
    }).html("clear").click(function () {
            canvas.clearRect(0, 0, 512, 512);
            createdMap = {};
        }).appendTo("#editMapBtnsWrapper");

    $("<button/>").attr({
        id: "closeMapEditBtn",
        class: "metal linear"
    }).html("close").click(function () {
            $("#mapCreateWrapper").remove()
        }).appendTo("#editMapBtnsWrapper");

    var changeMaterial = function (val) {
        currentMaterial = val;
    }

    var block, color;
    createdMap = {};
    for (var key in map) {
        block = map[key];
        if (block.m == "water") {
            color = "blue";
        } else if (block.m == "woods") {
            color = "green";
        } else {
            color = "black";
        }
        canvas.fillStyle = color;
        canvas.fillRect(block.x, block.y, 32, 32);
        createdMap[block.x + "" + block.y] = {
            x: block.x,
            y: block.y,
            m: block.m,
            l: block.l
        };
    }

    var clearBlock = function (e) {
        var x = parseInt(e.offsetX / 32) * 32;
        var y = parseInt(e.offsetY / 32) * 32;
        canvas.clearRect(x, y, 32, 32);
        delete createdMap[x + "" + y];
    }


    var drawBlock = function (e) {
        var color;
        switch (currentMaterial) {
            case "wall":
                color = "black";
                break;
            case "water":
                color = "blue";
                break;
            case "woods":
                color = "green";
                break;
        }
        canvas.fillStyle = color;

        var x = parseInt(e.offsetX / 32) * 32;
        var y = parseInt(e.offsetY / 32) * 32;
        canvas.fillRect(x, y, 32, 32);
        createdMap[x + "" + y] = {
            x: x,
            y: y,
            m: currentMaterial,
            l: 40
        };
    }

    $("#paint").bind("contextmenu", function (e) {
        return false;
    });

    $("#paint").mousedown(function (e) {
        if (e.button == 0) {
            drawBlock(e);
            $("#paint").mousemove(function (e) {
                drawBlock(e);
            });
        } else if (e.button == 2) {
            clearBlock(e);
            $("#paint").mousemove(function (e) {
                clearBlock(e);
            });
        }
    });

    $("#paint").mouseup(function (e) {
        $("#paint").unbind("mousemove");
    })

}

function authorizePlayer(data) {
    //data[0] - may connect or not
    //data[1] - playerNumber
    //data[2] - position
    //data[3] - bonuses
    //data[4] - players
    //data[5] - mines
    if (data[0] === true) {
        currentPlayer = new Player(data[2].x, data[2].y, data[1]);

        setTimeout(function () {
            var bonus;
            for (var bonusName in data[3]) {
                bonus = data[3][bonusName];
                effectsCanvas.drawImage(engine.image, imagePosition[bonusName].x, imagePosition[bonusName].y, 32, 32, bonus.x, bonus.y, 32, 32);
            }
            var mine;
            for (var key in data[5]) {
                if (data[5].hasOwnProperty(key)) {
                    mine = data[5][key];
                    bottomCanvas.drawImage(engine.image, imagePosition.mine.x, imagePosition.mine.y, 32, 32, mine.position.x, mine.position.y, 32, 32);
                }
            }
            weaponsCanvas.drawImage(engine.image, imagePosition.cannon.x, imagePosition.cannon.y, 32, 32, 0, 0, 64, 64);
            socket.emit("get_current_weapon", {gameId: currentGameId, playerNumber: currentPlayer.playerNumber});
        }, 1000);

        document.addEventListener("keydown", addListener);

        document.addEventListener("keyup", function (event) {
            var keyCode = event.keyCode;
            if (keysPressed[keyCode] != undefined) {
                keysPressed[keyCode] = false;
            }
        });

        var player;
        for (var key in data[4]) {
            player = data[4][key];
            $("#p" + player.playerNumber).html(player.playerName);
            if (player.host === true) {
                $("#p" + player.playerNumber).parent().css({
                    border: "2px solid blue"
                });
            }
            if (player.playerNumber == currentPlayer.playerNumber && player.host === false) {
                $("#reloadMapBtn, #drawLevel").remove();
            }
            if (player.host === true && player.playerNumber == currentPlayer.playerNumber) {
//                $("#someMessage").html("You are the host");
            }
        }

        $("#ammoAmount").html("0");

        setInterval(checkPlayer, 200);
        setInterval(checkPing, 1000);
        checkConnectionInterval = setInterval(checkConnection, 5000);
    }
}

function _alert(title, message) {
    $("<div/>")
        .attr({class: "alertDialog"})
        .html(message)
        .dialog({
            modal: true,
            resizable: false,
            width: 300,
            height: 200,
            draggable: false,
            title: title,
            open: function () {
                $("#.ui-button").remove();
                $('.ui-widget-overlay').css({opacity: ".7"}).hide().fadeIn();

            },
            buttons: [
                {
                    text: "No",
                    click: function () {
                        $(this).dialog("close");
                    }
                },
                {
                    text: "Reload now",
                    click: function () {
                        window.location.reload();
                    }
                }
            ]
        })
}

function _prompt(title, message) {

    var setPlayerName = function(){
        $("#playerName").html($("#_playerNameInput").val().slice(0, 7));

        socket.emit("change_player_name", {
            gameId: currentGameId,
            playerName: $("#_playerNameInput").val(),
            playerNumber: currentPlayer.playerNumber
        });

        renderInterval = setInterval(render, 10);
    }

    $("<div/>")
        .attr({class: "alertDialog"})
        .html(message + "<br />")
        .append($("<input/>").attr({id: "_playerNameInput"}).keydown(function(e){
            if(e.keyCode == 13){
                setPlayerName();
                $(".ui-widget-overlay.ui-front, .ui-dialog").remove();
            }
        }))
        .dialog({
            modal: true,
            resizable: false,
            width: 300,
            height: 200,
            draggable: false,
            title: title,
            open: function () {
                $("#.ui-button").remove();
                $('.ui-widget-overlay').css({opacity: ".7"}).hide().fadeIn();
            },
            buttons: [
                {
                    text: "Ok",
                    click: function () {
                        setPlayerName();
                        $(this).dialog("close");
                    }
                }
            ]
        })
}

function checkConnection() {
    if (lastConnectionCheck != 0 && Date.now() - lastConnectionCheck > 7000) {
        lastConnectionCheck = 0;
        _alert("Lost connection", "Please reload page");
        clearInterval(checkConnectionInterval);
    }
}

function addListener(event) {
    var direction;
    var keyCode = event.keyCode;
    if (keyCodes[keyCode] != undefined) {

        if (keysPressed[keyCode] != undefined)
            keysPressed[keyCode] = true;

        if (keyCode != prevKeyCode && prevKeyCode != 0 && keyCode != 90 && keyCode != 88) {
            justStartedMoving = true;
            clearInterval(prevMoveInterval);
        }
        prevKeyCode = keyCode;

        switch (keyCode) {
            case 38:
                direction = directions.up;
                break;
            case 40:
                direction = directions.down;
                break;
            case 37:
                direction = directions.left;
                break;
            case 39:
                direction = directions.right;
                break;
            case 88:
                socket.emit("change_weapon", {gameId: currentGameId, playerNumber: currentPlayer.playerNumber});
                break;
        }

        if (keyCode != 90) {
            if (justStartedMoving === true && keysPressed[keyCode] === true) {
                moveInterval = setInterval(function () {
                    if (keysPressed[keyCode] == true) {
                        move(direction);
                    } else {
                        justStartedMoving = true;
                        clearInterval(prevMoveInterval);
                    }
                }, 70);
                prevMoveInterval = moveInterval;
                justStartedMoving = false;
            }
        }

        // firing
        if (keysPressed[90] === true) {
            if (fireInterval == undefined) {
                socket.emit("fire", {
                    playerNumber: currentPlayer.playerNumber,
                    direction: currentPlayer.direction,
                    gameId: currentGameId
                });
                fireInterval = setInterval(function () {
                    if (keysPressed[90] === true) {
                        socket.emit("fire", {
                            playerNumber: currentPlayer.playerNumber,
                            direction: currentPlayer.direction,
                            gameId: currentGameId
                        });
                    } else {
                        clearInterval(fireInterval);
                        fireInterval = undefined;
                    }
                }, 450)
            }
        }
    }
}

function playSound(type) {
    createjs.Sound.play(type, createjs.Sound.INTERUPT_LATE);
}

function move(direction) {
    currentPlayer.direction = direction;
    socket.emit("move", [direction, currentPlayer.playerNumber, currentGameId]);
}

/* render scene (tanks and bullets) */

function render() {
    engine.clearScene();

    var player, bulletSize;
    for (var key in players) {
        player = players[key];
        if (player.alive === true && (player.playerNumber == currentPlayer.playerNumber || player.visible == true)) {
            player.render();
        }
    }

    var bullet;
    for (var key in bullets) {
        bullet = bullets[key];
        if (bullet.alive === true) {
            bulletSize = bullet.getBulletSize();
            engine.drawImg(
                engine.image,
                imagePosition[bullet.bulletType].x,
                imagePosition[bullet.bulletType].y,
                bulletSize.width,
                bulletSize.height,
                bullet.position.x,
                bullet.position.y,
                bulletSize.width,
                bulletSize.height,
                true,
                bullet.angle
            );
        } else {
            delete bullets[key];
        }
    }

}

function murderPlayer(data) {
    //data[0] - dead player number
    //data[1] - dead player position
    //data[2] - assassin player number
    //data[3] - assassin player score

    if (players[data[0]] != undefined) {
        players[data[0]].alive = false;
        $("#p" + data[2] + "Score").html(data[3]);
    }

    playSound("death");

    eventsCanvas.clearRect(0, 0, 64, 64);
    $("#eventTitle").html("Events:");
    $("#eventMessage").html("");
    $("#timers").html("");

    var reloadBarInterval = setInterval(function () {
        if (players[data[0]].alive === true && currentPlayer.playerNumber == data[0]) {
            $("#hitPoints").css({width: "100%"});
            $("#hpAmount").html(100);
            $("#armor").css({width: "0%"});
            $("#armorAmount").html(0);
            clearInterval(reloadBarInterval);
        }
    }, 400);
}

function applyBonus(data) {
    //data[0] - bonusName
    //data[1] - playerNumber
    //data[2] - bonusData
    //data[3] - hitPoints
    //data[4] - armor
    //data[5] - player inventory
    //data[6] - crate bonus (if crate picked up)

    var bonusTitle = (data[6] !== null ? data[6] : data[0] );

    effectsCanvas.clearRect(data[2].position.x, data[2].position.y, 32, 32);
    delete bonuses[data[0]];

    if (currentPlayer.playerNumber == data[1]) {

        $("#hitPoints").css({width: data[3] + "%"});
        $("#hpAmount").html(data[3]);
        $("#armor").css({width: data[4] + "%"});
        $("#armorAmount").html(data[4]);

        for (var key in data[5]) {
            if (data[5].hasOwnProperty(key) && key === currentPlayer.currentWeapon) {
                $("#ammoAmount").html(data[5][key]);
            }
        }

        showEvent(bonusTitle);

    }


}

function showEvent(title) {

    $("#eventTitle").html("You picked up")
    $("#eventMessage").html(title);
    eventsCanvas.clearRect(0, 0, 64, 64);

    if (imagePosition[title] !== undefined) {
        eventsCanvas.drawImage(engine.image, imagePosition[title].x, imagePosition[title].y, 32, 32, 0, 0, 64, 64);
        if (title == "invincibility" || title == "invisibility") {
            var startWidth, width;
            $("#" + title).remove();
            $("<div/>")
                .attr({class: "timer", id: title})
                .append(
                    $("<div/>").attr({class: "timerLine", id: title + "TimeLine"})
                        .append($("<div/>").attr({class: "timerTitle"}).html(title)))
                .prependTo("#timers");
            if (timers[title] !== undefined) {
                clearInterval(timers[title]);
            }
            startWidth = width = parseInt($("#" + title + "TimeLine").css("width"));
            timers[title] = setInterval(function () {
                width = width - (startWidth * 0.05);
                if (width <= 0) {
                    clearInterval(timers[title]);
                    $("#" + title).hide();
                }
                $("#" + title + "TimeLine").css({width: width});
            }, 1000);
        }
    }
}

function createBonus(data) {
    // data[0] - bonus name
    // data[1] - bonus data {}

    bonuses[data[0]] = data[1];
    effectsCanvas.drawImage(engine.image, imagePosition[data[0]].x, imagePosition[data[0]].y, 32, 32, data[1].x, data[1].y, 32, 32);
}

function startProjectile(data) {
    //data[0] - projectileNum
    //data[1] - xPos
    //data[2] - yPos
    //data[3] - direction
    //data[4] - playerNumber
    //data[5] - weaponType
    //data[6] - ammo

    switch (data[5]) {
        case "cannon":
        case "rocketLauncher":
            createBullet(data, data[5] + "Projectile");
            break;
        case "mine":
            createMine(data);
            break;
    }

    if (data[4] == currentPlayer.playerNumber)
        $("#ammoAmount").html(data[6]);

    if (data[6] == 0) {
        socket.emit("get_current_weapon", {gameId: currentGameId, playerNumber: currentPlayer.playerNumber});
    }


}

function createBullet(data, bulletType) {
    var bullet = new Bullet({
        x: data[1],
        y: data[2]
    }, data[3], 13, data[4], bulletType);
    bullet.start();
    bullets[data[0]] = bullet;
    playSound("tank_shot");
}

function createMine(data) {
    var x = data[1];
    var y = data[2];

    mines[data[0]] = {x: data[1], y: data[2]};
    bottomCanvas.drawImage(engine.image, imagePosition.mine.x, imagePosition.mine.y, 32, 32, x, y, 32, 32);
}

function handleExplosion(data) {
    //data[0] - bullet id
    //data[1] - explosion position
    //data[2] - block hp
    //data[3] - victim player number
    //data[4] - victim player hp
    //data[5] - victim player armor

    var hp = data[2];

    if (bullets[data[0]] != undefined) {
        bullets[data[0]].alive = false;
    }
    explode(data[1].x, data[1].y);

    playSound("explosion");

    if (hp !== undefined && hp !== null) {
        if (hp <= 0) {
            delete map[data[1].x + "" + data[1].y];
            mapCanvas.clearRect(data[1].x, data[1].y, 32, 32);
        } else {
            if (hp >= 30) {
                hp = 3;
            } else if (hp >= 20 && hp < 30) {
                hp = 2;
            } else {
                hp = 1;
            }
            mapCanvas.drawImage(engine.image, imagePosition.crack[hp].x, imagePosition.crack[hp].y, 32, 32, data[1].x, data[1].y, 32, 32);
        }
    }
    if (currentPlayer.playerNumber == data[3]) {
        $("#hitPoints").css({width: data[4] + "%"});
        $("#hpAmount").html(data[4]);
        $("#armor").css({width: data[5] + "%"});
        $("#armorAmount").html(data[5]);
    }
}

function explode(x, y) {

    var k = 0;
    var interval = setInterval(function () {
        effectsCanvas.clearRect(x, y, 32, 32);
        if (k < explosion.length) {
            effectsCanvas.drawImage(engine.image, explosion[k].x, explosion[k].y, 32, 32, x, y, 32, 32);
        } else {
            var bonus;
            for (var bonusName in bonuses) {
                if (bonuses.hasOwnProperty(bonusName)) {
                    bonus = bonuses[bonusName];
                    effectsCanvas.clearRect(bonus.x, bonus.y, 32, 32);
                    effectsCanvas.drawImage(engine.image, imagePosition[bonusName].x, imagePosition[bonusName].y, 32, 32, bonus.x, bonus.y, 32, 32);
                }
            }
            clearInterval(interval);
        }
        k++;
    }, 35)
}

function drawMap(data) {
    map = data;
    /* battlefield background color */
    // bottomCanvas.fillStyle = "#079E40";
    // bottomCanvas.fillRect(0, 0, bottomField.width, bottomField.height);
    mapCanvas.clearRect(0, 0, bottomField.width, bottomField.height);
    bottomCanvas.clearRect(0, 0, bottomField.width, bottomField.height);

    var block;
    for (var key in map) {
        block = map[key];
        if (block.m == "wall") {
            mapCanvas.drawImage(engine.image, imagePosition.wall.x, imagePosition.wall.y, 32, 32, block.x, block.y, 32, 32);
        } else if (block.m == "woods") {
            mapCanvas.drawImage(engine.image, imagePosition.woods.x, imagePosition.woods.y, 32, 32, block.x, block.y, 32, 32);
        } else if (block.m == "water") {
            bottomCanvas.drawImage(engine.image, imagePosition.water.x, imagePosition.water.y, 32, 32, block.x, block.y, 32, 32);
        }
    }
}

/* updates ping values in player's GUI */

function handlePing(time) {
    if (time == lastPingCheckStamp) {
        currentPing = ping = Date.now() - lastPingCheckStamp;
        $("#ping").html(currentPing);
    }
}

function checkPing() {
    lastPingCheckStamp = Date.now();
    socket.emit("check_ping", lastPingCheckStamp);
}

/* receives players collection from server, manages client players collection, if player does not exist it will create it */

function handlePlayer(data) {

    var t1 = [], t2 = [], iAmOnline = false;
    t1 = t1.fill(1, maxPlayersAmount);
    for (var key in data) {
        t2.push(parseInt(key));
        if (players[key] == undefined) {
            players[key] = new Player(data[key].position.x, data[key].position.y, key);
            $("#hitPoints").css({width: data[key].hitPoints + "%"});
            $("#hpAmount").html(data[key].hitPoints);
            $("#armor").css({width: data[key].armor + "%"});
            $("#armorAmount").html(data[key].armor);
        }
        if (data[key].hashCode == clientHash && data[key].playerNumber == currentPlayer.playerNumber) {
            iAmOnline = true;
        }
    }
    if (t2.length > 0) {
        for (var i = 0; i < t1.length; i++) {
            if (t2.indexOf(t1[i]) == -1) {
                delete players[t1[i]];
            }
        }
    }
    if (t2.length == 0 || iAmOnline == false) {
        _alert("Lost connection", "Please reload page");
        clearInterval(checkConnectionInterval);
    }

    $("#p1Wrapper, #p2Wrapper, #p3Wrapper").hide();
    for (var key in data) {
        if (data.hasOwnProperty(key)) {
            $("#p" + data[key].playerNumber + "Wrapper").show();
            $("#p" + data[key].playerNumber).html(data[key].playerName);
            $("#p" + data[key].playerNumber + "Score").html(data[key].score);
        }
    }
    lastConnectionCheck = Date.now();
}

function checkPlayer() {
    socket.emit("check_player", {
        gameId: currentGameId,
        playerNumber: currentPlayer.playerNumber,
        clientHash: clientHash,
        ping: currentPing
    });
}

function countDataReciveSpeed(data) {
    var bytes = encodeURIComponent(data).replace(/%[A-F\d]{2}/g, 'U').length,
        now;
    dataReceived += bytes;
    now = Date.now();
    if (now - lastDataSpeedUpdate >= 1000) {
        $("#drs").html(dataReceived);
        dataReceived = 0;
        lastDataSpeedUpdate = now;
    }
}

function applyBattlefieldInfo(data) {
    // data - players
    //data[n][0] - position
    //data[n][1] - prevPosition
    //data[n][2] - direction
    //data[n][3] - prevDirection
    //data[n][4] - score
    //data[n][5] - playerNumber
    //data[n][6] - player alive
    //data[n][7] - player visible
    //data[n][8] - player invincible

    for (var i = 0; i < data.length; i++) {
        if (players[data[i][5]] != undefined) {
            players[data[i][5]].position.x = data[i][0][0];
            players[data[i][5]].position.y = data[i][0][1];
            players[data[i][5]].prevPosition.x = data[i][1][0];
            players[data[i][5]].prevPosition.y = data[i][1][1];
            players[data[i][5]].direction = data[i][2];
            players[data[i][5]].prevDirection = data[i][3];
            players[data[i][5]].alive = data[i][6];
            players[data[i][5]].visible = data[i][7];
            players[data[i][5]].invincible = data[i][8];
        }
    }
}

function unzip(s) {
    var dict = {};
    var data = (s + "").split("");
    var currChar = data[0];
    var oldPhrase = currChar;
    var out = [currChar];
    var code = 256;
    var phrase;
    for (var i = 1; i < data.length; i++) {
        var currCode = data[i].charCodeAt(0);
        if (currCode < 256) {
            phrase = data[i];
        } else {
            phrase = dict[currCode] ? dict[currCode] : (oldPhrase + currChar);
        }
        out.push(phrase);
        currChar = phrase.charAt(0);
        dict[code] = oldPhrase + currChar;
        code++;
        oldPhrase = phrase;
    }
    return out.join("");
}

function showChooseGameDialog() {
    $("<div/>").load("chunks/choose_game_dialog.html",function () {
        $(this).dialog({
            modal: false,
            draggable: false,
            closeOnEscape: false,
            resizable: false,
            width: 500,
            open: function () {
                $(".ui-dialog-titlebar-close").remove();
            }
        });
        $("#refreshGameList").click(function () {
            socket.emit("get_current_games", "");
        });
        $("#showCreateGameDialogBtn").click(showCreateGameDialog);
    }).attr({
            title: "Choose or create your game"
        })
    socket.emit("get_current_games", "");
    refreshGamesInterval = setInterval(function () {
        socket.emit("get_current_games", "");
    }, 2000);
}

function showCreateGameDialog() {
    $("<div/>").load("chunks/create_game_dialog.html",function () {
        $(this).dialog({
            modal: true,
            draggable: false
        });
        $("#createGameBtn").click(function () {
            if (createGameValidation() === true) {
                var data = [$("#gameName").val().trim(), $("#gamePassword").val().trim()];
                socket.emit("create_new_game", data);
            } else {
                alert("please type the game name");
            }
        });
        $("#gameName, #gamePassword").keydown(function (e) {
            if (e.keyCode == 13) {
                if (createGameValidation() === true) {
                    var data = [$("#gameName").val().trim(), $("#gamePassword").val().trim()];
                    socket.emit("create_new_game", data);
                } else {
                    alert("please type the game name");
                }
            }
        })
    }).attr({
            title: "Create your game"
        })
}

function createGameValidation() {
    if ($("#gameName").val().trim() == "") {
        return false;
    }
    return true;
}

function drawGames(data) {
    $("#gamesList").html("");
    for (var key in data) {
        $("<p/>").attr({
            class: "game",
            id: key
        }).html("name: " + data[key].gameName + "; players: " + countObjElements(data[key].players)).click(function () {
                joinGame($(this))
            }).appendTo("#gamesList");
    }
}

function joinGame(obj) {
    var gameId = obj.attr("id");
    socket.emit("check_if_locked", gameId);
}

function establishConnect(gameId) {
    players = {};
    currentGameId = gameId;
    clientHash = parseInt(Math.random() * 100000) + "" + Date.now();
    clearInterval(refreshGamesInterval);
    $("#choose_game_dialog").remove();
    $(".ui-dialog").remove();
    $("<div/>").attr({
        id: "playgroundContainer"
    }).load("chunks/playground_wrapper.html",function () {
            engine.defineCanvas("playGround");
            mapField = document.getElementById("map");
            mapCanvas = mapField.getContext("2d");
            bottomField = document.getElementById("bottom");
            bottomCanvas = bottomField.getContext("2d");
            effectsCanvas = document.getElementById("effects").getContext("2d");
            weaponsCanvas = document.getElementById("weaponImage").getContext("2d");
            eventsCanvas = document.getElementById("eventImage").getContext("2d");

            var assetsPath = "resources/sounds/";
            var manifest = [
                {id: "tank_shot", src: "Game-Shot.ogg", data: 6},
                {id: "explosion", src: "Game-Break.ogg", data: 6},
                {id: "death", src: "Game-Death.ogg"}
            ];

            createjs.Sound.alternateExtensions = ["mp3"];
            var preload = new createjs.LoadQueue(true, assetsPath);
            preload.installPlugin(createjs.Sound);
            preload.loadManifest(manifest);

            preload.addEventListener("complete", function () {
//                createjs.Sound.play("music", {interrupt: createjs.Sound.INTERRUPT_NONE, loop: -1, volume: 0.4})
            });


            socket.emit("player_connected", {
                clientHash: clientHash,
                gameId: currentGameId
            });

            //TODO : check why map do not loading at this moment
            setTimeout(function () {
                socket.emit("load_map", currentGameId);
            }, 200);

            $("#drawLevel").click(function () {
                showDrawLevelWindow();
            });

            $("#reloadMapBtn").click(function () {
                socket.emit("reload_map", currentGameId);
            });

            $("#disconnectBtn").click(function () {
                socket.emit("player_leaved", {
                    gameId: currentGameId,
                    playerNumber: currentPlayer.playerNumber
                });
                $("#playgroundContainer").remove();
                showChooseGameDialog();
                clearInterval(checkConnectionInterval);
            });

            $("#moveUpBtn, #moveDownBtn, #moveLeftBtn, #moveRightBtn").mousedown(function (e) {
                var direction = $(this).attr("direction");
                isMoving = true;
                _moveInterval = setInterval(function () {
                    if (isMoving) {
                        move(direction);
                    } else {
                        clearInterval(_moveInterval);
                    }
                }, 100);
            })

            $("#moveUpBtn, #moveDownBtn, #moveLeftBtn, #moveRightBtn").mouseup(function (e) {
                isMoving = false;
            });

            $("#fireBtn").click(function () {
                socket.emit("fire", {
                    playerNumber: currentPlayer.playerNumber,
                    direction: currentPlayer.direction,
                    gameId: currentGameId
                })
            });

            $("#changeNameBtn").click(handleChangeName);

            _prompt("Enter your nickname", "Type your nickname here!");


        }).appendTo("body");
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

function handleChangeName() {
    if ($("#changeNameBtn").html() == "change nick") {
        $("#playerName").hide();
        $("<input/>").attr({
            type: "text",
            id: "playerNameInput",
            size: 10
        })
            .val($("#playerName").html())
            .keydown(changePlayerName)
            .insertAfter("#playerName");
        $("#playerNameInput").select();
        $("#changeNameBtn").html("apply");
    } else if ($("#changeNameBtn").html() == "apply") {
        changePlayerName();
    }
}

function changePlayerName(e) {
    if (e == undefined || (e != undefined && e.keyCode == 13)) {
        $("#playerName").show().html($("#playerNameInput").val().slice(0, 7));
        $("#changeNameBtn").html("change nick");

        socket.emit("change_player_name", {
            gameId: currentGameId,
            playerName: $("#playerNameInput").val(),
            playerNumber: currentPlayer.playerNumber
        })
        $("#playerNameInput").remove();
    }
}

function showHostBtns() {
    $("<button/>").attr({
        id: "drawLevel",
        class: "metal linear"
    }).html("draw level").click(showDrawLevelWindow).insertBefore("#disconnectBtn");

    $("<button/>").attr({
        id: "reloadMapBtn",
        class: "metal linear"
    }).html("reload map").click(function () {
            socket.emit("reload_map", currentGameId);
        }).insertBefore("#disconnectBtn");
}

function redefineHost(data) {
    $("#p1, #p2, #p3").parent().css({
        border: "none"
    });
    $("#p" + data.playerNumber).parent().css({
        border: "2px solid blue"
    });
    if (data.playerNumber == currentPlayer.playerNumber) {
        showHostBtns();
//        $("#someMessage").html("You are the host");
    }
}

function changeWeapon(data) {
    weaponsCanvas.clearRect(0, 0, 64, 64);
    if (imagePosition[data.currentWeapon] !== undefined) {
        currentPlayer.currentWeapon = data.currentWeapon;
        weaponsCanvas.drawImage(engine.image, imagePosition[data.currentWeapon].x, imagePosition[data.currentWeapon].y, 32, 32, 0, 0, 64, 64);
        $("#ammoAmount").html(data.ammo);
    }
}

function explodeMine(data) {
    //data[0] - playerNumber
    //data[1] - mine position {x : 0, y : 0}
    //data[2] - player hit points
    //data[3] - player armor
    //data[4] - mine id

    explode(data[1].x, data[1].y);
    playSound("explosion");
    bottomCanvas.clearRect(data[1].x, data[1].y, 32, 32);

    if (currentPlayer.playerNumber == data[0]) {

        $("#hitPoints").css({width: data[2] + "%"});
        $("#hpAmount").html(data[2]);

        $("#armor").css({width: data[3] + "%"});
        $("#armorAmount").html(data[3]);

        socket.emit("get_current_weapon", {gameId: currentGameId, playerNumber: currentPlayer.playerNumber});
    }

    var mine;

    delete mines[data[4]];
    for (var key in mines) {
        if (mines.hasOwnProperty(key)) {
            mine = mines[key];
            bottomCanvas.drawImage(engine.image, imagePosition.mine.x, imagePosition.mine.y, 32, 32, mine.x, mine.y, 32, 32);
        }
    }

}

function deleteBonus(data) {
    delete bonuses[data.bonusName];
    effectsCanvas.clearRect(data.position.x, data.position.y, 32, 32);
}