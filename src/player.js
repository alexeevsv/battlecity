function Player(x, y, playerNumber) {
    this.position = {x: x, y: y};
    this.prevPosition = {x: x, y: y};
    this.playerNumber = playerNumber;
    this.direction = this.prevDirection = directions.up;
    this.alive = true;
    this.playerName = "Player " + playerNumber;
    this.currentWeapon = "cannon";
    this.visible = true;
    this.invincible = false;
}

Player.prototype.render = function () {
    var angle = this.figureAngle(this.direction);

    if (this.invincible) {
        engine.canvas.fillStyle = "rgba(200, 0, 0, 0.5)";
        engine.canvas.fillRect(this.position.x - 2, this.position.y - 2, 36, 36);
        engine.canvas.clearRect(this.position.x, this.position.y, 32, 32);
    }

    engine.drawImg(
        engine.image,
        imagePosition.players[this.playerNumber].x, imagePosition.players[this.playerNumber].y,
        32, 32, this.position.x, this.position.y, 32, 32, true, angle);

}

Player.prototype.figureAngle = function (direction) {
    var angle = 0;
    switch (direction) {
        case directions.right:
            angle = 90;
            break;
        case directions.down:
            angle = 180;
            break;
        case directions.left:
            angle = 270;
            break;
    }
    return angle;
}


function Bullet(playerPosition, direction, speed, playerNumber, bulletType) {

    this.position = {};
    this.direction = direction;
    this.speed = speed;
    this.interval;
    this.alive = false;
    this.playerNumber = playerNumber;
    this.bulletType = bulletType;
    this.angle = 0;


    this.setStartPosition(playerPosition, direction);
    this.figureAngle(direction);

}

Bullet.prototype.getBulletSize = function () {
    switch (this.bulletType) {
        case "cannonProjectile":
            return {height: 4, width: 4};
            break;
        case "rocketLauncherProjectile" :
            return {height: 13, width: 6};
            break;
    }
}

Bullet.prototype.figureAngle = function (direction) {
    switch (direction) {
        case directions.right:
            this.angle = 90;
            break;
        case directions.down:
            this.angle = 180;
            break;
        case directions.left:
            this.angle = 270;
            break;
    }
}

Bullet.prototype.start = function () {
    var self = this;

    self.alive = true;
    switch (self.direction) {
        case directions.up:
            self.interval = setInterval(function () {
                if (self.position.y >= 0) {
                    self.position.y -= 4;
                } else {
                    self.stop();
                }
            }, self.speed)
            break;
        case directions.down:
            self.interval = setInterval(function () {
                //TODO : изменить константу размера поля
                if (self.position.y <= 512) {
                    self.position.y += 4;
                } else {
                    self.stop();
                }
            }, self.speed)
            break;
        case directions.left:
            self.interval = setInterval(function () {
                if (self.position.x >= 0) {
                    self.position.x -= 4;
                } else {
                    self.stop();
                }
            }, self.speed)
            break;
        case directions.right:
            self.interval = setInterval(function () {
                //TODO : изменить константу размера поля
                if (self.position.x <= 512) {
                    self.position.x += 4;
                } else {
                    self.stop();
                }
            }, self.speed)
            break;
    }
}

Bullet.prototype.stop = function () {
    this.alive = false;
    clearInterval(this.interval);
}

Bullet.prototype.setStartPosition = function (playerPosition, direction) {
    switch (direction) {
        case directions.up:
            this.position.x = playerPosition.x + 14;
            this.position.y = playerPosition.y;
            break;
        case directions.down:
            this.position.x = playerPosition.x + 14;
            this.position.y = playerPosition.y + 32;
            break;
        case directions.left:
            this.position.x = playerPosition.x;
            this.position.y = playerPosition.y + 14;
            break;
        case directions.right:
            this.position.x = playerPosition.x + 32;
            this.position.y = playerPosition.y + 14;
            break;
    }
}



