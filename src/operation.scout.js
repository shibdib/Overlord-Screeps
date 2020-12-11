/*
 * Copyright (c) 2020.
 * Github - Shibdib
 * Name - Bob Sardinia
 * Project - Overlord-Bot (Screeps)
 */

Creep.prototype.scoutRoom = function () {
    let sentence = [MY_USERNAME, 'Scout', 'Drone', 'For', this.memory.destination];
    let word = Game.time % sentence.length;
    this.say(sentence[word], true);
    // Handle edge case where room is overlord
    if (this.memory.destination === this.memory.overlord) {
        delete Memory.targetRooms[this.room.name];
        return this.memory.recycle = true;
    }
    if (this.room.name !== this.memory.destination) {
        return this.shibMove(new RoomPosition(25, 25, this.memory.destination), {
            range: 23,
            offRoad: true
        });
    }
    return operationPlanner(this.room, this);
};

StructureObserver.prototype.operationPlanner = function (room) {
    return operationPlanner(room);
};

function operationPlanner(room, creep = undefined) {
    // If room is no longer a target
    if (!Memory.targetRooms[room.name] && creep) return creep.memory.role = 'explorer';
    // Handle forward observer
    if (Memory.targetRooms[room.name] && Memory.targetRooms[room.name].type !== 'attack' && Memory.targetRooms[room.name].type !== 'scout') {
        forwardObserver(room);
        if (creep && !creep.moveToHostileConstructionSites(false, true)) creep.idleFor(15);
        return;
    }
    // Cache intel
    room.cacheRoomIntel(true);
    // Operation cooldown per room
    if (Memory.roomCache[room.name] && !Memory.roomCache[room.name].manual && Memory.roomCache[room.name].lastOperation && Memory.roomCache[room.name].lastOperation + ATTACK_COOLDOWN > Game.time && !Memory.targetRooms[room.name].manual) {
        delete Memory.targetRooms[room.name];
        if (creep) return creep.memory.role = 'explorer';
    }
    Memory.roomCache[room.name].lastOperation = Game.time;
    let maxLevel = Memory.maxLevel;
    // Get room details
    let towers = _.filter(room.structures, (s) => s.structureType === STRUCTURE_TOWER && (s.isActive() || !room.controller) && s.store.getUsedCapacity(RESOURCE_ENERGY) >= 10);
    let controller = room.controller;
    // Handle Allied Stuff
    let ally;
    if (controller && (controller.owner || controller.reservation)) {
        // Defend ally rooms
        if (controller.owner && _.includes(FRIENDLIES, controller.owner.username)) ally = true;
        if (controller.reservation && _.includes(FRIENDLIES, controller.reservation.username)) ally = true;
    }
    // Prioritize based on range
    let range = room.findClosestOwnedRoom(true);
    let priority;
    if (range <= LOCAL_SPHERE) priority = 1; else if (range <= LOCAL_SPHERE * 1.25) priority = 2; else if (range <= LOCAL_SPHERE * 2) priority = 3; else priority = 4;
    // Plan op based on room comp
    let cache = Memory.targetRooms || {};
    let tick = Game.time;
    let otherCreeps = _.filter(room.creeps, (c) => !c.my && !_.includes(FRIENDLIES, c.owner.username) && c.owner.username !== 'Invader' && c.owner.username !== 'Source Keeper');
    // Guard ally rooms
    let type, dDay;
    if (ally) {
        type = 'guard';
    } else {
        delete Memory.targetRooms[room.name];
        // If the room has no controller
        if (!controller) {
            // Handle SK Cores
            if (towers.length && nukeTarget(room)) {
                type = 'nuke';
                dDay = tick + NUKE_LAND_TIME;
            }
        } // If the room is in safemode queue up another scout
        else if (controller.owner && controller.safeMode) {
            type = 'pending';
            dDay = tick + room.controller.safeMode;
        } // If room is owned
        else if (controller.owner) {
            if (!towers.length) {
                type = 'hold';
            }
            // (50/50 we try a direct attack or rangers)
            if (Math.random() > 0.5) {
                if (maxLevel >= 7) {
                    // Handle MAD
                    if (Memory.MAD && _.includes(Memory.MAD, controller.owner.username) && nukeTarget(room)) {
                        type = 'nuke';
                        dDay = tick + NUKE_LAND_TIME;
                        Memory.MAD = _.filter(Memory.MAD, (u) => u !== controller.owner.username);
                    } else if (towers.length >= 3) {
                        type = 'drain';
                    } else if (towers.length) {
                        type = 'siegeGroup';
                    }
                } else {
                    type = 'drain';
                }
            } else {
                type = 'rangers';
            }
        } else {
            delete Memory.targetRooms[room.name];
        }
    }
    let lastOperation = Memory.roomCache[room.name].lastOperation || 0;
    if (type && lastOperation + ATTACK_COOLDOWN < Game.time) {
        cache[room.name] = {
            tick: tick,
            type: type,
            level: 1,
            priority: priority,
            dDay: dDay
        };
        log.a(_.capitalize(type) + ' planned for room ' + roomLink(room.name), 'OPERATION PLANNER: ');
        Memory.targetRooms = cache;
    } else {
        delete Memory.targetRooms[room.name];
    }
    if (creep) return creep.memory.role = 'explorer';
}

