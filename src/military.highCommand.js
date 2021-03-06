/*
 * Copyright (c) 2020.
 * Github - Shibdib
 * Name - Bob Sardinia
 * Project - Overlord-Bot (Screeps)
 */

let OPERATION_LIMIT;

module.exports.highCommand = function () {
    if (Memory.tickCooldowns.highCommandTick + 10 > Game.time) return;
    if (Game.cpu.bucket < BUCKET_MAX * 0.9) OPERATION_LIMIT = 1; else OPERATION_LIMIT = Memory.myRooms.length * 3;
    Memory.tickCooldowns.highCommandTick = Game.time;
    if (!Memory.nonCombatRooms) Memory.nonCombatRooms = [];
    if (!Memory.targetRooms) Memory.targetRooms = {};
    if (!Memory.auxiliaryTargets) Memory.auxiliaryTargets = {};
    // Manage dispatching responders
    manageResponseForces();
    // Auxiliary
    if (Math.random() > 0.75) auxiliaryOperations();
    // Request scouting for new operations
    if (Memory.maxLevel >= 2 && Math.random() > 0.85) operationRequests();
    // Manage marauders needing tasking
    let marauders = _.filter(Game.creeps, (c) => c.my && c.memory.operation === 'marauding' && c.memory.awaitingTarget);
    if (marauders.length) manageMarauders(marauders);
    // Manage old operations
    if (Math.random() > 0.85) {
        manageAttacks();
        manageAuxiliary();
    }
    // Check for flags
    if (_.size(Game.flags)) manualAttacks();
};

function manageResponseForces() {
    let idleResponders = _.filter(Game.creeps, (c) => c.memory && c.memory.awaitingOrders && c.memory.operation === 'borderPatrol');
    if (!idleResponders.length) return;
    let activeResponders = _.filter(Game.creeps, (c) => c.memory && !c.memory.awaitingOrders && c.memory.operation === 'borderPatrol');
    let ownedRoomAttack = _.findKey(Memory.roomCache, (r) => r.owner && r.owner === MY_USERNAME && r.lastPlayerSighting + 25 > Game.time && (!r.responseDispatched || r.responseDispatched + 20 < Game.time));
    let invaderCore = _.findKey(Memory.roomCache, (r) => r.closestRange <= 2 && !r.sk && !r.towers && r.invaderCore && !_.find(Game.creeps, (c) => c.my && c.memory.responseTarget === r.name) && (!r.responseDispatched || r.responseDispatched + 100 < Game.time));
    let responseTargets = _.max(_.filter(Memory.roomCache, (r) => r.threatLevel && r.friendlyPower <= r.hostilePower * 1.2 && !r.sk && (!r.user || r.user === MY_USERNAME) && r.closestRange <= LOCAL_SPHERE && r.lastInvaderCheck + 550 >= Game.time), '.threatLevel');
    let unarmedVisitors = _.findKey(Memory.roomCache, (r) => r.numberOfHostiles && !r.sk && (!r.user || r.user === MY_USERNAME) && (!r.hostilePower || r.hostilePower <= 5) && r.closestRange <= LOCAL_SPHERE && r.lastInvaderCheck + 550 >= Game.time && (!r.responseDispatched || r.responseDispatched + 100 < Game.time));
    let guard = _.findKey(Memory.targetRooms, (o) => o && o.type === 'guard' && o.level);
    let friendlyResponsePower = 0;
    if (ownedRoomAttack) {
        for (let creep of _.filter(activeResponders, (c) => c.memory.responseTarget === ownedRoomAttack)) friendlyResponsePower += creep.combatPower;
        for (let creep of _.sortBy(_.filter(idleResponders, (c) => (!c.memory.other.longRange && Game.map.getRoomLinearDistance(c.memory.overlord, ownedRoomAttack) <= 2) || c.memory.other.longRange), function (c) {
            Game.map.getRoomLinearDistance(c.pos.roomName, ownedRoomAttack);
        })) {
            Memory.roomCache[ownedRoomAttack].responseDispatched = Game.time;
            if (friendlyResponsePower > Memory.roomCache[ownedRoomAttack].hostilePower) break;
            friendlyResponsePower += creep.combatPower;
            creep.memory.other.responseTarget = ownedRoomAttack;
            creep.memory.awaitingOrders = undefined;
            creep.memory._shibMove = undefined;
            creep.memory.idle = undefined;
            if (creep.room.name !== ownedRoomAttack) log.a(creep.name + ' reassigned to assist in the defense of ' + roomLink(ownedRoomAttack) + ' from ' + roomLink(creep.room.name));
        }
    } else if (responseTargets && responseTargets.name) {
        for (let creep of _.filter(activeResponders, (c) => c.memory.responseTarget === ownedRoomAttack)) friendlyResponsePower += creep.combatPower;
        for (let creep of _.sortBy(_.filter(idleResponders, (c) => (!c.memory.other.longRange && Game.map.getRoomLinearDistance(c.memory.overlord, responseTargets.name) <= 2) || c.memory.other.longRange), function (c) {
            Game.map.getRoomLinearDistance(c.pos.roomName, responseTargets.name);
        })) {
            Memory.roomCache[responseTargets.name].responseDispatched = Game.time;
            if (friendlyResponsePower > responseTargets.hostilePower) break;
            friendlyResponsePower += creep.combatPower;
            creep.memory.other.responseTarget = responseTargets.name;
            creep.memory.awaitingOrders = undefined;
            creep.memory._shibMove = undefined;
            creep.memory.idle = undefined;
            if (creep.room.name !== responseTargets.name) log.a(creep.name + ' responding to ' + roomLink(responseTargets.name) + ' from ' + roomLink(creep.room.name));
        }
    } else if (invaderCore) {
        for (let creep of _.sortBy(_.filter(idleResponders, (c) => (!c.memory.other.longRange && Game.map.getRoomLinearDistance(c.memory.overlord, invaderCore) <= 2) || c.memory.other.longRange), function (c) {
            Game.map.getRoomLinearDistance(c.pos.roomName, invaderCore);
        })) {
            Memory.roomCache[invaderCore].responseDispatched = Game.time;
            if (friendlyResponsePower) break;
            friendlyResponsePower += creep.combatPower;
            creep.memory.other.responseTarget = invaderCore;
            creep.memory.awaitingOrders = undefined;
            creep.memory._shibMove = undefined;
            creep.memory.idle = undefined;
            if (creep.room.name !== invaderCore) log.a(creep.name + ' reassigned to deal with invader core in ' + roomLink(invaderCore) + ' from ' + roomLink(creep.room.name));
        }
    } else if (unarmedVisitors) {
        for (let creep of _.sortBy(_.filter(idleResponders, (c) => (!c.memory.other.longRange && Game.map.getRoomLinearDistance(c.memory.overlord, unarmedVisitors) <= 2) || c.memory.other.longRange), function (c) {
            Game.map.getRoomLinearDistance(c.pos.roomName, unarmedVisitors);
        })) {
            Memory.roomCache[unarmedVisitors].responseDispatched = Game.time;
            if (friendlyResponsePower) break;
            friendlyResponsePower += creep.combatPower;
            creep.memory.other.responseTarget = unarmedVisitors;
            creep.memory.awaitingOrders = undefined;
            creep.memory._shibMove = undefined;
            creep.memory.idle = undefined;
            if (creep.room.name !== unarmedVisitors) log.a(creep.name + ' investigating ' + roomLink(unarmedVisitors) + ' for possible trespassers, coming from ' + roomLink(creep.room.name));
        }
    } else if (guard) {
        for (let creep of _.sortBy(_.filter(idleResponders, (c) => (!c.memory.other.longRange && Game.map.getRoomLinearDistance(c.memory.overlord, guard) <= 2) || c.memory.other.longRange), function (c) {
            Game.map.getRoomLinearDistance(c.pos.roomName, guard);
        })) {
            creep.memory.other.responseTarget = guard;
            creep.memory.awaitingOrders = undefined;
            creep.memory._shibMove = undefined;
            creep.memory.idle = undefined;
            if (creep.room.name !== guard) log.a(creep.name + ' reassigned to help guard ' + roomLink(guard) + ' from ' + roomLink(creep.room.name));
        }
    }
}

