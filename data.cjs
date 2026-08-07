/**
 * Local Data Storage Engine for Contacts, Message History, Group Metadata, and AntiDelete
 */
const contacts = new Map();
const groupMetadataCache = new Map();
const messageCountDB = new Map();
const messageStore = new Map();
const antiDeleteSettings = new Map();

function saveContact(jid, pushName) {
    if (!jid) return;
    contacts.set(jid, pushName || jid.split('@')[0]);
}

function getName(jid) {
    return contacts.get(jid) || jid?.split('@')[0] || 'User';
}

function saveGroupMetadata(jid, metadata) {
    if (!jid || !metadata) return;
    groupMetadataCache.set(jid, { metadata, timestamp: Date.now() });
}

function getGroupMetadata(jid) {
    const cached = groupMetadataCache.get(jid);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > 300000) {
        groupMetadataCache.delete(jid);
        return null;
    }
    return cached.metadata;
}

function saveMessageCount(groupJid, senderJid) {
    if (!groupJid || !senderJid) return;
    const key = `${groupJid}:${senderJid}`;
    const current = messageCountDB.get(key) || 0;
    messageCountDB.set(key, current + 1);
}

function saveMessage(id, message) {
    if (!id || !message) return;
    messageStore.set(id, message);
    if (messageStore.size > 2000) {
        const firstKey = messageStore.keys().next().value;
        messageStore.delete(firstKey);
    }
}

function loadMessage(id) {
    return messageStore.get(id) || null;
}

function setAnti(key, val) {
    antiDeleteSettings.set(key, val);
}

function getAnti(key) {
    return antiDeleteSettings.get(key) ?? true;
}

function getChatSummary() {
    return {
        totalContacts: contacts.size,
        cachedGroups: groupMetadataCache.size,
        storedMessages: messageStore.size
    };
}

module.exports = {
    AntiDelDB: antiDeleteSettings,
    setAnti,
    getAnti,
    saveContact,
    getName,
    saveGroupMetadata,
    getGroupMetadata,
    saveMessageCount,
    saveMessage,
    loadMessage,
    getChatSummary
};
