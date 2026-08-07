/**
 * ============================================================================
 * 📦 MESSAGE SERIALIZER & UTILITIES MODULE
 * ============================================================================
 * Serializes raw Baileys message objects into sanitized, intuitive message wrappers
 * (`m`) with helper functions, quoted message inspection, and media downloader.
 */

const { downloadContentFromMessage, getContentType } = require('@whiskeysockets/baileys');

async function getFileTypeFromBuffer(buffer) {
    try {
        const ft = await import('file-type');
        if (ft.fileTypeFromBuffer) return await ft.fileTypeFromBuffer(buffer);
        if (ft.default && ft.default.fromBuffer) return await ft.default.fromBuffer(buffer);
    } catch (err) {}
    return null;
}

/**
 * Serializes a Baileys WebMessageInfo object into a standardized helper wrapper.
 */
function sms(conn, m) {
    if (!m) return m;

    if (m.key) {
        m.id = m.key.id;
        m.isBaileys = m.id.startsWith('BAE5') || m.id.length === 16;
        m.chat = m.key.remoteJid;
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        m.sender = conn.decodeJid(m.fromMe && conn.user ? conn.user.id : m.participant || m.key.participant || m.chat);
    }

    if (m.message) {
        m.mtype = getContentType(m.message);
        m.msg = (m.mtype === 'viewOnceMessage') 
            ? m.message.viewOnceMessage.message[getContentType(m.message.viewOnceMessage.message)]
            : m.message[m.mtype];

        m.body = m.message.conversation ||
            m.msg?.caption ||
            m.msg?.text ||
            (m.mtype === 'listResponseMessage' && m.msg?.singleSelectReply?.selectedRowId) ||
            (m.mtype === 'buttonsResponseMessage' && m.msg?.selectedButtonId) ||
            (m.mtype === 'templateButtonReplyMessage' && m.msg?.selectedId) ||
            '';

        const quoted = m.msg?.contextInfo?.quotedMessage;
        if (quoted) {
            m.quoted = {};
            m.quoted.message = quoted;
            m.quoted.mtype = getContentType(quoted);
            m.quoted.id = m.msg.contextInfo.stanzaId;
            m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat;
            m.quoted.sender = conn.decodeJid(m.msg.contextInfo.participant);
            m.quoted.fromMe = m.quoted.sender === conn.decodeJid(conn.user?.id);
            m.quoted.text = m.quoted.message?.conversation ||
                m.quoted.message?.[m.quoted.mtype]?.caption ||
                m.quoted.message?.[m.quoted.mtype]?.text || '';
        }
    }

    // Helper functions on message
    m.reply = (text, options = {}) => {
        return conn.sendMessage(m.chat, { text, ...options }, { quoted: m });
    };

    m.react = (emoji) => {
        return conn.sendMessage(m.chat, {
            react: { text: emoji, key: m.key }
        });
    };

    return m;
}

/**
 * Downloads media buffer from a message object.
 */
async function downloadMediaMessage(message) {
    let mime = (message.msg || message).mimetype || '';
    let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
    const stream = await downloadContentFromMessage(message.msg || message, messageType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

/**
 * Anti-Delete Processor: recovers deleted messages and sends them to owner/group logs.
 */
async function AntiDelete(conn, updates) {
    try {
        for (const update of updates) {
            if (update.update && update.update.message === null) {
                const key = update.key;
                if (!key || key.fromMe) continue;

                console.log(`🛡️ Anti-Delete Triggered for deleted message [${key.id}] in ${key.remoteJid}`);
                
                const alertMsg = `⚠️ *Anti-Delete Alert*\n\nA message was deleted by @${key.participant ? key.participant.split('@')[0] : key.remoteJid.split('@')[0]}.\nMessage ID: \`${key.id}\``;
                await conn.sendMessage(key.remoteJid, {
                    text: alertMsg,
                    mentions: [key.participant || key.remoteJid]
                }).catch(() => {});
            }
        }
    } catch (err) {
        console.error("AntiDelete Handler Error:", err.message);
    }
}

module.exports = {
    sms,
    downloadMediaMessage,
    AntiDelete,
    getFileTypeFromBuffer
};
