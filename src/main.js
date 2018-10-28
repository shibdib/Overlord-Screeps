//modules
//Setup globals and prototypes
require("require");
let profiler = require('screeps-profiler');
let _ = require('lodash');
let hive = require('main.Hive');
let cleanUp = require('module.Cleanup');
let segments = require('module.segmentManager');
let shib = require("shibBench");
const tickLengthArray = [];
const lastGlobal = Memory.lastGlobalReset || Game.time;
log.e('Global Reset - Last reset occured ' + (Game.time - lastGlobal) + ' ticks ago.');
Memory.lastGlobalReset = Game.time;

module.exports.loop = function() {
    profiler.wrap(function () {
        log.d('Initiating Tick');
        let mainCpu = Game.cpu.getUsed();

        //Logging level
        Memory.loggingLevel = 4; //Set level 1-5 (5 being most info)

        // Get Tick Length
        log.d('Getting Tick Length');
        let d = new Date();
        let seconds = _.round(d.getTime() / 1000, 2);
        let lastTick = Memory.lastTick || seconds;
        Memory.lastTick = seconds;
        let tickLength = seconds - lastTick;
        if (tickLengthArray.length < 50) {
            tickLengthArray.push(tickLength)
        } else {
            tickLengthArray.shift();
            tickLengthArray.push(tickLength)
        }
        Memory.tickLength = average(tickLengthArray);

        //Update allies
        log.d('Updating LOAN List');
        populateLOANlist();

        //Must run modules
        log.d('Utility Modules');
        segments.segmentManager();
        cleanUp.cleanup();

        //Bucket Check
        log.d('Bucket Check');
        if (Memory.cooldown) {
            if (Memory.cooldown + 25 < Game.time) {
                delete Memory.cooldown;
            } else {
                let countDown = (Memory.cooldown + 25) - Game.time;
                log.e('On CPU Cooldown For ' + countDown + ' more ticks. Current Bucket ' + Game.cpu.bucket);
                return;
            }
        }
        if (Game.cpu.bucket < Game.cpu.limit * 10) {
            Memory.cooldown = Game.time;
            log.e('Skipping tick ' + Game.time + ' due to lack of CPU.');
            return;
        }

        //Hive Mind
        log.d('Initiate Hive');
        hive.hiveMind();

        log.d('Benchmark Processed');
        shib.shibBench('Total', mainCpu);
        shib.processBench();
    });
};

requestBench = function (ticks, notify = false) {
    delete Memory._benchmark;
    Memory.reportBench = Game.time + ticks;
    Memory.reportBenchNotify = notify;
    log.a('Benchmark Queued');
};

currentStats = function (notify = false) {
    let sorted = _.sortBy(Memory._benchmark, 'avg');
    log.e('---------------------------------------------------------------------------');
    log.e('~~~~~BENCHMARK REPORT~~~~~');
    if (notify) Game.notify('~~~~~BENCHMARK REPORT~~~~~');
    let totalTicks;
    let overallAvg;
    let bucketAvg;
    let bucketTotal;
    for (let key in sorted) {
        if (sorted[key]['title'] === 'Total') {
            totalTicks = sorted[key]['tickCount'];
            overallAvg = sorted[key]['avg'];
            continue;
        }
        if (sorted[key]['title'] === 'bucket') {
            bucketAvg = sorted[key]['avg'];
            bucketTotal = sorted[key]['used'];
            continue;
        }
        log.a(sorted[key]['title'] + ' - Was Used ' + sorted[key]['useCount'] + ' times. ||| Average CPU Used: ' + _.round(sorted[key]['avg'], 3) + '. ||| Total CPU Used: ' + _.round(sorted[key]['avg'] * sorted[key]['useCount'], 3) + '. ||| Peak CPU Used: ' + _.round(sorted[key]['max'], 3));
        if (notify) Game.notify(sorted[key]['title'] + ' - Was Used ' + sorted[key]['useCount'] + ' times. ||| Average CPU Used: ' + _.round(sorted[key]['avg'], 3) + '. ||| Total CPU Used: ' + _.round(sorted[key]['avg'] * sorted[key]['useCount'], 3) + '. ||| Peak CPU Used: ' + _.round(sorted[key]['max'], 3));
    }
    log.e('Ticks Covered: ' + totalTicks + '. Average CPU Used: ' + _.round(overallAvg, 3));
    log.e('Total Bucket Used: ' + bucketTotal + '. Current Bucket: ' + Game.cpu.bucket);
    log.e('---------------------------------------------------------------------------');
    if (notify) Game.notify('Ticks Covered: ' + totalTicks + '. Average CPU Used: ' + _.round(overallAvg, 3));
    if (notify) Game.notify('Total Bucket Used: ' + bucketTotal + '. Current Bucket: ' + Game.cpu.bucket);
};

resetBench = function () {
    delete Memory._benchmark;
    delete Memory.reportBench;
    delete Memory.reportBenchNotify;
    log.a('Benchmarks Reset');
};

abandon = function (room) {
    if (!Game.rooms[room] || !Game.rooms[room].memory.extensionHub) return log.e(room + ' does not appear to be owned by you.');
    for (let key in Game.rooms[room].creeps) {
        Game.rooms[room].creeps[key].suicide();
    }
    let overlordFor = _.filter(Game.creeps, (c) => c.memory && c.memory.overlord === room);
    for (let key in overlordFor) {
        overlordFor[key].suicide();
    }
    for (let key in Game.rooms[room].structures) {
        Game.rooms[room].structures[key].destroy();
    }
    for (let key in Game.rooms[room].constructionSites) {
        Game.rooms[room].constructionSites[key].remove();
    }
    delete Game.rooms[room].memory;
    Game.rooms[room].controller.unclaim();
};

