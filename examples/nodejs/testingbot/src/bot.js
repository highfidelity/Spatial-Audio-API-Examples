"use strict";
const {
    MediaStream,
    nonstandard: { RTCAudioSink }
} = require("wrtc");
const { SignJWT } = require('jose/dist/node/cjs/jwt/sign');
const { UnsecuredJWT } = require('jose/dist/node/cjs/jwt/unsecured');
const crypto = require("crypto");

const SineSource = require("./audio-sources/sineSource");
const MediaSource = require("./audio-sources/mediaSource");

const DEBUG = false;

import {
    HiFiAudioAPIData,
    Point3D,
    OrientationEuler3D,
    HiFiCommunicator,
    HiFiConstants
} from "hifi-spatial-audio";

const minimumTransmissionPeriodAllowedByAPI = 100; // Should we expose this from the API as an exported constant?

class Bot {
    constructor({
        x = 0,
        y = 0,
        z = 0,
        rollDegrees = 0,
        pitchDegrees = 0,
        yawDegrees = 0,
        volume = 1,
        serverShouldSendUserData = true,
        transmitRateLimitTimeoutMS = HiFiConstants.DEFAULT_TRANSMIT_RATE_LIMIT_TIMEOUT_MS,
        motor,
        ...options
    } = {}) {
        // yargs parses an arg of 1.5 as number, but 0.5 as a string, so deal with it by parsing again here.
        let initialPosition = new Point3D({ x: parseFloat(x), y: parseFloat(y), z: parseFloat(z) });
        if (motor) {
            let { type, updatePeriodMs = HiFiConstants.DEFAULT_TRANSMIT_RATE_LIMIT_TIMEOUT_MS, ...motorOptions }
                = motor.type ? motor :
                    // Default x/z is arbitrary, specific to speakeasy and RandomBoundedMovement,
                    // and works best with the default map size (43x43m).
                    { type: motor, x: [-20, 20], z: [-20, 20] },
                implementation = require("./movement/" + type);
            transmitRateLimitTimeoutMS = Math.max(HiFiConstants.MIN_TRANSMIT_RATE_LIMIT_TIMEOUT_MS,
                Math.min(updatePeriodMs, transmitRateLimitTimeoutMS));
            this.motor = new implementation({ bot: this, start: initialPosition, updatePeriodMs, ...motorOptions });
        }
        Object.assign(this, options, { volume: parseFloat(volume), groupID: options.groupID }); // see above re yargs
        if (!this.name) this.name = `Bot #`;
        this.initializeSource();
        let initialAudioData = new HiFiAudioAPIData({
            position: initialPosition,
            orientationEuler: this.makeEuler({ pitchDegrees, yawDegrees, rollDegrees })
        });
        this.communicator = new HiFiCommunicator({
            transmitRateLimitTimeoutMS: transmitRateLimitTimeoutMS,
            initialHiFiAudioAPIData: initialAudioData,
            serverShouldSendUserData: serverShouldSendUserData
        });
        // This promise will never resolve, unless someone calls this.resolve().
        this.stopped = new Promise(resolve => this.resolve = resolve);
    }
    updatePosition(position) {
        position = new Point3D(position);
        this.communicator.updateUserDataAndTransmit({ position });
        return position;
    }
    makeEuler(options) {
        return new OrientationEuler3D(options);
    }
    updateOrientation(orientationEuler) {
        orientationEuler = this.makeEuler(orientationEuler);
        this.communicator.updateUserDataAndTransmit({ orientationEuler });
    }
    updateGain(hiFiGain) {
        this.communicator.updateUserDataAndTransmit({ hiFiGain });
    }
    log(...data) {
        console.log(this.botIndex, ...data);
    }
    static async makeJWT(data, secret = undefined) {
        if (!secret) {
            return new UnsecuredJWT(data).encode();
        }
        return await new SignJWT(data)
            .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
            .sign(crypto.createSecretKey(Buffer.from(secret, "utf8")));
    }
    async connect(inputMediaStream = this.source && this.source.srcObject,
        isStereo = this.source && this.source.numberOfChannels === 2) {
        let {
            botIndex = 0,
            user_id = this.name.replace('#', botIndex),
            app_id, space_id, secret,
            jwt
        } = this;
        jwt = jwt || await this.constructor.makeJWT({ app_id, space_id, user_id }, secret); // jwt could be empty string.
        inputMediaStream && await this.communicator.setInputAudioMediaStream(inputMediaStream, isStereo); // before connection
        let response = await this.communicator.connectToHiFiAudioAPIServer(jwt, this.stackName);
        if (response.success) {
            this.log('connected to server running', response.audionetInitResponse.build_version);
        } else {
            throw new Error(`Connect failure: ${JSON.stringify(response)}`);
        }
        this.audioMixerUserID = response.audionetInitResponse.id;
    }
    async start() {
        this.source && await this.startSource();
        await this.connect();
        await this.startSink(); // After connect, because communicator doesn't have an output stream until then.
        this.source && await this.source.play();
        this.motor && await this.motor.start();
        this.measure && await this.startMeasurement();
        this.runtimeSeconds && setTimeout(() => this.stop(), this.runtimeSeconds * 1000);
    }
    async stop() {
        this.log('stopping');
        this.motor && this.motor.stop();
        let reports = await this.stopMeasurement();
        reports && this.log(`nBytes ${reports.measured.bytesSent} => ${reports.measured.bytesReceived}`);
        await this.communicator.disconnectFromHiFiAudioAPIServer();
        this.sink.stop();
        this.source && this.source.pause();
        this.log('finished');
        // Node will normally exit when nothing is left to run. However, wrtc RTCPeerConnection doesn't
        // ever stop once it is instantiated, so node won't end on its own. To work around this,
        // our constructor creates a promise in this.stopped, which will resolve when we
        // call this next line. Callers can explicitly exit when every bot.stopped has resolved.
        this.resolve();
    }
    startSink() {
        let streamOut = this.communicator.getOutputAudioMediaStream();
        // Note: you get the downstream data even if you don't connect a sink.
        // Indeed, even if you go through each track and disable it or stop it.
        return this.sink = new RTCAudioSink(streamOut.getAudioTracks()[0]); // truthy
        // Subclasses might attach something to this.sink.ondata.
        // See https://github.com/node-webrtc/node-webrtc/blob/develop/docs/nonstandard-apis.md#rtcaudiosink and above that.
    }
    initializeSource() {
        let { audio } = this;
        if (!audio) return;
        const frequency = parseInt(audio, 10);
        if (isNaN(frequency)) {
            if (!audio.includes(':')) {
                audio = `file://${__dirname}/audio/${audio}`;
            }
            this.source = new MediaSource({ url: audio, bot: this });
        } else {
            this.source = new SineSource({ frequency, bot: this });
        }
    }
    async startSource() {
        let { gain = 1 } = this;
        this.updateGain(gain);
        await this.source.load(); // but not play just yet
    }
    async startMeasurement() { // Starts capturing bandwidth and other reports.
        console.log("_______START MEASUREMENT____________");
        // Does not require libcap/Npcap unless actually called.
        let peer = this.raviSession._raviImplementation._rtcConnection,
            state = peer && peer.connectionState;
        if (state !== 'connected') {
            // Not strictly necessary, as someone downstream will get an error, but
            // this way we capture the recognizable application-code stack, and report the state.
            throw new Error(`Bot ${this.botIndex} is in connection state ${state}, and cannot be measured.`);
        }
        let BandwidthMeasurement = require('./utilities/bandwidthMeasurement'),
            measurement = new BandwidthMeasurement(peer, this.botIndex,);
        await measurement.start();
        return this.bandwidthMeasurement = measurement;
    }
    async stopMeasurement() {
        let measurement = this.bandwidthMeasurement;
        if (!measurement) return;
        this.bandwidthMeasurement = null;
        let reports = await measurement.stop();
        if (DEBUG) this.log(reports);
        this.reports = reports;
        return reports;
    }
    static run(options) {
        let bot = new this(options);
        // Applications that use start directly can handle errors how they chose.
        // But for anythign that uses run, we catch and display any asynchronous errors.
        bot.start().catch(error => console.error(bot.botIndex, error));
        return bot;
    }
    get raviSession() {
        return this.communicator._mixerSession._raviSession;
    }
}
module.exports = Bot;