function manageMarauders(marauders) {
    for (let marauder of marauders) {
        let filtered = _.filter(Memory.roomCache, (r) => r.name !== marauder.room.name && r.user && (!Memory.roomCache[r.name].lastMarauder || Memory.roomCache[r.name].lastMarauder + 650 < Game.time) && r.user !== MY_USERNAME && !_.includes(FRIENDLIES, r.user) &&
            !_.includes(marauder.memory.other.visited, r.name) && (Math.random() > 0.8 || !_.filter(Game.creeps, (c) => c.my && c.memory.other && c.memory.other.destination === r.name)[0]) && !r.safemode && !_.includes(Memory.nonCombatRooms, r.name));
        // Look for owned enemy rooms with no towers
        let targets = _.filter(filtered, (r) => _.includes(Memory._enemies, r.user) && r.level && !r.towers)
        // Look for owned threat rooms with no towers
        if (!targets.length) targets = _.filter(filtered, (r) => _.includes(Memory._threatList, r.user) && r.level && !r.towers)
        // Look for owned neutral rooms with no towers
        if (!targets.length) targets = _.filter(filtered, (r) => NEW_SPAWN_DENIAL && !_.includes(FRIENDLIES, r.user) && r.level && !r.towers)
        // Look threat un-owned threat controlled rooms actively being used
        if (!targets.length) targets = _.filter(filtered, (r) => _.includes(Memory._threatList, r.user) && !r.level)
        // Look threat un-owned neutral controlled rooms actively being used
        if (!targets.length) targets = _.filter(filtered, (r) => !r.level && POKE_NEUTRALS);
        if (targets.length) {
            if (Math.random() > 0.2) marauder.memory.other.destination = _.sortBy(targets, function (t) {
                return Game.map.getRoomLinearDistance(marauder.room.name, t.name)
            })[0].name
            else marauder.memory.other.destination = _.sample(targets).name
            marauder.memory.awaitingTarget = undefined;
            log.a(marauder.name + ' re-tasked to attack ' + roomLink(marauder.memory.other.destination) + ' from ' + roomLink(marauder.room.name), 'MARAUDING:');
        } else {
            if (marauder.memory.other.visited.length) marauder.memory.other.visited = []; else marauder.memory.other.destination = marauder.memory.overlord;
        }
    }
}

