var debug = true;

engine = {

    field: undefined,
    canvas: undefined,
    pixelSize: 4,
    image: new Image(),

    defineCanvas: function (el) {
        this.field = document.getElementById(el);
        this.canvas = this.field.getContext("2d");
        this.image.src = "resources/images.png";
    },

    drawPixel: function (x, y, color) {
        this.canvas.fillStyle = color;
        this.canvas.fillRect(x, y, this.pixelSize, this.pixelSize);
    },

    removePixel: function (x, y) {
        this.canvas.clearRect(x, y, this.pixelSize, this.pixelSize);
    },

    clearScene: function () {
        this.canvas.clearRect(0, 0, this.field.width, this.field.height);
    },

    drawImg: function (image, dx, dy, dw, dh, sx, sy, sw, sh, rotate, angle) {
        if (rotate) {
            this.canvas.save();
            this.canvas.translate(sx + parseInt(dw / 2), sy + parseInt(dh / 2));
        }
        image.onload = function (canvas, image) {
            if (rotate) {
                canvas.rotate(angle * Math.PI / 180);
                canvas.drawImage(image, dx, dy, dw, dh, -(dw / 2), -(dh / 2), sw, sh);
                canvas.restore();
            } else {
                canvas.drawImage(image, dx, dy, dw, dh, sx, sy, sw, sh);
            }
        }(this.canvas, image);
    }

};

var directions = {
    up: "up",
    down: "down",
    left: "left",
    right: "right"
};

var keyCodes = {
    38: "up",
    40: "down",
    37: "left",
    39: "right",
    32: "stop",  //space key
    90: "fire",
    88: "change_weapon"
};

var keysPressed = {
    38: false,
    40: false,
    37: false,
    39: false,
    90: false
}

var imagePosition = {
    players: {
        1: {x: 128, y: 0},
        2: {x: 160, y: 0},
        3: {x: 192, y: 0},
        4: {x: 224, y: 0}
    },
    cannonProjectile: {
        x: 252,
        y: 252
    },
    rocketLauncherProjectile: {
        x: 246,
        y: 243
    },
    water: {
        x: 0,
        y: 0
    },
    wall: {
        x: 64,
        y: 0
    },
    woods: {
        x: 32,
        y: 0
    },
    crack: {
        3: {x: 32, y: 32},
        2: {x: 0, y: 64},
        1: {x: 32, y: 64}
    },
    shield: {
        x: 96, y: 0
    },
    heart: {
        x: 64, y: 32
    },
    explosion: [
        {x: 0, y: 128},
        {x: 32, y: 128},
        {x: 64, y: 128},
        {x: 96, y: 128},
        {x: 0, y: 160},
        {x: 32, y: 160},
        {x: 64, y: 160},
        {x: 96, y: 160},
        {x: 0, y: 192},
        {x: 32, y: 192},
        {x: 64, y: 192},
        {x: 96, y: 192},
        {x: 0, y: 224},
        {x: 32, y: 224},
        {x: 64, y: 224},
        {x: 96, y: 224}
    ],
    mine: {
        x: 96, y: 32
    },
    cannon: {
        x: 128, y: 32
    },
    crate: {
        x: 160, y: 32
    },
    invincibility: {
        x: 64, y: 64
    },
    invisibility: {
        x: 96, y: 64
    },
    rocketLauncher: {
        x: 128, y: 64
    }

}

Array.prototype.fill = function (a, b) {
    var r = [];
    for (var i = a; i <= b; i++) {
        r.push(i);
    }
    return r;
}

