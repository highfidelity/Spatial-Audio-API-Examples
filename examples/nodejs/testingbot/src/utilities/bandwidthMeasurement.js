'use strict';

/*
  Synopsis:
    let measurement = new BandwidthMeasurement();
    await measurement.start();
    ...
    console.log(await measurement.end());
  Measurement end() returns a list of objects labeled: 
    measured, selectedCandidate, initialSelectedCandidate, and channels,
  where channels is a list of the data channel and
  inbound-/outbound-rtp objects.  Each object has bytesSent,
  bytesReceived, and other stuff.

  I THINK that the way the wrtc implementation of getStats() works is that:

  - The selected candidate has total bytesSent and bytesRecevied
  through the history of that candidate, including signaling. HOWEVER,
  it appears to only measure the rtc payloads, and not actual
  packets. In my measurements, it understates received bandwidth by a
  factor of 1.75, and sent bandwidth by 2.  Therefore, this bandwidth
  uses actual packet measurement via libcap.  Note that bandwidth will
  be for an individual rtcPeerConnection (as opposed to all
  connections on the machine), because we capture for the specific
  port used by the given rtcPeerConnection.

  - That's unfortunate, because one must manually install libcap or
  Npcap.  See https://www.npmjs.com/package/cap#requirements)

  - In order find out the ip:port of the remote peer, we get the rtc
  selected candidate, and then get the specific report that has
  information about the remote peer.

  - Given that the stats requires async/Promises anyway, we go ahead and
  get the rtc stats at the end anyway, in case any clients want to dig
  into whatever is known about internal payload sizes for specific
  kinds of traffic.  Just keep in mind that this does not (appear to)
  include total actual bandwidth for that traffic.

  - The selectedCandidate and initialSelectedCandidate are separate,
  in case the application wants to split off negotiation or whatever
  else preceeded start().
*/

const PacketCapture = require('./packetCapture');
const Stats = require('./stats');

const debug = false;

class BandwidthMeasurement {
    // Measure the total bandwidth used (in each direction) for a given RTCPeerConnection.
    constructor(rtcPeerConnection, label) {
        Object.assign(this, {rtcPeerConnection, label});
    }
    async generateStatsSet(label) { // Reduces the stats Map to smaller and more meaningful dictionary.
        let stats = await Stats.build(this.rtcPeerConnection, label),
            // Note that stats is our Stats wrapper, not the RTCPeerConnectionConnection stats Map.
            selectedCandidate = await stats.getSelectedCandidate()

        if (!selectedCandidate) { // Should not happen. Give diagnostics.
            console.error('We do not have a selected candidate!');
            console.log(await stats.getReportsByType(['candidate-pair', 'remote-candidate', 'peer-connection']));
        }

        let channels = await stats.getReportsByType(['inbound-rtp', 'outbound-rtp', 'data-channel']),
            rtp = channels.filter(report => report.kind === 'audio'),
            input = channels.find(r => r.label === 'ravi.input'),
            command = channels.find(r => r.label === 'ravi.command'),
            audio = {};   // a pseudo-report based on type: inbound-rtp | outbound-rtp, kind: audio
        for (let key of ['bytesSent', 'bytesReceived']) { // Generate the syntehtic reports.
            audio[key] = rtp.reduce((sum, r) => sum + (r[key] || 0), 0);
        }
        return {selectedCandidate, audio, input, command, stats};
    }
    async start() { // Start measuring. Must be after rtcPeerConnection is connected.
        let initial = await this.generateStatsSet('start stats ' + this.label),
            {stats, selectedCandidate} = initial,
            remoteServer = await stats.getReportById(selectedCandidate.remoteCandidateId),
            packetCapture = await PacketCapture.build(remoteServer.ip, remoteServer.port, remoteServer.protocol),
            startTimeMs = Date.now();
        Object.assign(this, {initial, packetCapture, startTimeMs});
        if (debug) console.log(this.label, 'measurement started', packetCapture.filter);
        return this; // truthy
    }
    async stop() { // Answers all the interesting data. (And none of the stupid stuff.)
        let {packetCapture, initial, startTimeMs} = this,
            ending = await this.generateStatsSet('end stats ' + this.label),
            measured = packetCapture.close(),
            endTimeMs = Date.now(),
            bandwidth = {measured}; // Build a dictionary with {btyesSent, bytesReceived} based on ending - initial of each kind:
        for (let kind of ['selectedCandidate', 'audio', 'input', 'command']) {
            for (let key of ['bytesSent', 'bytesReceived']) {
                let countPair = bandwidth[kind] || (bandwidth[kind] = {});
                countPair[key] = ending[kind][key] - initial[kind][key];
            }
        }

        Object.assign(this, {rtcPeerConnection:null, initial:null, packetCapture:null});
        let runtimeMs = endTimeMs - startTimeMs,
            sentKbps = this.constructor.kbps(measured.bytesSent, runtimeMs),
            receivedKbps = this.constructor.kbps(measured.bytesReceived, runtimeMs);
        if (debug) console.log(this.label, `measurement stopped: ${sentKbps.toFixed()} => ${receivedKbps.toFixed()} kbps over ${runtimeMs.toLocaleString()} ms`);
        return bandwidth;
    }
    static kbps(nBytes, runtimeMs) { // Convert nBtyes to kbps.
        return 8 * nBytes / runtimeMs;
    }
}
module.exports = BandwidthMeasurement;