function auxiliaryOperations() {
    let maxLevel = Memory.maxLevel;
    let initialFilter = _.filter(Memory.roomCache, (r) => r.name && !Memory.auxiliaryTargets[r.name] && !_.includes(Memory.nonCombatRooms, r.name) && Game.map.getRoomLinearDistance(_.sample(Game.spawns).room.name, r.name) <= 12 && ((r.lastOperation || 0) + ATTACK_COOLDOWN < Game.time) && !r.hostile);
    if (maxLevel >= 6) {
        // Power Mining
        if (getResourceTotal(RESOURCE_POWER) < 10000 && maxLevel >= 7) {
            let powerRoom = _.min(_.filter(initialFilter, (r) => r.power && r.power + 1500 >= Game.time && r.closestRange <= 8), 'closestRange');
            let powerMining = _.filter(Memory.auxiliaryTargets, (target) => target && target.type === 'power').length || 0;
            if (powerRoom.name && !powerMining) {
                let cache = Memory.auxiliaryTargets || {};
                let tick = Game.time;
                cache[powerRoom.name] = {
                    tick: tick,
                    type: 'power',
                    level: 1,
                    priority: PRIORITIES.secondary
                };
                Memory.auxiliaryTargets = cache;
                log.a('Mining operation planned for ' + roomLink(powerRoom.name) + ' suspected power bank location, Nearest Room - ' + powerRoom.closestRange + ' rooms away', 'HIGH COMMAND: ');
            }
        }
        // Commodity Mining
        let commodityRoom = _.min(_.filter(initialFilter, (r) => r.commodity && r.closestRange <= 8), 'closestRange');
        let commodityMining = _.filter(Memory.auxiliaryTargets, (target) => target && target.type === 'commodity').length || 0;
        if (commodityRoom.name && commodityMining < 2) {
            let cache = Memory.auxiliaryTargets || {};
            let tick = Game.time;
            cache[commodityRoom.name] = {
                tick: tick,
                type: 'commodity',
                level: 1,
                priority: PRIORITIES.secondary
            };
            Memory.auxiliaryTargets = cache;
            log.a('Mining operation planned for ' + roomLink(commodityRoom.name) + ' suspected commodity deposit location, Nearest Room - ' + commodityRoom.closestRange + ' rooms away', 'HIGH COMMAND: ');
        }
    }
    // Seasonal score collection
    if (Game.shard.name === 'shardSeason') {
        /** Season 1
         let scoreCollector = _.min(_.filter(initialFilter, (r) => r.seasonCollector === 1), 'closestRange');
         // Score collection
         if (maxLevel >= 4 || scoreCollector.name) {
            let scoreRoom = _.min(_.filter(initialFilter, (r) => r.seasonResource > Game.time && r.closestRange <= r.seasonResource / 50 && r.reservation !== MY_USERNAME), 'closestRange');
            let scoreMining = _.filter(Memory.auxiliaryTargets, (target) => target && target.type === 'score').length || 0;
            if (scoreRoom.name && scoreMining < 10 && getResourceTotal(RESOURCE_SCORE) < 100000) {
                let cache = Memory.auxiliaryTargets || {};
                let tick = Game.time;
                cache[scoreRoom.name] = {
                    tick: tick,
                    type: 'score',
                    level: 1,
                    priority: PRIORITIES.secondary
                };
                Memory.auxiliaryTargets = cache;
                log.a('Score Claiming operation planned for ' + roomLink(scoreRoom.name) + ' suspected score container location, Nearest Room - ' + scoreRoom.closestRange + ' rooms away', 'HIGH COMMAND: ');
            }
        }
         // Collector clearing
         let pendingCollector = _.min(_.filter(initialFilter, (r) => r.seasonCollector === 2 && (!r.user || r.user === MY_USERNAME)), 'closestRange');
         let scoreCleaning = _.filter(Memory.auxiliaryTargets, (target) => target && target.type === 'scoreCleaner').length || 0;
         if (scoreCleaning < 2 && pendingCollector.name && (!scoreCollector.name || scoreCollector.closestRange > pendingCollector.closestRange)) {
            let cache = Memory.auxiliaryTargets || {};
            let tick = Game.time;
            cache[pendingCollector.name] = {
                tick: tick,
                type: 'scoreCleaner',
                level: 1,
                priority: PRIORITIES.secondary
            };
            Memory.auxiliaryTargets = cache;
            log.a('Score cleaning operation planned for ' + roomLink(pendingCollector.name) + ' to clear walls, Nearest Room - ' + pendingCollector.closestRange + ' rooms away', 'HIGH COMMAND: ');
        }
         // Collector Guard
         else if (scoreCollector.name && !Memory.targetRooms[scoreCollector.name]) {
            let cache = Memory.targetRooms || {};
            let tick = Game.time;
            cache[scoreCollector.name] = {
                tick: tick,
                type: 'guard',
                level: 1,
                priority: PRIORITIES.secondary
            };
            Memory.targetRooms = cache;
            log.a('Score guard operation planned for ' + roomLink(scoreCollector.name) + ', Nearest Room - ' + scoreCollector.closestRange + ' rooms away', 'HIGH COMMAND: ');
        }**/
        if (maxLevel >= 4) {
            let scoreRoom = _.min(_.filter(initialFilter, (r) => r.seasonResource > Game.time && r.closestRange <= r.seasonResource / 50 && r.reservation !== MY_USERNAME && getResourceTotal(r.seasonResourceType) < 10000), 'closestRange');
            let scoreMining = _.filter(Memory.auxiliaryTargets, (target) => target && target.type === 'score').length || 0;
            if (scoreRoom.name && scoreMining < 10) {
                let cache = Memory.auxiliaryTargets || {};
                let tick = Game.time;
                cache[scoreRoom.name] = {
                    tick: tick,
                    type: 'score',
                    level: 1,
                    priority: PRIORITIES.secondary
                };
                Memory.auxiliaryTargets = cache;
                log.a('Resource Claiming operation planned for ' + roomLink(scoreRoom.name) + ' suspected score container location, Nearest Room - ' + scoreRoom.closestRange + ' rooms away', 'HIGH COMMAND: ');
            }
        }
    }
}