function nukeTarget(room) {
    if (Memory.maxLevel < 8) return false;
    let inboundNukes = room.nukes;
    let nukes = _.filter(Game.structures, (s) => s.structureType === STRUCTURE_NUKER && s.energy === s.energyCapacity && !s.store.getFreeCapacity(RESOURCE_GHODIUM) && !s.cooldown && Game.map.getRoomLinearDistance(s.room.name, room.name) <= 10);
    if (!inboundNukes && nukes.length) {
        let launched = 0;
        let nukesNeeded;
        for (let nuke of nukes) {
            if (nukesNeeded && launched >= nukesNeeded) break;
            let clusteredTower = _.filter(room.structures, (s) => s.structureType === STRUCTURE_TOWER && s.pos.findInRange(room.structures, 4, {filter: (l) => l.structureType === STRUCTURE_TOWER}).length >= 3 && (!s.pos.checkForRampart() || s.pos.checkForRampart().hits < nukes.length * 7500000))[0];
            let clusteredSpawns = _.filter(room.structures, (s) => s.structureType === STRUCTURE_SPAWN && s.pos.findInRange(room.structures, 4, {filter: (l) => l.structureType === STRUCTURE_SPAWN}).length >= 2 && (!s.pos.checkForRampart() || s.pos.checkForRampart().hits < nukes.length * 7500000))[0];
            let terminal = _.filter(room.structures, (s) => s.structureType === STRUCTURE_TERMINAL && (!s.pos.checkForRampart() || s.pos.checkForRampart().hits < nukes.length * 7500000))[0];
            let invaderCore = _.filter(room.structures, (s) => s.structureType === STRUCTURE_INVADER_CORE && s.effects[EFFECT_COLLAPSE_TIMER] < NUKE_LAND_TIME && (!s.pos.checkForRampart() || s.pos.checkForRampart().hits < nukes.length * 7500000))[0];
            if (clusteredTower) {
                if (clusteredTower.pos.checkForRampart()) nukesNeeded = _.ceil(clusteredTower.pos.checkForRampart().hits / 10000000);
                launched += 1;
                nuke.launchNuke(clusteredTower.pos);
                log.a('NUCLEAR LAUNCH DETECTED - ' + roomLink(clusteredTower.pos.roomName) + ' ' + clusteredTower.pos.x + '.' + clusteredTower.pos.y + ' has a nuke inbound from ' + roomLink(nuke.room.name) + ' and will impact in 50,000 ticks.');
                Game.notify('NUCLEAR LAUNCH DETECTED - ' + roomLink(clusteredTower.pos.roomName) + ' ' + clusteredTower.pos.x + '.' + clusteredTower.pos.y + ' has a nuke inbound from ' + roomLink(nuke.room.name) + ' and will impact in 50,000 ticks.');
            } else if (clusteredSpawns) {
                if (clusteredSpawns.pos.checkForRampart()) nukesNeeded = _.ceil(clusteredSpawns.pos.checkForRampart().hits / 10000000);
                launched += 1;
                nuke.launchNuke(clusteredSpawns.pos);
                log.a('NUCLEAR LAUNCH DETECTED - ' + roomLink(clusteredSpawns.pos.roomName) + ' ' + clusteredSpawns.pos.x + '.' + clusteredSpawns.pos.y + ' has a nuke inbound from ' + roomLink(nuke.room.name) + ' and will impact in 50,000 ticks.');
                Game.notify('NUCLEAR LAUNCH DETECTED - ' + roomLink(clusteredSpawns.pos.roomName) + ' ' + clusteredSpawns.pos.x + '.' + clusteredSpawns.pos.y + ' has a nuke inbound from ' + roomLink(nuke.room.name) + ' and will impact in 50,000 ticks.');
            } else if (terminal) {
                if (terminal.pos.checkForRampart()) nukesNeeded = _.ceil(terminal.pos.checkForRampart().hits / 10000000);
                launched += 1;
                nuke.launchNuke(room.terminal.pos);
                log.a('NUCLEAR LAUNCH DETECTED - ' + roomLink(room.terminal.pos.roomName) + ' ' + room.terminal.pos.x + '.' + room.terminal.pos.y + ' has a nuke inbound from ' + roomLink(nuke.room.name) + ' and will impact in 50,000 ticks.');
                Game.notify('NUCLEAR LAUNCH DETECTED - ' + roomLink(room.terminal.pos.roomName) + ' ' + room.terminal.pos.x + '.' + room.terminal.pos.y + ' has a nuke inbound from ' + roomLink(nuke.room.name) + ' and will impact in 50,000 ticks.');
            } else if (invaderCore) {
                if (invaderCore.pos.checkForRampart()) nukesNeeded = _.ceil(invaderCore.pos.checkForRampart().hits / 10000000);
                launched += 1;
                nuke.launchNuke(invaderCore.pos);
                log.a('NUCLEAR LAUNCH DETECTED - ' + roomLink(invaderCore.pos.roomName) + ' ' + invaderCore.pos.x + '.' + invaderCore.pos.y + ' has a nuke inbound from ' + roomLink(nuke.room.name) + ' and will impact in 50,000 ticks.');
                Game.notify('NUCLEAR LAUNCH DETECTED - ' + roomLink(invaderCore.pos.roomName) + ' ' + invaderCore.pos.x + '.' + invaderCore.pos.y + ' has a nuke inbound from ' + roomLink(nuke.room.name) + ' and will impact in 50,000 ticks.');
            }
        }
        return true;
    }
    return false;
}

