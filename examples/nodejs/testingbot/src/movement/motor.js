'use strict';

const { degreesBetween, project } = require("../utilities/vectors");
import { HiFiConstants } from "hifi-spatial-audio";

class Motor {
    constructor({bot, start, updatePeriodMs = HiFiConstants.DEFAULT_TRANSMIT_RATE_LIMIT_TIMEOUT_MS}) {
        Object.assign(this, {
            bot, updatePeriodMs,
            position: start
        });            
    }
    start()  { // Calls step every updaterPeriodMs until someone calls stop().
        this.setupNextMotion(this.position);
        this.lastStep = Date.now();
        return this.interval = setInterval(() => this.step(), this.updatePeriodMs); // return truthy
    }
    stop() {
        clearInterval(this.interval);
    }
    setupNextMotion() {
        // This could, e.g., step through a list of "path" steps specified by a config.json.
        throw new Error("Subclasses must define a next motion.");
    }
    step() {
        throw new Error("Subclasses must define a step.");
    }
    updateInterval() { // Don't count on uniform steps under load.
        // Measure and return interval. Save new lastStep
        let now = Date.now(),
            interval = now - this.lastStep;
        this.lastStep = now;
        return interval;
    }
    rotateForward(direction) {
        // We could smoothly rotate this ast some rotational speed, but no requirement to do so just yet.
        let orientationEuler = {}, normal;
        // FIXME: how do we test this?
        // E.g., that start is measured from the given axis, about the given, and not reversed like above?

        normal = {x:1, y:0, z:0};
        orientationEuler.pitchDegrees = degreesBetween({x:0, y:0, z:-1}, direction, normal);

        normal = {x:0, y: 1, z:0};
        orientationEuler.yawDegrees = degreesBetween({x:0, y:0, z:-1}, direction, normal);

        // Bots are always "upright" wrt roll.

        this.bot.updateOrientation(orientationEuler);
    }
}
module.exports = Motor;