function operationRequests() {
    if (!Memory._enemies || !Memory._enemies.length) Memory._enemies = [];
    if (!Memory._nuisance || !Memory._nuisance.length) Memory._nuisance = [];
    let totalCountFiltered = _.filter(Memory.targetRooms, (target) => target && target.type !== 'guard' && target.type !== 'pending').length || 0;
    let capableRooms = _.filter(Memory.myRooms, (r) => Game.rooms[r].energyState).length > 0;
    // Set limit
    let targetLimit = OPERATION_LIMIT;
    if (TEN_CPU) targetLimit = 1;
    if (!capableRooms) targetLimit = 1;
    if (totalCountFiltered <= targetLimit) {
        let initialFilter = _.filter(Memory.roomCache, (r) => !Memory.targetRooms[r.name] && !_.includes(Memory.nonCombatRooms, r.name) && ((r.lastOperation || 0) + ATTACK_COOLDOWN < Game.time) && !checkForNap(r.user) && !_.includes(FRIENDLIES, r.user) && (!r.safemode || r.safemode - 500 < Game.time));
        // Kill strongholds
        let stronghold = _.sortBy(_.filter(initialFilter, (r) => r.sk && r.towers && r.towers < 3 && r.closestRange <= 5), function (t) {
            return t.closestRange
        });
        if (stronghold[0] && Memory.maxLevel >= 7) {
            let cache = Memory.targetRooms || {};
            let tick = Game.time;
            cache[stronghold[0].name] = {
                tick: tick,
                type: 'siegeGroup',
                level: 1
            };
            Memory.targetRooms = cache;
            log.a('Stronghold attack operation planned for ' + roomLink(stronghold[0].name) + ' SUSPECTED INVADER STRONGHOLD (Nearest Friendly Room - ' + stronghold[0].closestRange + ' rooms away)', 'HIGH COMMAND: ');
        }
        // New Spawn Denial/No towers
        if (NEW_SPAWN_DENIAL) {
            let newSpawns = _.sortBy(_.filter(initialFilter, (r) => !r.towers && r.owner && r.owner !== 'Invader'
                && (!r.safemode || r.safemode - 500 < Game.time)), function (t) {
                return t.closestRange
            });
            if (newSpawns[0]) {
                let cache = Memory.targetRooms || {};
                cache[newSpawns[0].name] = {
                    tick: Game.time,
                    type: 'hold',
                    level: 0,
                    priority: 1
                };
                Memory.targetRooms = cache;
                Memory.roomCache[newSpawns[0].name].lastOperation = Game.time;
                log.a('Hold operation planned for ' + roomLink(newSpawns[0].name) + ' owned by ' + newSpawns[0].user + ' (Nearest Friendly Room - ' + newSpawns[0].closestRange + ' rooms away)', 'HIGH COMMAND: ');
            }
        }
        // Direct Room Attacks
        if (OFFENSIVE_OPERATIONS) {
            // Reserved room attacks
            let reservedTarget = _.sortBy(_.filter(initialFilter, (r) => r.user && r.user !== 'Invader' && !r.towers && (_.includes(Memory._enemies, r.user) || (r.closestRange <= LOCAL_SPHERE && ATTACK_LOCALS) || (HOLD_SECTOR && sameSectorCheck(r.name, r.closestRoom)))), function (t) {
                return t.closestRange
            })[0]
            if (reservedTarget) {
                let cache = Memory.targetRooms || {};
                cache[reservedTarget.name] = {
                    tick: Game.time,
                    type: 'harass',
                    level: 1
                };
                Memory.targetRooms = cache;
                Memory.roomCache[reservedTarget.name].lastOperation = Game.time;
                log.a('Harass operation planned for ' + roomLink(reservedTarget.name) + ' owned by ' + reservedTarget.user + ' (Nearest Friendly Room - ' + reservedTarget.closestRange + ' rooms away)', 'HIGH COMMAND: ');
            }
            // SWARM
            if (Memory.maxLevel < 7) {
                let swarmTargets = _.sortBy(_.filter(initialFilter, (r) => r.swarm && r.owner && r.owner !== 'Invader' && (_.includes(Memory._enemies, r.user) || (r.closestRange <= LOCAL_SPHERE && ATTACK_LOCALS) || (HOLD_SECTOR && sameSectorCheck(r.name, r.closestRoom)))), function (t) {
                    return t.closestRange
                });
                let swarmCount = _.filter(Memory.targetRooms, (target) => target && target.type === 'swarm')[0];
                if (swarmTargets[0] && !swarmCount) {
                    let cache = Memory.targetRooms || {};
                    cache[swarmTargets[0].name] = {
                        tick: Game.time,
                        type: 'swarm',
                        level: 0,
                        priority: 1
                    };
                    Memory.targetRooms = cache;
                    Memory.roomCache[swarmTargets[0].name].lastOperation = Game.time;
                    log.a('Swarm operation planned for ' + roomLink(swarmTargets[0].name) + ' owned by ' + swarmTargets[0].user + ' (Nearest Friendly Room - ' + swarmTargets[0].closestRange + ' rooms away)', 'HIGH COMMAND: ');
                }
            } else if (capableRooms && (!Memory.lastSiege || Memory.lastSiege + ATTACK_COOLDOWN < Game.time) && !_.filter(Memory.targetRooms, (target) => target && (target.type === 'siegeGroup' || target.type === 'drain')).length) {
                let siegeTarget = _.sortBy(_.filter(initialFilter, (r) => r.owner && (_.includes(Memory._enemies, r.user) || (r.closestRange <= LOCAL_SPHERE && ATTACK_LOCALS) || (HOLD_SECTOR && sameSectorCheck(r.name, r.closestRoom))) && r.towers < 3), function (t) {
                    return t.level
                })[0];
                if (siegeTarget) {
                    let cache = Memory.targetRooms || {};
                    let type = 'siegeGroup';
                    Memory.lastSiege = Game.time;
                    if (!siegeTarget.towers) type = 'hold';
                    cache[siegeTarget.name] = {
                        tick: Game.time,
                        type: type
                    };
                    Memory.targetRooms = cache;
                    log.a(_.capitalize(type) + ' operation planned for ' + roomLink(siegeTarget.name) + ' owned by ' + siegeTarget.user + ' (Nearest Friendly Room - ' + siegeTarget.closestRange + ' rooms away)', 'HIGH COMMAND: ');
                }
            }
        }
    }
    // Handle MAD
    if (Memory.MAD && Memory.MAD.length && 1 > 2) {
        // Find nuke targets
        let MADTarget = _.sortBy(_.filter(Memory.roomCache, (r) => r.owner && (_.includes(Memory.MAD, r.owner) || _.includes(Memory._enemies, r.user)) && r.spawnLocation && r.level >= 6 && !Memory.targetRooms[r.name]), 'closestRange');
        if (MADTarget.length && !Memory.targetRooms[MADTarget[0].name]) {
            for (let targetRoom of MADTarget) {
                // Look for nukes in range
                let nukes = _.filter(Game.structures, (s) => s.my && s.structureType === STRUCTURE_NUKER && !s.store.getFreeCapacity(RESOURCE_ENERGY) && !s.store.getFreeCapacity(RESOURCE_GHODIUM) && !s.cooldown && Game.map.getRoomLinearDistance(s.room.name, targetRoom.name) <= 10);
                if (nukes.length) {
                    for (let nuke of nukes) {
                        if (nuke.launchNuke(JSON.parse(targetRoom.spawnLocation)) === OK) {
                            log.a('NUCLEAR LAUNCH DETECTED - ' + roomLink(JSON.parse(targetRoom.spawnLocation).roomName) + ' ' + JSON.parse(targetRoom.spawnLocation).x + '.' + JSON.parse(targetRoom.spawnLocation).y + ' has a nuke inbound from ' + roomLink(nuke.room.name) + ' and will impact in 50,000 ticks.', 'HIGH COMMAND: ');
                            Game.notify('NUCLEAR LAUNCH DETECTED - ' + roomLink(JSON.parse(targetRoom.spawnLocation).roomName) + ' ' + JSON.parse(targetRoom.spawnLocation).x + '.' + JSON.parse(targetRoom.spawnLocation).y + ' has a nuke inbound from ' + roomLink(nuke.room.name) + ' and will impact in 50,000 ticks.');
                            let cache = Memory.targetRooms || {};
                            let tick = Game.time;
                            cache[targetRoom.name] = {
                                tick: tick,
                                dDay: tick + 50000,
                                type: 'nuke',
                                level: 1
                            };
                            Memory.targetRooms = cache;
                        }
                        // Chance this nuke is enough to remove it from the MAD list
                        if (Math.random() > 0.5) Memory.MAD = _.filter(Memory.MAD, (u) => u !== targetRoom.owner);
                    }
                }
            }
        }
    }
}

