/*
var botInterval, fireInterval;

function botStart() {
    var destinations = ["up", "down", "left", "right"] , rndDesination, tempDestination = null;


    botInterval = setInterval(function () {
        rndDesination = destinations[parseInt(Math.random() * destinations.length)];
        if (tempDestination == null) {
            tempDestination = rndDesination;
            setTimeout(function () {
                tempDestination = null;
            }, 3000);
        }
        move(tempDestination);
    }, 65);

    fireInterval = setInterval(function () {
        socket.emit("fire", {playerNumber: currentPlayer.playerNumber, direction: currentPlayer.direction})
    }, 300);

}

function botStop() {
    clearInterval(botInterval);
    clearInterval(fireInterval);
}*/
