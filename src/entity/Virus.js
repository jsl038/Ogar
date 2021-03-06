var Cell = require('./Cell');

function Virus() {
    Cell.apply(this, Array.prototype.slice.call(arguments));

    this.color = {
        r: 51,
        g: 255,
        b: 51
    };
    this.cellType = 2;
    this.spiked = 1;
    this.fed = 0;
    this.isMotherCell = false; // Not to confuse bots
}

module.exports = Virus;
Virus.prototype = new Cell();

// Main functions

Virus.prototype.onConsume = function(consumer) {
    var client = consumer.owner;

    // Cell consumes mass before any calculation
    consumer.addMass(this.mass);

    var numSplits = this.gameServer.config.playerMaxCells - client.cells.length; // Get number of splits
    var massLeft = consumer.mass;

    if (massLeft < 466) {
        // Too small cell - split it entirely
        var splitAmount = 1;
        while (massLeft > 0) {
            splitAmount *= 2;
            massLeft = consumer.mass - splitAmount * 36;
        }
        // Calculate split mass
        var splitMass = consumer.mass / splitAmount;

        // Split the cells
        for (var i = 0; i < splitAmount - 1; i++) {
            var angle = Math.random() * 6.28;
            if (consumer.mass <= 10) break; // add in any case

            this.gameServer.nodeHandler.createPlayerCell(client, consumer, angle, splitMass);
        }
    } else {
        // Too large cell - split it, also with larger cells
        // Begin calculating split masses
        var splitMass = consumer.mass * Math.pow(numSplits, -0.27) / 2;
        while (true) {
            if (numSplits <= 0 || splitMass < 48) break;
            var angle = Math.random() * 6.28;
            this.gameServer.nodeHandler.createPlayerCell(client, consumer, angle, splitMass);
            splitMass *= Math.pow(numSplits, -0.2) / 2;
            numSplits--;
        }

        // Fill with small cells if possible
        for (var i = 0; i < numSplits; i++) {
            var angle = Math.random() * 6.28;
            this.gameServer.nodeHandler.createPlayerCell(client, consumer, angle, 34);
        }
    }

    // Set teamers on fire
    client.massGainMult *= 1.8;
    client.massLossMult *= 1.8;
};

Virus.prototype.eat = function() {
    // Maximum amount of viruses
    if (this.gameServer.nodesVirus.length >= this.gameServer.config.virusMaxAmount) return;

    // Virus will eat ejected cells no matter the size of it
    for (var i = 0; i < this.gameServer.nodesEjected.length; i++) {
        var node = this.gameServer.nodesEjected[i];
        if (!node) continue;

        var dist = this.position.sqDistanceTo(node.position);
        var maxDist = this.getSquareSize();

        if (dist < maxDist) this.feed(node);
    }
};

Virus.prototype.feed = function(node) {
    // Eat it
    node.inRange = true;
    node.setKiller(this);
    this.gameServer.removeNode(node);

    // On feed checks
    this.fed++;
    this.mass += node.mass;
    // Set shooting angle if necessary
    if (this.moveEngine.x + this.moveEngine.y < 5) this.shootAngle = node.moveEngine.angle();
    if (this.fed >= this.gameServer.config.virusFeedAmount) {
        // Shoot!
        this.mass = this.gameServer.config.virusStartMass;
        this.fed = 0;

        this.gameServer.nodeHandler.shootVirus(this);
    }
};

Virus.prototype.onAdd = function() {
    this.gameServer.nodesVirus.push(this);
};

Virus.prototype.onRemove = function() {
    var index = this.gameServer.nodesVirus.indexOf(this);
    if (index != -1) this.gameServer.nodesVirus.splice(index, 1);
};
