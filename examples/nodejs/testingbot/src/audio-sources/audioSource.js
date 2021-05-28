'use strict';

/* A generalization of the RTCAudioSourceSineWave example from wrtc. */

const { RTCAudioSource } = require('wrtc').nonstandard;
const { MediaStream } = require('wrtc');
import { preciseInterval } from 'hifi-spatial-audio';

// As required by wrtc:
const bitsPerSample = 16;
const dataPeriodMs = 10;
const msPerSecond = 1000;
const maxValue = Math.pow(2, bitsPerSample) / 2 - 1;
const dataPerSecond = msPerSecond / dataPeriodMs;

class AudioSource {
    constructor({bot, numberOfChannels = 1, sampleRate = 8000, loop = true} = {}) {
        Object.assign(this, {numberOfChannels, sampleRate, loop, maxValue, bot});
        this.source = new RTCAudioSource();
        this.createStream();
    }
    createTrack()  {
        return this.source.createTrack();
    };
    createStream() {
        this.track = this.createTrack();
        return this.srcObject = new MediaStream([this.track]);
    }
    load() {
        this.readyState = true; // We don't do specific streaming values.
        delete this.stroke;
    }
    pause() {
        this.pump && this.pump.clear();
    };
    finished() {
        this.pause();
        if (this.loop) {
            this.stroke = null;
            this.play();
        }
    }
    async play() {
        if (!this.readyState) {
            await this.load();
        }
        if (!this.stroke) {
            const {numberOfChannels, sampleRate, duration, length} = this; // Set in constructor or by subclass.
            const numberOfFramesPerStroke = sampleRate / dataPerSecond;
            const samples = new Int16Array(numberOfChannels * numberOfFramesPerStroke);
            const secondsPerSample = 1 / sampleRate;

            if (duration && !length) {
                setTimeout(() => this.finished(), duration * msPerSecond);
            }
            const data = {samples, sampleRate, bitsPerSample, channelCount:numberOfChannels, numberOfFrames:numberOfFramesPerStroke}; // reused each onData
            let time = 0, sampleNumber = 0;
            this.stroke = () => {
                const volume = this.bot.volume;
                for (let frameNumber = 0; frameNumber < numberOfFramesPerStroke; frameNumber++, sampleNumber++) {
                    for (let channelNumber = 0; channelNumber < numberOfChannels; channelNumber++) {
                        samples[frameNumber * numberOfChannels + channelNumber] =
                            this.computeSample(frameNumber, channelNumber, sampleNumber, time) * volume;
                    }
                    time += secondsPerSample;
                }
                this.source.onData(data);
                if (length && (sampleNumber > length)) {
                    this.finished();
                }
            }
        }
        this.pump = preciseInterval(this.stroke, dataPeriodMs);
    }
}
module.exports = AudioSource;

