import { botsManager } from './botsManager.js';

const express = require('express');
const cors = require('cors');

const app = express();
const port = process.argv[2] || 3000;

app.use(cors());
app.use(express.json());

app.post('/addBots', (req, res) => {
    let responseObject = {
        "status": "ok",
        "requestPath": req.path,
    };
    let numBots = req.body.numBots;
    let botGroupID = req.body.groupID;
    let botsProperties = req.body.properties;
    let addedBots = botsManager.addBots(numBots, botGroupID, botsProperties);

    responseObject.data = addedBots;
    res.send(responseObject);
});

app.get('/listBots', (req, res) => {
    let botsList = botsManager.listBots();

    let responseObject = {
        "status": "ok",
        "requestPath": req.path,
        "data": {
            "botsList": botsList
        },
    };
    res.send(responseObject);
});

app.get('/listConnectionStates', (req, res) => {
    let connectionStatesList = botsManager.listConnectionStates();

    let responseObject = {
        "status": "ok",
        "requestPath": req.path,
        "data": {
            "botsList": connectionStatesList
        },
    };
    res.send(responseObject);
});

app.get(`/getBotStats/:botName`, async (req, res) => {
    var botName = req.params['botName'];
    let botStats = await botsManager.getBotStats(botName);
    let responseObject = {
        "status": "ok",
        "requestPath": req.path,
        "data": {
            "botStats": botStats
        },
    };
    res.send(responseObject);
});

app.delete('/removeBots', (req, res) => {
    let responseObject = {
        "status": "ok",
        "requestPath": req.path,
    };
    let botsToRemove = req.body.botNames;
    let removedBots = botsManager.removeBots(botsToRemove);
    if (!removedBots) {
        responseObject.status = "error";
    } else {
        responseObject.data = {
            "removedBots": removedBots
        };
    }
    res.send(responseObject);
});

app.delete('/removeGroups', (req, res) => {
    let responseObject = {
        "status": "ok",
        "requestPath": req.path,
    };
    let groupsToRemove = req.body.groupIDs;
    let removedGroups = botsManager.removeGroups(groupsToRemove);
    if (!removedGroups) {
        responseObject.status = "error";
    } else {
        responseObject.data = {
            "removedGroups": removedGroups
        };
    }
    res.send(responseObject);
});

app.delete('/removeAll', (req, res) => {
    let responseObject = {
        "status": "ok",
        "requestPath": req.path,
    };
    let removedGroups = botsManager.removeAll();
    if (!removedGroups) {
        responseObject.status = "error";
    } else {
        responseObject.data = {
            "removedBots": removedGroups
        };
    }
    res.send(responseObject);
});

app.listen(port, () => {
    console.info(`${Date.now()}: Bots API server is READY and listening at http://localhost:${port}`);
});