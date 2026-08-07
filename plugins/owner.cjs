/**
 * Bot Owner Management Plugin
 */
const { cmd } = require('../command.cjs');
const config = require('../config.cjs');

cmd({
    pattern: 'setmode',
    alias: ['mode'],
    desc: 'Switch bot operating mode (public / private)',
    category: 'owner',
    onlyOwner: true,
    react: '⚙️'
}, async (conn, mek, m, { q, reply }) => {
    if (!q || !['public', 'private', 'inbox', 'groups'].includes(q.toLowerCase())) {
        return reply("⚠️ *Valid modes:* `public`, `private`, `inbox`, `groups`\nExample: `.setmode public`");
    }

    config.updateConfig({ MODE: q.toLowerCase() });
    return reply(`✅ *Bot Operating Mode updated to:* \`${q.toUpperCase()}\``);
});

cmd({
    pattern: 'restart',
    alias: ['reboot'],
    desc: 'Restarts the bot process',
    category: 'owner',
    onlyOwner: true,
    react: '🔄'
}, async (conn, mek, m, { reply }) => {
    await reply("🔄 *Restarting BOSS-MD WhatsApp Bot process...*");
    setTimeout(() => {
        process.exit(0);
    }, 1000);
});
