/*
 * Copyright (c) 2020.
 * Github - Shibdib
 * Name - Bob Sardinia
 * Project - Overlord-Bot (Screeps)
 */

Creep.prototype.guardRoom = function () {
    let destination = this.memory.destination || this.memory.other.responseTarget;
    let sentence = ['Security', 'Guard', 'For', destination];
    let word = Game.time % sentence.length;
    this.say(sentence[word], true);
    // If military action required do that
    this.attackInRange();
    if (this.hits < this.hitsMax) this.heal(this); else this.healInRange();
    if (this.room.name !== destination) return this.shibMove(new RoomPosition(25, 25, destination), {range: 24});
    let guardLocation, guardRange;
    /** Season 1
     if (Game.shard.name === 'shardSeason') {
        guardLocation = this.room.find(FIND_SCORE_COLLECTORS)[0];
        if (guardLocation) {
            let sentence = ['Contact', MY_USERNAME, 'For', 'Access'];
            let word = Game.time % sentence.length;
            this.say(sentence[word], true);
        }
        guardRange = 8;
    } **/
    if (!this.handleMilitaryCreep(false, true, false, false, guardLocation, guardRange)) {
        if (!guardLocation) {
            if (this.findDefensivePosition(this)) this.goToHub(destination);
        } else {
            this.shibMove(guardLocation, {range: guardRange})
        }
    }
    levelManager(this);
};

function levelManager(creep) {
    if (creep.room.controller && creep.room.controller.safeMode) {
        Memory.targetRooms[creep.memory.destination] = undefined;
        creep.memory.role = 'longbow';
        creep.memory.operation = 'borderPatrol';
        return;
    }
    if (Memory.targetRooms[creep.memory.destination]) {
        let enemyCreeps = _.filter(creep.room.creeps, (c) => !_.includes(FRIENDLIES, c.owner.username));
        let armedEnemies = _.filter(enemyCreeps, (c) => c.getActiveBodyparts(ATTACK) || c.getActiveBodyparts(RANGED_ATTACK));
        if (armedEnemies.length) {
            Memory.targetRooms[creep.memory.destination].level = 2;
        } else if (enemyCreeps.length) {
            Memory.targetRooms[creep.memory.destination].level = 1;
        } else if (!Memory.targetRooms[creep.memory.destination].manual) {
            Memory.targetRooms[creep.memory.destination].level = 0;
        }
    }
}