// Observer tasks
function forwardObserver(room) {
    if (!Memory.targetRooms[room.name]) return false;
    let highCommand = require('military.highCommand');
    highCommand.operationSustainability(room);
    // Safemode
    if (room.controller.safeMode) {
        let cache = Memory.targetRooms || {};
        let tick = Game.time;
        cache[room.name] = {
            tick: tick,
            type: 'pending',
            dDay: tick + room.controller.safeMode,
        };
        Memory.targetRooms = cache;
        return;
    }
    //Type specific stuff
    switch (Memory.targetRooms[room.name].type) {
        case 'hold':
            // HOLD - Clear target if room is no longer owned
            if (!room.controller || !room.controller.owner || room.controller.safeMode || !Memory.targetRooms[room.name]) {
                log.a('Canceling hold operation in ' + roomLink(room.name) + ' as it is no longer owned.', 'HIGH COMMAND: ');
                delete Memory.targetRooms[room.name];
                return;
            }
            // Request unClaimer if room level is too high
            Memory.targetRooms[room.name].claimAttacker = !room.controller.upgradeBlocked && (!room.controller.ticksToDowngrade || room.controller.ticksToDowngrade > 1000);
            break;
    }
    let towers = _.filter(room.structures, (c) => c.structureType === STRUCTURE_TOWER && c.energy > 10 && c.isActive());
    let armedEnemies = _.filter(room.hostileCreeps, (c) => (c.getActiveBodyparts(ATTACK) || c.getActiveBodyparts(RANGED_ATTACK)) && c.owner && c.owner.username === c.room.controller.owner.username);
    let armedOwners = _.filter(_.pluck(room.hostileCreeps, 'owner.username'), (o) => !_.includes(FRIENDLIES, o) && o !== 'Invader');
    if (room.controller && room.controller.owner) armedOwners = _.union(armedOwners, [room.controller.owner.username])
    if (armedOwners.length > 1) {
        delete Memory.targetRooms[room.name];
        log.a('Canceling operation in ' + roomLink(room.name) + ' as there is a 3rd party present.', 'HIGH COMMAND: ');
        return room.cacheRoomIntel(true);
    } else if (towers.length && Memory.targetRooms[room.name].type !== 'siegeGroup' && Memory.targetRooms[room.name].type !== 'drain') {
        delete Memory.targetRooms[room.name];
        log.a('Canceling operation in ' + roomLink(room.name) + ' as we cannot hold it due to towers.', 'HIGH COMMAND: ');
        room.cacheRoomIntel(true);
    } else if (armedEnemies.length) {
        Memory.targetRooms[room.name].level = armedEnemies.length + 1;
    } else if (room.hostileCreeps.length) {
        Memory.targetRooms[room.name].level = 1;
    } else {
        Memory.targetRooms[room.name].level = 0;
    }
    let range = room.findClosestOwnedRoom(true);
    let priority;
    if (range <= LOCAL_SPHERE) priority = 1; else if (range <= LOCAL_SPHERE * 1.25) priority = 2; else if (range <= LOCAL_SPHERE * 2) priority = 3; else priority = 4;
    Memory.targetRooms[room.name].priority = priority;
}