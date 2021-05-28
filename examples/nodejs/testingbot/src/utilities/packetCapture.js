'use strict';
const { Cap } = require('cap');

const DEBUG = false;

class PacketCapture { // Counts bytes using libcap. See https://www.npmjs.com/package/cap for requirements.
    constructor(ip, port, protocol, device = Cap.findDevice()) { // Default device is the first non-loopback real device.
        // Start counting protocol bytes to or from ip:port on the specified device.
        this.bytesSent = this.bytesReceived = 0;
        let filter = `host ${ip} and port ${port} and ${protocol}`, // http://www.tcpdump.org/manpages/pcap-filter.7.html
            //maxPacket = 2048, // For sizing the buffer we must give to hold the packet.
            sentBuffer = this.constructor.getBuffer(), //Buffer.alloc(maxPacket),  // What we get passed with data for a single packet. 
            receivedBuffer = this.constructor.getBuffer(), //Buffer.alloc(maxPacket),
            sent = this.startCapture(device, `dst ${filter}`, sentBuffer, 'bytesSent'),
            received = this.startCapture(device, `src ${filter}`, receivedBuffer, 'bytesReceived');
        // Store for close(), or to keep from being garbage collected.
        Object.assign(this, {sentBuffer, receivedBuffer, sent, received, device, filter});
    }
    static pool = []; // Re-use buffers.
    static getBuffer() {
        const maxPacketSize = 2048;
        let existing = this.pool.pop();
        if (existing) return existing;
        return Buffer.alloc(maxPacketSize);
    }
    static putBuffer(buffer) {
        this.pool.push(buffer);
    }
    startCapture(device, filter, buffer, accumulator, bufSize = 10 * 1024 * 1024) {
        // Start a single capture of filter on the specified device.
        let capture = new Cap(); // It turns out that re-using Caps causes an assert failure.
        capture.open(device, filter, bufSize, buffer); // bufSize is internal libpcap storage for possibly multiple packets.
        capture.on('packet', (nBytes, isTruncated) => {
            if (isTruncated) throw new Error(`Capture ${filter} truncated.`);
            this[accumulator] += nBytes;
        });
        if (DEBUG) console.log('started', filter);
        return capture;
    }
    close() { // Stop counting, and return {bytesSent, bytesReceived}.
        let {bytesSent, bytesReceived, sent, received, device, filter} = this;
        sent.close();
        received.close();
        console.log('stopped', this.filter);
        this.constructor.putBuffer(this.sentBuffer);
        this.constructor.putBuffer(this.receivedBuffer);
        Object.assign(this, {sentBuffer:null, receivedBuffer:null, sent:null, received:null});
        return {bytesSent, bytesReceived, device, filter};
    }
    static async build(...parameters) {
        // Async in case we want to introduce any delays for safety
        return new PacketCapture(...parameters);
    }
}
module.exports = PacketCapture;

