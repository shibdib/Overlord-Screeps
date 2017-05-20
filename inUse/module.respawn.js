/**
 * Created by rober on 5/16/2017.
 */

const respawnCreeps = {
    /**   *
     * @param room
     */
    run: function (spawnName) {

////////////////////////////////////////////Vars//////////////////////////////////////////////////

//Total creeps
        var totalCreeps = _.filter(Game.creeps, (creep) => creep.memory.role !== null && creep.room === Game.spawns[spawnName].room);

//Peasant Creeps
        var peasants = _.filter(Game.creeps, (creep) => creep.memory.role === 'peasant' && creep.room === Game.spawns[spawnName].room);
        var peasantBuilders = _.filter(Game.creeps, (creep) => creep.memory.role === 'peasantBuilder' && creep.room === Game.spawns[spawnName].room);
        var peasantUpgraders = _.filter(Game.creeps, (creep) => creep.memory.role === 'peasantUpgrader' && creep.room === Game.spawns[spawnName].room);

//Stationary Creeps
        var stationaryHarvester = _.filter(Game.creeps, (creep) => creep.memory.role === 'stationaryHarvester' && creep.room === Game.spawns[spawnName].room);
        var stationaryBuilders = _.filter(Game.creeps, (creep) => creep.memory.role === 'stationaryBuilder' && creep.room === Game.spawns[spawnName].room);

//Worker Creeps
        var worker = _.filter(Game.creeps, (creep) => creep.memory.role === 'worker' && creep.room === Game.spawns[spawnName].room);
        var upgraders = _.filter(Game.creeps, (creep) => creep.memory.role === 'upgrader' && creep.room === Game.spawns[spawnName].room);
        var wallRepairers = _.filter(Game.creeps, (creep) => creep.memory.role === 'wallRepairer' && creep.room === Game.spawns[spawnName].room);
        var remoteHarvester = _.filter(Game.creeps, (creep) => creep.memory.role === 'remoteHarvester' && creep.room === Game.spawns[spawnName].room);

//Hauling Creeps
        var haulers = _.filter(Game.creeps, (creep) => creep.memory.role === 'hauler' && creep.room === Game.spawns[spawnName].room);
        var expediters = _.filter(Game.creeps, (creep) => creep.memory.role === 'expediter' && creep.room === Game.spawns[spawnName].room);
        var dumpTrucks = _.filter(Game.creeps, (creep) => creep.memory.role === 'dumpTruck' && creep.room === Game.spawns[spawnName].room);
        var remoteHauler = _.filter(Game.creeps, (creep) => creep.memory.role === 'remoteHauler' && creep.room === Game.spawns[spawnName].room);
        var basicHauler = _.filter(Game.creeps, (creep) => creep.memory.role === 'basicHauler' && creep.room === Game.spawns[spawnName].room);

//Combat Creeps
        var rangedDefenders = _.filter(Game.creeps, (creep) => creep.memory.role === 'rangedDefender' && creep.room === Game.spawns[spawnName].room);
        var defenders = _.filter(Game.creeps, (creep) => creep.memory.role === 'defender' && creep.room === Game.spawns[spawnName].room);
        var scout = _.filter(Game.creeps, (creep) => creep.memory.role === 'scout' && creep.room === Game.spawns[spawnName].room);
        var attackers = _.filter(Game.creeps, (creep) => creep.memory.role === 'attacker' && creep.room === Game.spawns[spawnName].room);

//MISC
        var sourceCount = Game.spawns[spawnName].room.find(FIND_SOURCES);
        var containers = Game.spawns[spawnName].room.find(FIND_STRUCTURES, {
            filter: {structureType: STRUCTURE_CONTAINER}
        });
        var roomEnergyCapacity = Game.spawns[spawnName].room.energyCapacityAvailable;
        var roomEnergy = Game.spawns[spawnName].room.energyAvailable;

        ///////////////////////////////////////////////COUNT TO CONSOLE///////////////////////////////////////

        /**console.log('Creep Count');
         console.log('Harvesters: ' + stationaryHarvester.length);
         console.log('Remote Harvesters: ' + remoteHarvester.length);
         console.log('Remote Haulers: ' + remoteHauler.length);
         console.log('Builders: ' + stationaryBuilders.length);
         console.log('Workers: ' + worker.length);
         console.log('Upgraders: ' + upgraders.length);
         console.log('Haulers: ' + haulers.length);
         console.log('Expediters: ' + expediters.length);
         console.log('Dump Trucks: ' + dumpTrucks.length);**/

        ////////////////////////////////////////////Respawns//////////////////////////////////////////////////
        if (Game.spawns[spawnName].room.find(FIND_MY_SPAWNS)) {
            if (!Game.spawns[spawnName].spawning) {
                //Always have 2 basic peasants
                if (peasants.length < 2 && Game.spawns[spawnName].canCreateCreep([WORK, CARRY, CARRY, MOVE, MOVE]) === OK) {
                    Game.spawns[spawnName].createCreep([WORK, CARRY, CARRY, MOVE, MOVE], undefined, {role: 'peasant'});
                    console.log('Spawning a peasant');
                    return;
                }
                //ERRBODY DEAD?? Build basic builders/upgraders
                if (totalCreeps.length <= 2 || Game.spawns[spawnName].room.memory.peasant === true) {
                    Game.spawns[spawnName].room.memory.peasant = true;
                    if (peasantBuilders.length < 2 && Game.spawns[spawnName].canCreateCreep([WORK, CARRY, CARRY, MOVE, MOVE]) === OK) {
                        Game.spawns[spawnName].createCreep([WORK, CARRY, CARRY, MOVE, MOVE], undefined, {role: 'peasantBuilder'});
                        console.log('Spawning a peasantBuilder');
                        return;
                    }
                    if (peasantUpgraders.length < 1 && Game.spawns[spawnName].canCreateCreep([WORK, CARRY, CARRY, MOVE, MOVE]) === OK) {
                        Game.spawns[spawnName].createCreep([WORK, CARRY, CARRY, MOVE, MOVE], undefined, {role: 'peasantUpgrader'});
                        console.log('Spawning a peasantUpgrader');
                    }
                }
                if (totalCreeps.length > 2) {
                    if (totalCreeps.length > 8) {
                        //Kill peasantBuilders and upgraders
                        Game.spawns[spawnName].room.memory.peasant = false;
                        for (let i = 0; i < peasantBuilders.length; i++) {
                            peasantBuilders[i].suicide();
                        }
                        for (let i = 0; i < peasantUpgraders.length; i++) {
                            peasantUpgraders[i].suicide();
                        }
                    }

                    //ATTACK RESPAWNS
                    for (let i = 0; i < 5; i++) {
                        let attack = 'attack' + i;
                        if (Game.flags[attack]) {
                            if (attackers.length < 4 && Game.spawns[spawnName].canCreateCreep([TOUGH, TOUGH, ATTACK, ATTACK, MOVE, MOVE]) === OK) {
                                Game.spawns[spawnName].createCreep([TOUGH, TOUGH, ATTACK, ATTACK, MOVE, MOVE], undefined, {
                                    role: 'attacker'
                                });
                                console.log('Spawning a attacker');
                                return;
                            }
                        }
                    }

                    //DEFENSE RESPAWNS
                    if (Game.flags.combatBuild) {
                        if (rangedDefenders.length < 3 && Game.spawns[spawnName].canCreateCreep([RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, MOVE]) === OK) {
                            Game.spawns[spawnName].createCreep([RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, MOVE], undefined, {role: 'rangedDefender'});
                            console.log('Spawning a rangedDefender');
                            return;
                        } else if (defenders.length < 4 && Game.spawns[spawnName].canCreateCreep([ATTACK, ATTACK, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE]) === OK) {
                            Game.spawns[spawnName].createCreep([ATTACK, ATTACK, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE], undefined, {role: 'defender'});
                            console.log('Spawning a defender');
                            return;
                        }
                    }

                    //HAULER RESPAWNS
                    if (Game.flags.haulerBuild) {
                        if (expediters.length < containers.length && stationaryHarvester.length >= 1 && Game.spawns[spawnName].canCreateCreep([CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]) === OK) {
                            Game.spawns[spawnName].createCreep([CARRY, CARRY, CARRY, MOVE, MOVE, MOVE], undefined, {role: 'expediter'});
                            console.log('Spawning a expediter');
                            return;
                        } else if (haulers.length < containers.length && Game.spawns[spawnName].canCreateCreep([CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]) === OK) {
                            Game.spawns[spawnName].createCreep([CARRY, CARRY, CARRY, MOVE, MOVE, MOVE], undefined, {role: 'hauler'});
                            console.log('Spawning a hauler');
                            return;
                        } else if (dumpTrucks.length < stationaryBuilders.length + upgraders.length && stationaryHarvester.length >= 1 && Game.spawns[spawnName].canCreateCreep([CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]) === OK) {
                            Game.spawns[spawnName].createCreep([CARRY, CARRY, CARRY, MOVE, MOVE, MOVE], undefined, {role: 'dumpTruck'});
                            console.log('Spawning a dumpTruck');
                            return;
                        } else if (basicHauler.length < 1 && Game.spawns[spawnName].canCreateCreep([CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]) === OK) {
                            Game.spawns[spawnName].createCreep([CARRY, CARRY, CARRY, MOVE, MOVE, MOVE], undefined, {role: 'basicHauler'});
                            console.log('Spawning a basicHauler');
                            return;
                        }
                    }

                    //HARVESTER RESPAWNS
                    if (Game.flags.harvesterBuild) {
                        if (stationaryHarvester.length < sourceCount.length && Game.spawns[spawnName].canCreateCreep([WORK, WORK, WORK, WORK, WORK, WORK, MOVE]) === OK) {
                            Game.spawns[spawnName].createCreep([WORK, WORK, WORK, WORK, WORK, WORK, MOVE], undefined, {role: 'stationaryHarvester'});
                            console.log('Spawning a stationaryHarvester');
                            return;
                        }
                        if (stationaryHarvester.length < sourceCount.length && roomEnergyCapacity >= 550 && roomEnergyCapacity < 650 && Game.spawns[spawnName].canCreateCreep([WORK, WORK, WORK, WORK, WORK, MOVE]) === OK) {
                            Game.spawns[spawnName].createCreep([WORK, WORK, WORK, WORK, WORK, MOVE], undefined, {role: 'stationaryHarvester'});
                            console.log('Spawning a stationaryHarvester');
                            return;
                        }
                        if (stationaryHarvester.length < Math.ceil(sourceCount.length * 3) && roomEnergyCapacity < 550 && Game.spawns[spawnName].canCreateCreep([WORK, WORK, MOVE]) === OK) {
                            Game.spawns[spawnName].createCreep([WORK, WORK, MOVE], undefined, {role: 'stationaryHarvester'});
                            console.log('Spawning a stationaryHarvester');
                            return;
                        }
                    }

                    //WORKER RESPAWNS
                    if (Game.flags.workerBuild && stationaryHarvester.length >= 1 ) {
                        if (worker.length < 3 && Game.spawns[spawnName].canCreateCreep([CARRY, WORK, WORK, MOVE]) === OK) {
                            Game.spawns[spawnName].createCreep([CARRY, WORK, WORK, MOVE], undefined, {role: 'worker'});
                            console.log('Spawning a worker');
                            return;
                        } else if (upgraders.length < 1 && Game.spawns[spawnName].canCreateCreep([CARRY, CARRY, CARRY, WORK, WORK, WORK, MOVE]) === OK) {
                            Game.spawns[spawnName].createCreep([CARRY, CARRY, CARRY, WORK, WORK, WORK, MOVE], undefined, {role: 'upgrader'});
                            console.log('Spawning a upgrader');
                            return;
                        } else if (wallRepairers.length < 1 && Game.spawns[spawnName].canCreateCreep([CARRY, WORK, WORK, MOVE]) === OK) {
                            Game.spawns[spawnName].createCreep([CARRY, WORK, WORK, MOVE], undefined, {role: 'wallRepairer'});
                            console.log('Spawning a wallRepairer');
                            return;
                        }
                    }

                    //BUILDER RESPAWNS
                    if (Game.flags.builderBuild && stationaryHarvester.length >= 1 ) {
                        let constructionSites = sources = Game.spawns[spawnName].room.find(FIND_CONSTRUCTION_SITES, {filter: (s) => s.structureType !== STRUCTURE_WALL || STRUCTURE_ROAD || STRUCTURE_RAMPART});
                        if (roomEnergyCapacity >= 450) {
                            if (constructionSites.length === 0 && stationaryBuilders.length < 2 && Game.spawns[spawnName].canCreateCreep([CARRY, CARRY, WORK, WORK, WORK, MOVE]) === OK) {
                                Game.spawns[spawnName].createCreep([CARRY, CARRY, WORK, WORK, WORK, MOVE], undefined, {role: 'stationaryBuilder'})
                                console.log('Spawning a stationaryBuilder');
                                return;
                            } else if (stationaryBuilders.length < Math.ceil(constructionSites.length / 3) && stationaryBuilders.length < 5 && Game.spawns[spawnName].canCreateCreep([CARRY, CARRY, WORK, WORK, WORK, MOVE]) === OK) {
                                Game.spawns[spawnName].createCreep([CARRY, CARRY, WORK, WORK, WORK, MOVE], undefined, {role: 'stationaryBuilder'});
                                console.log('Spawning a stationaryBuilder');
                                return;
                            }
                        }
                        if (roomEnergyCapacity < 450) {
                            if (constructionSites.length === 0 && stationaryBuilders.length < 2 && Game.spawns[spawnName].canCreateCreep([CARRY, CARRY, CARRY, WORK, MOVE]) === OK) {
                                Game.spawns[spawnName].createCreep([CARRY, CARRY, CARRY, WORK, MOVE], undefined, {role: 'stationaryBuilder'})
                                console.log('Spawning a stationaryBuilder');
                                return;
                            } else if (stationaryBuilders.length < Math.ceil(constructionSites.length / 3)  && stationaryBuilders.length < 5 && Game.spawns[spawnName].canCreateCreep([CARRY, CARRY, CARRY, WORK, MOVE]) === OK) {
                                Game.spawns[spawnName].createCreep([CARRY, CARRY, CARRY, WORK, MOVE], undefined, {role: 'stationaryBuilder'});
                                console.log('Spawning a stationaryBuilder');
                                return;
                            }
                        }
                    }

                    //REMOTE RESPAWN
                    if (Game.flags.remoteBuild && stationaryHarvester.length >= 1 ) {
                        for (let i = 0; i < 5; i++) {
                            let remote = 'remote' + i;
                            if (Game.flags[remote]) {
                                let creep = _.filter(Game.creeps, (creep) => creep.memory.destination === remote);
                                if (creep.length === 0 && Game.spawns[spawnName].canCreateCreep([CARRY, CARRY, CARRY, CARRY, WORK, WORK, WORK, MOVE, MOVE, MOVE]) === OK) {
                                    Game.spawns[spawnName].createCreep([CARRY, CARRY, CARRY, CARRY, WORK, WORK, WORK, MOVE, MOVE, MOVE], undefined, {
                                        role: 'remoteHarvester',
                                        destination: remote
                                    });
                                    console.log('Spawning a remoteHarvester');
                                    return;
                                }
                            }
                        }
                        if (remoteHauler.length < remoteHarvester.length && Game.spawns[spawnName].canCreateCreep([CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE]) === OK) {
                            Game.spawns[spawnName].createCreep([CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE], undefined, {role: 'remoteHauler'});
                            console.log('Spawning a remoteHauler');
                            return;
                        }
                    }

                    //SCOUT RESPAWNS
                    if (Game.flags.scoutBuild && stationaryHarvester.length >= 1 ) {
                        for (let i = 0; i < 5; i++) {
                            let scout = 'scout' + i;
                            if (Game.flags[scout]) {
                                let creep = _.filter(Game.creeps, (creep) => creep.memory.destination === scout);
                                if (creep.length === 0 && Game.spawns[spawnName].canCreateCreep([MOVE, MOVE, MOVE, MOVE]) === OK) {
                                    Game.spawns[spawnName].createCreep([MOVE, MOVE, MOVE, MOVE], undefined, {
                                        role: 'scout',
                                        destination: scout
                                    });
                                    console.log('Spawning a scout');
                                    return;
                                }
                            }
                        }
                    }
                }
            } else if (Game.spawns[spawnName].spawning) {
                let spawningCreep = Game.creeps[Game.spawns[spawnName].spawning.name];
                Game.spawns[spawnName].room.visual.text(
                    '🛠️' + spawningCreep.memory.role,
                    Game.spawns[spawnName].pos.x + 1,
                    Game.spawns[spawnName].pos.y,
                    {align: 'left', opacity: 0.8});
            }
        }
    }
}
module.exports = respawnCreeps;