function manageAttacks() {
    if (!Memory.targetRooms || !_.size(Memory.targetRooms)) return;
    let maxLevel = Memory.maxLevel;
    let totalCountFiltered = _.filter(Memory.targetRooms, (target) => target && target.type !== 'attack' && target.type !== 'scout' && target.type !== 'guard').length || 0;
    let siegeCountFiltered = _.filter(Memory.targetRooms, (target) => target && (target.type === 'siege' || target.type === 'siegeGroup' || target.type === 'drain')).length || 0;
    let staleMulti = 1;
    for (let key in Memory.targetRooms) {
        try {
            if (!Memory.targetRooms[key] || !key || key === 'undefined') {
                delete Memory.targetRooms[key];
                continue;
            }
        } catch (e) {
        }
        if (_.includes(Memory.nonCombatRooms, key)) {
            delete Memory.targetRooms[key];
            log.a('Canceling operation in ' + roomLink(key) + ' as it is set as a manual non combat room.', 'HIGH COMMAND: ');
            continue;
        }
        let type = Memory.targetRooms[key].type;
        let level = Memory.targetRooms[key].level || 0;
        // Special Conditions
        switch (type) {
            // Manage Scouts
            case 'scout':
            case 'attack':
                // Clear scouts first if over limit
                if (totalCountFiltered > OPERATION_LIMIT + 1) {
                    log.a('Canceling scouting in ' + roomLink(key) + ' as we have too many active operations.', 'HIGH COMMAND: ');
                    delete Memory.targetRooms[key];
                    continue;
                }
                break;
            // Manage Holds
            case 'hold':
                staleMulti = 100;
                if (Memory.roomCache[key] && (_.includes(FRIENDLIES, Memory.roomCache[key].owner) && (Memory.roomCache[key].closestRange > LOCAL_SPHERE || ATTACK_LOCALS))) {
                    log.a('Canceling ' + _.capitalize(Memory.targetRooms[key].type) + ' in ' + roomLink(key) + ' as it is no longer hostile.', 'HIGH COMMAND: ');
                    delete Memory.targetRooms[key];
                    totalCountFiltered--;
                    continue;
                } else if (Memory.roomCache[key] && (!Memory.roomCache[key].owner || Memory.roomCache[key].owner === 'Invader') && !Memory.roomCache[key].reservation) {
                    log.a('Canceling ' + _.capitalize(Memory.targetRooms[key].type) + ' in ' + roomLink(key) + ' as it is no longer controlled by anyone.', 'HIGH COMMAND: ');
                    delete Memory.targetRooms[key];
                    totalCountFiltered--;
                    continue;
                }
                break;
            // Manage Nukes
            case 'nukes':
                continue;
            // Manage siege
            case 'drain':
                if (siegeCountFiltered > 1) {
                    log.a('Canceling ' + _.capitalize(Memory.targetRooms[key].type) + ' in ' + roomLink(key) + ' as we have too many active operations.', 'HIGH COMMAND: ');
                    delete Memory.targetRooms[key];
                    siegeCountFiltered--;
                    continue;
                }
                break;
            case 'siegeGroup':
                if (Memory.roomCache[key] && (!_.includes(Memory._enemies, Memory.roomCache[key].owner) && (Memory.roomCache[key].closestRange > LOCAL_SPHERE || !ATTACK_LOCALS))) {
                    log.a('Canceling ' + _.capitalize(Memory.targetRooms[key].type) + ' in ' + roomLink(key) + ' as it is no longer hostile.', 'HIGH COMMAND: ');
                    delete Memory.targetRooms[key];
                    totalCountFiltered--;
                    siegeCountFiltered--;
                    continue;
                } else if (maxLevel < 6) {
                    log.a('Canceling ' + _.capitalize(Memory.targetRooms[key].type) + ' in ' + roomLink(key) + ' as we do not have a room available to supply the creeps needed.', 'HIGH COMMAND: ');
                    delete Memory.targetRooms[key];
                    totalCountFiltered--;
                    siegeCountFiltered--;
                    continue;
                } else if (siegeCountFiltered > 1) {
                    log.a('Canceling ' + _.capitalize(Memory.targetRooms[key].type) + ' in ' + roomLink(key) + ' as we have too many active operations.', 'HIGH COMMAND: ');
                    delete Memory.targetRooms[key];
                    totalCountFiltered--;
                    siegeCountFiltered--;
                    continue;
                }
                break;
            // Manage Pending
            case 'pending':
                if (Memory.targetRooms[key].dDay - 50 <= Game.time) {
                    let cache = Memory.targetRooms || {};
                    let tick = Game.time;
                    cache[key] = {
                        tick: tick,
                        type: 'hold',
                        level: 1
                    };
                    Memory.targetRooms = cache;
                }
                continue;
            // Manage Harass
            case 'harass':
                staleMulti = 3;
                break;
            // Manage Guard
            case 'guard':
                staleMulti = 5 * (level + 1);
                break;
            // Remove auxiliary
            case 'power':
            case 'poke':
            case 'commodity':
            case 'claimClear':
            case 'claimScout':
            case 'score':
            case 'scoreCleaner':
            case 'claim':
                delete Memory.targetRooms[key];
                continue;
        }
        if (Memory.targetRooms[key].manual) staleMulti = 999999;
        if (!Memory.targetRooms[key]) continue;
        // Cancel stale ops with no kills
        if ((Memory.targetRooms[key].tick + (1500 * staleMulti) < Game.time && !Memory.targetRooms[key].lastEnemyKilled) ||
            (Memory.targetRooms[key].lastEnemyKilled && Memory.targetRooms[key].lastEnemyKilled + (2500 * staleMulti) < Game.time)) {
            delete Memory.targetRooms[key];
            log.a('Canceling operation in ' + roomLink(key) + ' as it has gone stale.', 'HIGH COMMAND: ');
            continue;
        }
        // Remove far rooms
        if (Memory.roomCache[key] && Memory.roomCache[key].closestRange > LOCAL_SPHERE * 4 && type !== 'guard' && !Memory.targetRooms[key].manual) {
            delete Memory.targetRooms[key];
            log.a('Canceling operation in ' + roomLink(key) + ' as it is too far away.', 'HIGH COMMAND: ');
            continue;
        }
        // Remove your rooms
        if (Memory.roomCache[key] && Memory.targetRooms[key].type !== 'guard' && Memory.roomCache[key].user && Memory.roomCache[key].user === MY_USERNAME) {
            delete Memory.targetRooms[key];
            continue;
        }
        // Remove allied rooms
        if (Memory.roomCache[key] && Memory.targetRooms[key].type !== 'guard' && Memory.roomCache[key].user && _.includes(FRIENDLIES, Memory.roomCache[key].user)) {
            delete Memory.targetRooms[key];
            log.a('Canceling operation in ' + roomLink(key) + ' as ' + Memory.roomCache[key].user + ' is a friend.', 'HIGH COMMAND: ');
            continue;
        }
        // Remove allied rooms
        if (Memory.roomCache[key] && Memory.targetRooms[key].type !== 'guard' && Memory.roomCache[key].user && checkForNap(Memory.roomCache[key].user)) {
            delete Memory.targetRooms[key];
            log.a('Canceling operation in ' + roomLink(key) + ' as ' + Memory.roomCache[key].user + ' is part of a friendly alliance.', 'HIGH COMMAND: ');
            continue;
        }
        // Delete wave based rooms at the threshold
        if (Memory.targetRooms[key].waves) {
            if (Memory.targetRooms[key].waves >= 5) {
                delete Memory.targetRooms[key];
                log.a('Canceling operation in ' + roomLink(key) + ' as it has reached the maximum number of attack waves.', 'HIGH COMMAND: ');
            }
        }
        // Remove rooms where we're getting wrecked
        if (Memory.targetRooms[key].tick + 750 && Memory.targetRooms[key].friendlyDead) {
            let alliedLosses = Memory.targetRooms[key].friendlyDead;
            let enemyLosses = Memory.targetRooms[key].enemyDead || 1000;
            if (alliedLosses > (enemyLosses + 10) * staleMulti) {
                delete Memory.targetRooms[key];
                log.a('Canceling operation in ' + roomLink(key) + ' due to heavy casualties.', 'HIGH COMMAND: ');
            }
        }
    }
}

