var f, c, i,
    j = [
        {x: 0, y: 0},
        {x: 64, y: 0},
        {x: 128, y: 0},
        {x: 192, y: 0},
        {x: 0, y: 64},
        {x: 64, y: 64},
        {x: 128, y: 64},
        {x: 192, y: 64},
        {x: 0, y: 128},
        {x: 64, y: 128},
        {x: 128, y: 128},
        {x: 192, y: 128},
        {x: 0, y: 192},
        {x: 64, y: 192},
        {x: 128, y: 192},
        {x: 192, y: 192}

    ];

$(function () {
    f = document.getElementById("explosion");
    c = f.getContext("2d");

    i = new Image();
    i.src = "resources/explosion.png";

    c.drawImage(i, 10, 10);

    i.onload = function () {
        explode(0, 0);
//        c.drawImage(i, 64, 0, 128, 64, 0, 0, 64, 64);
    };

});
function explode(x, y) {
    var k = 0;
    var interval = setInterval(function () {
        if (k < j.length) {
            draw(x, y, j[k].x, j[k].y);
        } else {
            clearInterval(interval);
        }
        k++;
    }, 35)
}


function draw(x, y, xp, yp) {
    c.clearRect(0, 0, f.width, f.height);
    c.drawImage(i, xp, yp, 64, 64, x, y, 64, 64);
}

