'use strict';
// Run through several scenarios, and report results.

const Bot = require("../bot");

const credential = process.argv[2];
const runtimeSecondsPerTest = process.argv[3] || 10;
const results = {robots: [], obsrvr: []};
let botIndex = 0;

function provision(data) {
    data.jwt = credential;
    return data;
}
function average(values) { // Mean of an Array of values.
    return values.reduce((acc, elt) => acc + elt) / values.length;
}
function kbps(nBytes) { // Convert nBtyes to kbps for the standard run length;
    return 8 * nBytes / (runtimeSecondsPerTest * 1000);
}
function format(bots) {
    let computed = {sum: {}},
        keys = ['bytesSent', 'bytesReceived'],
        kinds = ['measured', 'selectedCandidate', 'audio', 'command', 'input'];
    for (let key of keys) {
        for (let reportKind of kinds) {
            let report = computed[reportKind];
            if (!report) report = computed[reportKind] = {};
            computed[reportKind][key] = average(bots.map(bot => bot.reports[reportKind][key]));
        }
    }
    function side(key) {
        // MEASURED = FACTOR * PAYLOAD (PAYLOAD_SUM = AUDIO + INPUT + COMMAND)
        function pad3(kind) { return kbps(computed[kind][key]).toFixed().padStart(3); }
        let factor = (computed.measured[key] / computed.selectedCandidate[key]).toPrecision(2);
        computed.sum[key] = computed.audio[key] + computed.command[key] + computed.input[key];
        return `${pad3('measured')} = ${factor} * ${pad3('selectedCandidate')} (${pad3('sum')} = ${pad3('audio')} + ${pad3('input')} + ${pad3('command')})`;
    }
    let output = `${side('bytesSent')} => ${side('bytesReceived')}`;
    // if (bots.length === 1) console.log(bots[0].botIndex, computed, bots[0].reports); // fixme remove
    return output;
}

const observer = new Bot(provision({
    botIndex: botIndex++,
    audio: '',
    motor: '',
    x: -1, z: 1
}));

async function run1(label, spec, count = 1) { // Run spec and store results under label.
    console.log(label);
    let coordinatedMeasure = true;
    let coordinatedRuntime = coordinatedMeasure && true;
    // One bot for each spec.
    let bots = [];
    for (let i = 0; i < count; i++) {
        let bot = new Bot(Object.assign(provision(spec), {
            botIndex: botIndex++,
            x: 1, z: 1,
            runtimeSeconds: coordinatedRuntime ? 0 : runtimeSecondsPerTest,
            measure: !coordinatedMeasure
        }));
        bots.push(bot);
    }
    console.log(label, bots.map(bot => bot.botIndex));
    let allBots = bots.concat(observer);
    let starts = bots.map(bot => bot.start());
    let stops = bots.map(bot => bot.stopped);
    await Promise.all(starts); // Now wait for them all to be started.
    console.log(label, 'started');
    
    if (coordinatedMeasure) {
        let measurementStarts = allBots.map(bot => bot.startMeasurement());
        await Promise.all(measurementStarts);
        console.log(label, 'measurement completely started');
        if (coordinatedRuntime) {
            await new Promise(resolve => setTimeout(resolve, runtimeSecondsPerTest * 1000));
            console.log(label, 'time completed');
            await Promise.all(allBots.map(bot => bot.stopMeasurement()));
            console.log(label, 'measurement completed, stopping all');
            bots.forEach(bot => bot.stop());
        }
    } else {
        await observer.startMeasurement();
    }

    console.log(label, 'waiting for stop');
    await Promise.all(stops);

    console.log(label, 'stopped');
    !coordinatedMeasure && await observer.stopMeasurement();
    function result(kind, bots) {
        let string = `${label} ${kind}: ${format(bots)}`;
        console.log(string);
        results[kind].push(string);
    }
    result('robots', bots);
    result('obsrvr', [observer]);
}
function soundAndMovement(hasSound, updateRateMs) { // Generate parameters.
    return {
        audio: hasSound && 'voice-01.mp3',
        motor: updateRateMs && {"type": "RandomBoundedMovement", "x": [-13, 11], "z": [-12, 10], updatePeriodMs: updateRateMs}
    };
}
async function runWith(hasSound, updateRateMs, count = 1) {
    let audioLabel = hasSound ?
        ' music' :
        'silent',
        movementLabel = updateRateMs ?
        `moving@${updateRateMs.toString().padStart(3, '0')}` :
        'motionless',
        label = `${count.toString().padStart(2)} ${audioLabel}, ${movementLabel}`;
    console.log('starting ' + label);
    return await run1(label,
                      soundAndMovement(hasSound, updateRateMs),
                      count);
}
async function runAll() {    
    await observer.start();
    console.log("________OBSERVER__________");
    for (let music of [false, true]) {
        for (let count of [1, 5]) {
            for (let motion of [0, 100, 50, 10]) {
                await runWith(music, motion, count);
                console.log("________RUN__________");
            }
        }
    }
    await observer.stop();
}
runAll().then(() => {
    console.log(results.robots.join('\n'));
    console.log(results.obsrvr.join('\n'));    
    process.exit(); // Because wrtc keeps running, even after close().
});

