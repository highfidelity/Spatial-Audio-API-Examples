"use strict";

const { promisify } = require("util");
const readFile = promisify(require("fs").readFile);
const fetch = require("make-fetch-happen").defaults({
    cacheManager: __dirname + "/cache"
});
const decode = require("audio-decode");
const format = require("audio-format");
const convert = require("pcm-convert");
const AudioSource = require("./audioSource");

const DEBUG = false;

class MediaSource extends AudioSource {
    constructor({url, ...options} = {}) {
        super(options);
        this.url = url;
    }
    get url() { return this._url; }
    set url(url) {
        this.pause();
        this._url = url.href || url;  // Accept either a URL or a string, but store a string.
        this.stroke = null;
        this.readyState = 0;
    }
    async load() {
        this.pause();
        const url = new URL(this.url);
        const start = new Date().getTime(),
              buffer = (url.protocol === 'file:') ? await readFile(url) : await fetch(url.href).then(response => response.buffer()),
              fetched = new Date().getTime(),
              audioBuffer = await decode(buffer),
              decoded = new Date().getTime(),
              parsed = format.detect(audioBuffer),
              converted = convert(audioBuffer, parsed, 'int16');

        // Save the named data.
        const {numberOfChannels, sampleRate, length, duration} = audioBuffer;
        Object.assign(this, {numberOfChannels, sampleRate, length, duration, converted});

        super.load();
        if (DEBUG) this.bot.log({
            url: url.href,
            numberOfChannels, sampleRate, length, duration,
            fetch: fetched - start,
            decode: decoded - fetched
        });
    }
    computeSample(frameWithinData, channelNumber, sampleNumber, elapsedTime) {
        const {numberOfChannels, converted} = this;
        return converted[sampleNumber * numberOfChannels + channelNumber] || 0;
    }
}
module.exports = MediaSource;

