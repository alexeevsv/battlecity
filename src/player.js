function Player(x, y, playerNumber) {
    this.position = {x: x, y: y};
    this.prevPosition = {x: x, y: y};
    this.playerNumber = playerNumber;
    this.direction = this.prevDirection = directions.up;
    this.alive = true;
    this.playerName = "Player " + playerNumber;
    this.currentWeapon = "cannon";
    this.visible = true;

    this.render = function () {
        var angle = this.figureAngle(this.direction);
        engine.drawImg(
            engine.image,
            imagePosition.players[this.playerNumber].x, imagePosition.players[this.playerNumber].y,
            32, 32, this.position.x, this.position.y, 32, 32, true, angle);
    }

    this.figureAngle = function (direction) {
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


    this.getBulletSize = function () {
        switch (this.bulletType) {
            case "cannonProjectile":
                return {height: 4, width: 4};
                break;
            case "rocketLauncherProjectile" :
                return {height: 13, width: 6};
                break;
        }
    }

    this.figureAngle = function (direction) {
        var angle = 0;
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

    this.start = function () {
        this.alive = true;
        switch (this.direction) {
            case directions.up:
                (function (me) {
                    me.interval = setInterval(function () {
                        if (me.position.y >= 0) {
                            me.position.y -= 4;
                        } else {
                            me.stop();
                        }
                    }, me.speed)
                })(this);
                break;
            case directions.down:
                (function (me) {
                    me.interval = setInterval(function () {
                        //TODO : изменить константу размера поля
                        if (me.position.y <= 512) {
                            me.position.y += 4;
                        } else {
                            me.stop();
                        }
                    }, me.speed)
                })(this);
                break;
            case directions.left:
                (function (me) {
                    me.interval = setInterval(function () {
                        if (me.position.x >= 0) {
                            me.position.x -= 4;
                        } else {
                            me.stop();
                        }
                    }, me.speed)
                })(this);
                break;
            case directions.right:
                (function (me) {
                    me.interval = setInterval(function () {
                        //TODO : изменить константу размера поля
                        if (me.position.x <= 512) {
                            me.position.x += 4;
                        } else {
                            me.stop();
                        }
                    }, me.speed)
                })(this);
                break;
        }
    }

    this.stop = function () {
        this.alive = false;
        clearInterval(this.interval);
    }

    this.setStartPosition = function (playerPosition, direction) {
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

    this.setStartPosition(playerPosition, direction);
    this.figureAngle(direction);

}