function manageAuxiliary() {
    if (!Memory.auxiliaryTargets || !_.size(Memory.auxiliaryTargets)) return;
    let maxLevel = Memory.maxLevel;
    for (let key in Memory.auxiliaryTargets) {
        if (!Memory.auxiliaryTargets[key] || !key || key === 'undefined' || key === 'Undefined') {
            delete Memory.auxiliaryTargets[key];
            continue;
        }
        let type = Memory.auxiliaryTargets[key].type;
        if (_.includes(Memory.nonCombatRooms, key)) {
            delete Memory.auxiliaryTargets[key];
            log.a('Canceling auxiliary operation in ' + roomLink(key) + ' as it is set as a manual non combat room.', 'HIGH COMMAND: ');
            continue;
        }
        // Special Conditions
        switch (type) {
            case 'power':
                if (maxLevel < 7) delete Memory.auxiliaryTargets[key];
                if (Memory.roomCache[key].power + 1500 < Game.time) {
                    delete Memory.auxiliaryTargets[key];
                    delete Memory.roomCache[key];
                }
                break;
            case 'commodity':
                if (maxLevel < 6) delete Memory.auxiliaryTargets[key];
                break;
            case 'claim':
            case 'claimScout':
            case 'claimClear':
                if (Game.gcl.level === Memory.myRooms.length) {
                    delete Memory.auxiliaryTargets[key];
                    continue;
                }
                break;
            case 'score':
                if (!Memory.roomCache[key] || !Memory.roomCache[key].seasonResource || Memory.roomCache[key].seasonResource < Game.time) {
                    log.a('Canceling auxiliary operation in ' + roomLink(key) + ' as the container has expired.', 'HIGH COMMAND: ');
                    delete Memory.auxiliaryTargets[key];
                    continue;
                }/** Season 1
             else if (getResourceTotal(RESOURCE_SCORE) > 100000) {
                    log.a('Canceling auxiliary operation in ' + roomLink(key) + ' as we hit our stored score cap.', 'HIGH COMMAND: ');
                    delete Memory.auxiliaryTargets[key];
                    continue;
                }**/
                if (getResourceTotal(Memory.roomCache[key].seasonResourceType) > 10000) {
                    log.a('Canceling auxiliary operation in ' + roomLink(key) + ' as we hit our stored score cap for.' + Memory.roomCache[key].seasonResource, 'HIGH COMMAND: ');
                    delete Memory.auxiliaryTargets[key];
                    continue;
                }
                break;
            case 'scoreCleaner':
                continue;
            case 'clean':
            case 'robbery':
                delete Memory.auxiliaryTargets[key];
                break;
        }
        if (!Memory.auxiliaryTargets[key]) continue;
        // Cancel stale ops
        if (Memory.auxiliaryTargets[key].tick + 10000 < Game.time) {
            delete Memory.auxiliaryTargets[key];
            log.a('Canceling auxiliary operation in ' + roomLink(key) + ' as it has gone stale.', 'HIGH COMMAND: ');
        }
    }
}

