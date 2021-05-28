'use strict';

class RTCStats { // Various reports from the stats of the given rtcPeerConnection.
    constructor(rtcPeerConnection) {
        // Captures reports at instantiation time.
        // If you want another set of reports at a later time, create another instance.
        // stats is a promise for a Map of id => report.
        this.stats = rtcPeerConnection.getStats();
    }
    static async build(rtcPeerConnection, label) { // Promise for an instance. Label can be used for logging when needed.
        let wrapper = new RTCStats(rtcPeerConnection);
        await wrapper.stats;
        return wrapper;
    }
    async getSelectedCandidate() { // The candidate that was actually used (assuming just one).
        // Usually, this will be the only report with type:'remote-candidate'. But there COULD
        // be multiples, and only the selectedCandidate is the right one.
        let stats = await this.stats;
        for (let [id, report] of stats) {
            if (report.nominated && (report.writable || report.state === 'succeeded')) { // Might still be in state:'in-progress'.
                return report;
            }
        }
    }
    async getReportById(id) { // The report with the given id.
        let stats = await this.stats;
        return stats.get(id);
    }
    async getReportsByType(types) { // Reports whose types are any specified by the types array.
        // async/await is implied by the definition of filter, but is explicit here for clarity.
        return await this.filter(report => types.includes(report.type));
    }
    async filter(predicate) { // A list of reports for which predicate(report, id, mapOfReports) is truthy.
        let stats = await this.stats,
            results = [];
        for (let [id, report] of stats) {
            if (predicate(report, id, stats)) { // predicate called similarly to Array.filter
                results.push(report);
            }
        }
        return results;
    }
}
module.exports = RTCStats;

