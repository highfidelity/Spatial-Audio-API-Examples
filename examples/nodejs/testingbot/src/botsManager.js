'use strict';

import { BotUtilities } from "./utilities/botUtils.js"

const Bot = require("./bot");
const fs = require('fs');
const DEFAULT_BOT_PROPERTIES = {
    numBots: 3,
    audio: 330,
    measure: '',
    motor: 'RandomBoundedMovement',
    x: 0,
    y: 0,
    z: 0,
    gain: 1,
    volume: 1,
    groupID: '',
    serverShouldSendUserData: true,
    runtimeSeconds: 0,
    jwt: '',
    app_id: '',
    space_id: '',
    stackName: '',
    secret: ''
};

class BotsManager {
    constructor() {
        this.allBots = [];
        this.groupsList = [];
    }

    addBots(numBots = 1, groupID = BotUtilities.generateUUID(), groupProperties = {}) {
        console.log(`ADDING ${numBots} BOTS TO GROUP ${groupID}`);
        if (this.groupsList.indexOf(groupID) > -1) {
            console.warn("That group name is taken, please try again.");
            return;
        }
        this.groupsList.push(groupID);
        let addedBotIDs = [];

        groupProperties.groupID = groupID;

        let localAudioFilenames = [];
        if (groupProperties.audio.indexOf(`file`) > -1) {
            fs.readdirSync("./src/audio/", { "withFileTypes": true }).forEach((dirObj) => {
                if (dirObj.isFile()) {
                    localAudioFilenames.push(dirObj.name);
                }
            });
        }

        for (let botIndex = 0; botIndex < numBots; botIndex++) {
            let botOptions = {
                groupID: groupID
            };
            Object.keys(DEFAULT_BOT_PROPERTIES).filter(key => key !== `groupID`).forEach(propertyName => {
                let presetValue = groupProperties[propertyName];
                if (presetValue) {
                    let groupPresetsHasEnough = botIndex < presetValue.length;
                    botOptions[propertyName] = groupPresetsHasEnough ? presetValue[botIndex] : presetValue[0];
                } else {
                    botOptions[propertyName] = DEFAULT_BOT_PROPERTIES[propertyName]; // Get from defaults.
                }
            });
            if (botOptions.audio === `file`) {
                let fileNumber = Math.floor(Math.random() * localAudioFilenames.length);
                botOptions.audio = localAudioFilenames[fileNumber];
            }
            botOptions.name = `Bot ${botIndex} Group ${groupProperties.groupID}`;
            let bot = new Bot({ botIndex, ...botOptions });

            this.allBots.push(bot);
            bot.start();

            addedBotIDs.push(bot.name);
        }

        return {
            groupID: groupID,
            bots: addedBotIDs
        };
    }

    listBots() {
        let allBotsList = {};
        this.allBots.forEach(bot => {
            if (!allBotsList[bot.groupID]) {
                allBotsList[bot.groupID] = [];
            }
            allBotsList[bot.groupID].push(bot.name);
        });
        return allBotsList;
    }

    listConnectionStates() {
        let botsStateData = {};
        this.allBots.forEach((bot) => {
            if (!botsStateData[bot.groupID]) {
                botsStateData[bot.groupID] = {}
            }
            let peer = bot.raviSession._raviImplementation._rtcConnection,
                botState = peer && peer.connectionState;
            if (!botsStateData[bot.groupID][botState]) {
                botsStateData[bot.groupID][botState] = 1;
            } else {
                botsStateData[bot.groupID][botState]++;
            }
        });
        return botsStateData;
    }

    async getBotStats(botName) {
        let stats;
        for (let bot of this.allBots) {
            if (bot.name === botName) {
                stats = bot.bandwidthMeasurement ? await bot.bandwidthMeasurement.generateStatsSet() : "This bot is not measuring stats.";
            }
        };
        stats = stats ? stats : "This bot does not exist.";
        return stats;
    }

    removeBots(botsToRemove) {
        let removedBots = [];
        botsToRemove.forEach((botName) => {
            for (let i = this.allBots.length - 1; i > -1; i--) {
                if (this.allBots[i].name === botName) {
                    this.allBots[i].stop();
                    this.allBots.splice(i, 1);
                    removedBots.push(botName);
                }
            };
        });
        return removedBots;
    }

    removeGroups(groupsToRemove) {
        let removedGroups = {};
        for (let i = groupsToRemove.length - 1; i > -1; i--) {
            if (this.groupsList.indexOf(groupsToRemove[i]) === -1) {
                removedGroups[groupsToRemove[i]] = "NO GROUP";
            } else {
                removedGroups[groupsToRemove[i]] = 0;
                for (let j = this.allBots.length - 1; j > -1; j--) {
                    if (this.allBots[j].groupID === groupsToRemove[i]) {
                        this.allBots[j].stop();
                        this.allBots.splice(j, 1);
                        removedGroups[groupsToRemove[i]]++;
                    }
                };
            }
            this.groupsList.splice(i, 1);
        };
        return removedGroups;
    }

    removeAll() {
        let removedGroups = this.removeGroups(this.groupsList);
        removedGroups[`remaining`] = 0;

        if (this.allBots.length !== 0) {
            console.warn("Found bots that were not removed by group ID! Removing them now.");
            for (let i = this.allBots.length - 1; i > -1; i--) {
                console.warn("Removing ", this.allBots[i].name, " FROM GROUP ", this.allBots[i].groupID);
                this.allBots[i].stop();
                this.allBots.splice(i, 1);
                removedGroups[`remaining`]++;
            };
        }
        return removedGroups;
    }
}

export let botsManager = new BotsManager();