nukes = function (target) {
    let nukes = _.filter(Game.structures, (s) => s.structureType === STRUCTURE_NUKER && s.energy === s.energyCapacity && s.ghodium === s.ghodiumCapacity && !s.cooldown);
    if (target) nukes = _.filter(Game.structures, (s) => s.structureType === STRUCTURE_NUKER && s.energy === s.energyCapacity && s.ghodium === s.ghodiumCapacity && !s.cooldown && Game.map.getRoomLinearDistance(s.room.name, target) <= 10);
    if (!nukes.length && !target) return log.a('No nukes available');
    if (!nukes.length && target) return log.a('No nukes available in range of ' + target);
    for (let key in nukes) {
        if (target) log.a(nukes[key].room.name + ' has a nuclear missile available that is in range of ' + target);
        if (!target) log.a(nukes[key].room.name + ' has a nuclear missile available.')
    }
};

status = function (roomName = undefined, creep = false) {
    if (!roomName) {
        log.e('---------------------------------------------------------------------------');
        log.e('--GLOBAL INFO--');
        log.e('GCL - ' + Game.gcl.level + ' | GCL Progress - ' + (_.round(Game.gcl.progress, 0)) + '/' + (_.round(Game.gcl.progressTotal, 0)) + ' | Creep Count - ' + _.size(Game.creeps));
        log.e('--ROOM INFO--');
        for (let key in Memory.ownedRooms) {
            let activeRoom = Memory.ownedRooms[key];
            let averageEnergy = _.round(average(roomEnergyArray[activeRoom.name]), 0);
            let roomCreeps = _.filter(Game.creeps, (c) => c.memory && c.memory.overlord === activeRoom.name);
            log.e(global.roomLink(activeRoom.name) + ' | RCL - ' + activeRoom.controller.level + ' | CPU Usage - ' + (_.round(average(roomCpuArray[activeRoom.name]), 2)) + ' | RCL Progress - ' + (activeRoom.controller.progress) + '/' + (activeRoom.controller.progressTotal) + ' | Avg. Energy Available - ' + averageEnergy + ' | Creep Count: ' + _.size(roomCreeps));
        }
        if (Memory.targetRooms && _.size(Memory.targetRooms)) {
            log.e('--OPERATION INFO--');
            for (let key in Memory.targetRooms) {
                let level = Memory.targetRooms[key].level || 1;
                let type = Memory.targetRooms[key].type;
                let priority = Memory.targetRooms[key].priority || 4;
                if (Memory.targetRooms[key].enemyDead || Memory.targetRooms[key].friendlyDead) {
                    log.e(_.capitalize(type) + ' | Level - ' + level + ' | Priority - ' + priority + ' | Room ' + global.roomLink(key) + ' | Enemy KIA - ' + Memory.targetRooms[key].trackedEnemy.length + '/' + Memory.targetRooms[key].enemyDead + ' | Friendly KIA - ' + Memory.targetRooms[key].trackedFriendly.length + '/' + Memory.targetRooms[key].friendlyDead);
                } else {
                    log.e(_.capitalize(type) + ' | Level - ' + level + ' | Priority - ' + priority + ' | Room ' + global.roomLink(key));
                }
            }
        }
        return log.e('---------------------------------------------------------------------------');
    } else if (!creep) {
        let activeRoom = Game.rooms[roomName];
        if (!activeRoom) return log.e('No Data Found');
        log.e('---------------------------------------------------------------------------');
        log.e('--ROOM INFO--');
        let averageEnergy = _.round(average(roomEnergyArray[activeRoom.name]), 0);
        let roomCreeps = _.filter(Game.creeps, (c) => c.memory && c.memory.overlord === activeRoom.name);
        log.e(global.roomLink(activeRoom.name) + ' | RCL - ' + activeRoom.controller.level + ' | CPU Usage - ' + (_.round(average(roomCpuArray[activeRoom.name]), 2)) + ' | RCL Progress - ' + (activeRoom.controller.progress) + '/' + (activeRoom.controller.progressTotal) + ' | Avg. Energy Available - ' + averageEnergy + ' | Creep Count: ' + _.size(roomCreeps));
        log.e('--TASK CPU INFO--');
        for (let key in taskCpuArray[roomName]) {
            log.e(_.capitalize(key) + ' Avg. CPU - ' + _.round(average(taskCpuArray[roomName][key]), 2));
        }
        log.e('---------------------------------------------------------------------------');
    } else {
        let activeRoom = Game.rooms[roomName];
        if (!activeRoom) return log.e('No Data Found');
        log.e('---------------------------------------------------------------------------');
        log.e('--ROOM INFO--');
        let averageEnergy = _.round(average(roomEnergyArray[activeRoom.name]), 0);
        let roomCreeps = _.filter(Game.creeps, (c) => c.memory && c.memory.overlord === activeRoom.name);
        log.e(global.roomLink(activeRoom.name) + ' | RCL - ' + activeRoom.controller.level + ' | CPU Usage - ' + (_.round(average(roomCpuArray[activeRoom.name]), 2)) + ' | RCL Progress - ' + (activeRoom.controller.progress) + '/' + (activeRoom.controller.progressTotal) + ' | Avg. Energy Available - ' + averageEnergy + ' | Creep Count: ' + _.size(roomCreeps));
        log.e('--CREEP CPU INFO--');
        for (let key in roomCreepCpuObject[roomName]) {
            log.e(_.capitalize(key) + ' in ' + global.roomLink(Game.creeps[key].room.name) + ' | Avg. CPU - ' + _.round(average(roomCreepCpuObject[roomName][key]), 2));
        }
        log.e('---------------------------------------------------------------------------');
    }
};