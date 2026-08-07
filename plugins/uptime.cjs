/**
 * Uptime & System Health Plugin
 */
const { cmd } = require('../command.cjs');
const { runtime } = require('../lib/functions.cjs');
const os = require('os');

cmd({
    pattern: 'uptime',
    alias: ['runtime', 'status', 'ping'],
    desc: 'Displays bot uptime, RAM usage, and system statistics',
    category: 'system',
    react: '⚡'
}, async (conn, mek, m, { reply }) => {
    const memory = process.memoryUsage();
    const ramUsed = (memory.heapUsed / 1024 / 1024).toFixed(2);
    const totalRam = (os.totalmem() / 1024 / 1024).toFixed(0);
    const uptimeStr = runtime(process.uptime());

    const statusText = `🤖 *BOSS-MD BOT SYSTEM STATUS* 🤖\n\n` +
        `⏱️ *Uptime:* ${uptimeStr}\n` +
        `💻 *RAM Usage:* ${ramUsed} MB / ${totalRam} MB\n` +
        `⚡ *Platform:* ${os.platform()} (${os.arch()})\n` +
        `🟢 *Engine Status:* Active & Responding\n\n` +
        `> Enterprise WhatsApp Multi-Device Framework`;

    return reply(statusText);
});