function manualAttacks() {
    for (let name in Game.flags) {
        //Cancel attacks
        if (_.startsWith(name, 'cancel')) {
            delete Memory.targetRooms[Game.flags[name].pos.roomName];
            delete Memory.auxiliaryTargets[Game.flags[name].pos.roomName];
            delete Memory.roomCache[Game.flags[name].pos.roomName];
            log.a('Canceling operation in ' + roomLink(Game.flags[name].pos.roomName) + ' at your request.', 'HIGH COMMAND: ');
            Game.flags[name].remove();
            continue;
        }
        //Bad room flag
        if (_.startsWith(name, 'avoid')) {
            let cache = Memory.avoidRooms || [];
            cache.push(Game.flags[name].pos.roomName);
            Memory.avoidRooms = cache;
            log.e(roomLink(Game.flags[name].pos.roomName) + ' will be avoided.');
            Game.flags[name].remove();
            continue;
        }
        //Remove bad room/remote flag
        if (_.startsWith(name, 'remove')) {
            if (Memory.avoidRooms && _.includes(Memory.avoidRooms, Game.flags[name].pos.roomName)) {
                let cache = Memory.avoidRooms;
                cache = _.filter(cache, (r) => r !== Game.flags[name].pos.roomName);
                Memory.avoidRooms = cache;
                log.e(roomLink(Game.flags[name].pos.roomName) + ' will no longer be avoided.')
            } else if (Memory.avoidRemotes && _.includes(Memory.avoidRemotes, Game.flags[name].pos.roomName)) {
                let cache = Memory.avoidRemotes;
                cache = _.filter(cache, (r) => r !== Game.flags[name].pos.roomName);
                Memory.avoidRemotes = cache;
                log.e(roomLink(Game.flags[name].pos.roomName) + ' will no longer be avoided.')
            } else {
                log.e(roomLink(Game.flags[name].pos.roomName) + ' is not on any avoid lists.')
            }
            Game.flags[name].remove();
            continue;
        }
        // Manual combat
        let cache = Memory.targetRooms || {};
        let tick = Game.time;
        //Set future
        if (_.startsWith(name, 'future')) {
            let ticks = name.match(/\d+$/)[0];
            cache[Game.flags[name].pos.roomName] = {
                dDay: tick + ticks,
                type: 'pending'
            };
        } else if (_.startsWith(name, 'siege')) {
            cache[Game.flags[name].pos.roomName] = {
                type: 'siegeGroup'
            };
        } else if (_.startsWith(name, 'attack')) {
            cache[Game.flags[name].pos.roomName] = {
                type: 'attack'
            };
        } else if (_.startsWith(name, 'guard')) {
            cache[Game.flags[name].pos.roomName] = {
                type: 'guard'
            };
        } else if (_.startsWith(name, 'hold')) {
            cache[Game.flags[name].pos.roomName] = {
                type: 'hold'
            };
        } else if (_.startsWith(name, 'drain')) {
            cache[Game.flags[name].pos.roomName] = {
                type: 'drain'
            };
        } else if (_.startsWith(name, 'ranger')) {
            cache[Game.flags[name].pos.roomName] = {
                type: 'rangers'
            };
        } else if (_.startsWith(name, 'swarm')) {
            cache[Game.flags[name].pos.roomName] = {
                type: 'swarm'
            };
        } else if (_.startsWith(name, 'power')) {
            cache[Game.flags[name].pos.roomName] = {
                type: 'power'
            };
        } else if (_.startsWith(name, 'test')) {
            cache[Game.flags[name].pos.roomName] = {
                type: 'test'
            };
        } else if (_.startsWith(name, 'nuke')) {
            cache[Game.flags[name].pos.roomName] = {
                dDay: tick + 50000,
                type: 'nuke'
            };
            nukeFlag(Game.flags[name])
        } else if (_.startsWith(name, 'ignore')) {
            if (!_.includes(Memory.nonCombatRooms, Game.flags[name].pos.roomName)) {
                Memory.nonCombatRooms.push(Game.flags[name].pos.roomName);
                log.a(Game.flags[name].pos.roomName + ' added as a non combat target.');
            } else {
                Memory.nonCombatRooms = _.filter(Memory.nonCombatRooms, (r) => r !== Game.flags[name].pos.roomName);
                log.a(Game.flags[name].pos.roomName + ' removed as a non combat target.');
            }
            return Game.flags[name].remove();
        }
        if (cache[Game.flags[name].pos.roomName]) {
            let op = cache[Game.flags[name].pos.roomName];
            op.tick = Game.time;
            op.priority = 1;
            op.level = 1;
            op.manual = true;
            cache[Game.flags[name].pos.roomName] = op;
            Memory.targetRooms = cache;
            Game.flags[name].remove();
            continue;
        }
        // Manual Aux
        cache = Memory.auxiliaryTargets || {};
        if (_.startsWith(name, 'clear')) {
            cache[Game.flags[name].pos.roomName] = {
                type: 'claimClear'
            };
        } else if (_.startsWith(name, 'clean')) {
            cache[Game.flags[name].pos.roomName] = {
                type: 'clean'
            };
        } else if (_.startsWith(name, 'claim')) {
            cache[Game.flags[name].pos.roomName] = {
                type: 'claim'
            };
        } else if (_.startsWith(name, 'scoreCleaner')) {
            cache[Game.flags[name].pos.roomName] = {
                type: 'scoreCleaner'
            };
        }
        // Abandon a room
        if (_.startsWith(name, 'abandon')) {
            abandon(Game.flags[name].pos.roomName)
            return Game.flags[name].remove();
        }
        if (cache[Game.flags[name].pos.roomName]) {
            let op = cache[Game.flags[name].pos.roomName];
            op.tick = Game.time;
            op.priority = 1;
            op.level = 1;
            op.manual = true;
            cache[Game.flags[name].pos.roomName] = op;
            Memory.auxiliaryTargets = cache;
            Game.flags[name].remove();
        }
    }
}

