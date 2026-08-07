/**
 * System Uptime Check Utility
 */
const { runtime } = require('./lib/functions.cjs');

function getUptimeInfo() {
    return {
        uptimeSeconds: process.uptime(),
        formatted: runtime(process.uptime()),
        timestamp: new Date().toISOString()
    };
}

module.exports = getUptimeInfo;
