'use strict';

const AudioSource = require('./audioSource');

const DEBUG = false;
const twoPi = 2 * Math.PI;

class SineSource extends AudioSource {
    constructor({frequency = 440, ...options} = {}) {
        super(options);
        this.frequency = frequency;
    }
    load() {
        super.load();
        if (DEBUG) console.log(this.bot.botIndex, `Sine wave at ${this.frequency} hz, maxValue ${this.maxValue}.`);
    }
    computeSample(frameWithinData, channelNumber, sampleNumber, elapsedTime) {
        return Math.sin(twoPi * this.frequency * elapsedTime) * this.maxValue;
    }
}
module.exports = SineSource;