function nukeFlag(flag) {
    let nuker = _.filter(Game.structures, (s) => s.structureType === STRUCTURE_NUKER && !s.store.getFreeCapacity(RESOURCE_ENERGY) && !s.store.getFreeCapacity(RESOURCE_GHODIUM) && !s.cooldown && Game.map.getRoomLinearDistance(s.room.name, flag.pos.roomName) <= 10)[0];
    if (!nuker) {
        log.e('Nuke request for room ' + flag.pos.roomName + ' denied, no nukes found in-range.');
        flag.remove();
    } else {
        nuker.launchNuke(flag.pos);
        log.a('NUCLEAR LAUNCH DETECTED - ' + flag.pos.roomName + ' ' + flag.pos.x + '.' + flag.pos.y + ' has a nuke inbound from ' + nuker.room.name + ' and will impact in 50,000 ticks.', 'HIGH COMMAND: ');
        flag.remove();
    }
}

function checkForNap(user) {
    // If we have no alliance data return false
    if (!ALLIANCE_DATA || !NAP_ALLIANCE.length || _.includes(Memory._enemies, user)) return false;
    let LOANData = JSON.parse(ALLIANCE_DATA);
    let LOANDataKeys = Object.keys(LOANData);
    for (let iL = (LOANDataKeys.length - 1); iL >= 0; iL--) {
        if (LOANDataKeys[LOANDataKeys[iL]] && LOANDataKeys[LOANDataKeys[iL]].indexOf(user) >= 0 && _.includes(NAP_ALLIANCE, LOANDataKeys[iL])) {
            return true;
        }
    }
    return false;
}

module.exports.operationSustainability = function (room, operationRoom = room.name) {
    let operation;
    if (Memory.targetRooms[operationRoom]) operation = Memory.targetRooms[operationRoom]; else if (Memory.auxiliaryTargets[operationRoom]) operation = Memory.auxiliaryTargets[operationRoom];
    // Switch to pending if safemode
    if (room.controller && room.controller.safeMode) {
        let cache = Memory.targetRooms || {};
        let tick = Game.time;
        cache[operationRoom] = {
            tick: tick,
            type: 'pending',
            dDay: tick + room.controller.safeMode,
        };
        // Set no longer needed creeps to go recycle
        _.filter(Game.creeps, (c) => c.my && c.memory.destination && c.memory.destination === room.name && c.memory.military).forEach((c) => c.memory.recycle = true);
        log.a(room.name + ' is now marked as Pending as it has a safemode.', 'OPERATION PLANNER: ');
        if (Memory.targetRooms[operationRoom]) Memory.targetRooms = cache; else if (Memory.auxiliaryTargets[operationRoom]) Memory.auxiliaryTargets = cache;
        return;
    }
    if (!operation || operation.sustainabilityCheck === Game.time) return;
    let friendlyDead = operation.friendlyDead || 0;
    let trackedFriendly = operation.trackedFriendly || [];
    let friendlyTombstones = _.filter(room.tombstones, (s) => _.includes(FRIENDLIES, s.creep.owner.username));
    for (let tombstone of friendlyTombstones) {
        if (_.includes(trackedFriendly, tombstone.id) || tombstone.creep.ticksToLive <= 5) continue;
        friendlyDead = friendlyDead + UNIT_COST(tombstone.creep.body);
        trackedFriendly.push(tombstone.id);
    }
    let friendlyForces = _.filter(room.creeps, (c) => c.memory && c.memory.military);
    let enemyForces = _.filter(room.creeps, (c) => !c.memory);
    if (friendlyForces.length === 1 && friendlyForces[0].hits < friendlyForces[0].hitsMax * 0.15 && enemyForces.length && !_.includes(trackedFriendly, friendlyForces[0].id)) {
        friendlyDead = friendlyDead + UNIT_COST(friendlyForces[0].body);
        trackedFriendly.push(friendlyForces[0].id);
    }
    let enemyDead = operation.enemyDead || 0;
    let trackedEnemy = operation.trackedEnemy || [];
    let enemyTombstones = _.filter(room.tombstones, (s) => !_.includes(FRIENDLIES, s.creep.owner.username));
    for (let tombstone of enemyTombstones) {
        if (_.includes(trackedEnemy, tombstone.id) || tombstone.creep.ticksToLive <= 10) continue;
        operation.lastEnemyKilled = Game.time;
        enemyDead = enemyDead + UNIT_COST(tombstone.creep.body);
        trackedEnemy.push(tombstone.id);
    }
    operation.enemyDead = enemyDead;
    operation.friendlyDead = friendlyDead;
    operation.trackedEnemy = trackedEnemy;
    operation.trackedFriendly = trackedFriendly;
    operation.sustainabilityCheck = Game.time;
    if (Memory.targetRooms[operationRoom]) Memory.targetRooms[operationRoom] = operation; else if (Memory.auxiliaryTargets[operationRoom]) Memory.auxiliaryTargets[operationRoom] = operation;
};

module.exports.generateThreat = function (creep) {
    creep.room.cacheRoomIntel();
    let user = Memory.roomCache[creep.room.name].user;
    if (_.includes(FRIENDLIES, user)) return;
    let cache = Memory._userList || {};
    let standing = 50;
    if (cache[user] && (cache[user]['standing'] > 50 || _.includes(FRIENDLIES, user))) standing = cache[user]['standing'];
    cache[user] = {
        standing: standing,
        lastAction: Game.time,
    };
    Memory._badBoyList = cache;
};

// Abandon a room
abandon = function (room) {
    if (!Game.rooms[room]) return log.e(room + ' does not appear to be owned by you.');
    _.filter(Game.creeps, (c) => c.memory && c.memory.overlord === room).forEach((c) => c.suicide());
    for (let key in Game.rooms[room].structures) {
        Game.rooms[room].structures[key].destroy();
    }
    for (let key in Game.rooms[room].constructionSites) {
        Game.rooms[room].constructionSites[key].remove();
    }
    let noClaim = Memory.noClaim || [];
    noClaim.push(room);
    delete Game.rooms[room].memory;
    Game.rooms[room].cacheRoomIntel(true);
    Memory.roomCache[room].noClaim = Game.time + 999999999999;
    Game.rooms[room].controller.unclaim();
};