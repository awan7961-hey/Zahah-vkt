/**
 * WhatsApp Group Management Plugin
 */
const { cmd } = require('../command.cjs');

cmd({
    pattern: 'tagall',
    alias: ['everyone', 'announce'],
    desc: 'Mention all group participants',
    category: 'group',
    isGroup: true,
    react: '📢'
}, async (conn, mek, m, { groupMetadata, q, reply, isAdmins, isOwner }) => {
    if (!isAdmins && !isOwner) return reply("🚫 *Only Group Admins can use this command!*");
    if (!groupMetadata) return reply("❌ *Could not fetch group metadata.*");

    const participants = groupMetadata.participants || [];
    let text = `📢 *ATTENTION EVERYONE* 📢\n${q ? `\n📌 *Message:* ${q}\n` : ''}\n`;
    const mentions = [];

    for (let mem of participants) {
        text += `@${mem.id.split('@')[0]}\n`;
        mentions.push(mem.id);
    }

    return conn.sendMessage(m.chat, { text, mentions }, { quoted: mek });
});

cmd({
    pattern: 'groupinfo',
    alias: ['gcinfo', 'gdata'],
    desc: 'Displays group details and statistics',
    category: 'group',
    isGroup: true,
    react: '📊'
}, async (conn, mek, m, { groupMetadata, reply }) => {
    if (!groupMetadata) return reply("❌ *Could not fetch group metadata.*");

    const infoText = `📊 *GROUP INFORMATION* 📊\n\n` +
        `🏷️ *Group Name:* ${groupMetadata.subject}\n` +
        `🆔 *JID:* \`${groupMetadata.id}\`\n` +
        `👥 *Participants:* ${groupMetadata.participants.length}\n` +
        `👑 *Owner:* ${groupMetadata.owner ? '@' + groupMetadata.owner.split('@')[0] : 'Unknown'}\n\n` +
        `📝 *Description:* \n${groupMetadata.desc || 'No description provided.'}`;

    return conn.sendMessage(m.chat, { 
        text: infoText, 
        mentions: groupMetadata.owner ? [groupMetadata.owner] : [] 
    }, { quoted: mek });
});
