/**
 * Newsletter & Channel Utility Plugin
 */
const { cmd } = require('../command.cjs');
const { newsletterJids } = require('../newsletters.cjs');

cmd({
    pattern: 'newsletters',
    alias: ['channels'],
    desc: 'List tracked newsletter channels',
    category: 'newsletter',
    react: '📰'
}, async (conn, mek, m, { reply }) => {
    let text = `📰 *TRACKED NEWSLETTER CHANNELS* (${newsletterJids.length})\n\n`;
    newsletterJids.forEach((jid, i) => {
        text += `${i + 1}. \`${jid}\`\n`;
    });
    text += `\n> Auto-react and follow are active.`;
    return reply(text);
});
