/**
 * ====================================================================================================
 * 🚀 BOSS-MD WHATSAPP MULTI-DEVICE BOT PLATFORM
 * ====================================================================================================
 * @file index.cjs
 * @description Enterprise-grade, modular, high-performance WhatsApp bot orchestrator powered by Baileys,
 *              Express.js, Gemini AI, event-driven queueing, dynamic plugin engine, and memory optimizer.
 * ====================================================================================================
 */

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    isJidBroadcast,
    getContentType,
    proto,
    generateWAMessageContent,
    generateWAMessage,
    prepareWAMessageMedia,
    areJidsSameUser,
    downloadContentFromMessage,
    generateForwardMessageContent,
    generateWAMessageFromContent,
    generateMessageID,
    jidDecode,
    fetchLatestBaileysVersion,
    Browsers
} = require('@whiskeysockets/baileys');

const fs = require('fs');
const path = require('path');
const os = require('os');
const util = require('util');
const express = require('express');
const bodyParser = require('body-parser');
const P = require('pino');
const axios = require('axios');

// Dynamic ESM Loader for @google/genai & file-type
async function getFileTypeFromBuffer(buffer) {
    try {
        const ft = await import('file-type');
        if (ft.fileTypeFromBuffer) return await ft.fileTypeFromBuffer(buffer);
        if (ft.default && ft.default.fromBuffer) return await ft.default.fromBuffer(buffer);
    } catch (err) {}
    return null;
}

async function getGenAIClass() {
    try {
        const genAIModule = await import('@google/genai');
        return genAIModule.GoogleGenAI || genAIModule.default?.GoogleGenAI;
    } catch (err) {
        console.error("Failed to load @google/genai:", err.message);
        return null;
    }
}

// Internal Modules
const config = require('./config.cjs');
const { loadPlugins, commands, reloadPlugins } = require('./command.cjs');
const { sms, downloadMediaMessage, AntiDelete } = require('./lib/index.cjs');
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson, formatSize } = require('./lib/functions.cjs');
const GroupEvents = require('./lib/groupevents.cjs');
const { newsletterJids, FollowChannelJids, autoFollowNewsletters } = require('./newsletters.cjs');
const { 
    AntiDelDB, setAnti, getAnti, saveContact, getName, 
    saveGroupMetadata, getGroupMetadata, saveMessageCount, 
    saveMessage, loadMessage, getChatSummary 
} = require('./data.cjs');

// Owner Identification
const ownerNumbers = [config.OWNER_NUMBER, '923076411099', '923266105873'];

// Pre-load plugins into memory
try {
    loadPlugins(path.join(__dirname, 'plugins'));
} catch (err) {}

// ====================================================================================================
// MEMORY MANAGEMENT & GARBAGE COLLECTION
// ====================================================================================================
global.gc = global.gc || (() => {});
let memoryCleanInterval = null;

function setupMemoryOptimization() {
    const tempDir = path.join(os.tmpdir(), 'boss-md-cache');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const clearTempDir = () => {
        try {
            const files = fs.readdirSync(tempDir);
            const now = Date.now();
            for (const file of files) {
                const filePath = path.join(tempDir, file);
                try {
                    const stats = fs.statSync(filePath);
                    if (now - stats.mtimeMs > 10 * 60 * 1000) {
                        fs.unlinkSync(filePath);
                    }
                } catch (err) {}
            }
        } catch (err) {}
    };

    setInterval(clearTempDir, 5 * 60 * 1000);

    memoryCleanInterval = setInterval(() => {
        try {
            if (global.gc) global.gc();
            const memoryUsage = process.memoryUsage();
            if (memoryUsage.heapUsed > 250 * 1024 * 1024) {
                console.log(`🧹 High Memory Notice - Heap: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
            }
        } catch (err) {}
    }, 30000);
}

setupMemoryOptimization();

// Performance Cache
const speedCache = {
    groups: new Map(),
    users: new Map(),
    messageDeduplication: new Set(),
    lastClean: Date.now()
};

let perfStats = {
    msgCount: 0,
    avgResponse: 0,
    startTime: Date.now(),
    status: 'Initializing',
    pairingCode: null,
    connectedUser: null
};

setInterval(() => {
    const now = Date.now();
    if (speedCache.messageDeduplication.size > 5000) {
        speedCache.messageDeduplication.clear();
    }
    if (now - speedCache.lastClean > 180000) {
        for (const [key, val] of speedCache.groups.entries()) {
            if (now - val.timestamp > 300000) speedCache.groups.delete(key);
        }
        speedCache.lastClean = now;
    }
}, 60000);

// Message Queue
const msgQueue = [];
let isProcessingQueue = false;

const processQueue = async (conn) => {
    if (isProcessingQueue || msgQueue.length === 0) return;
    isProcessingQueue = true;

    const batch = msgQueue.splice(0, 5);
    for (const msg of batch) {
        try {
            await handleMessageInbound(conn, msg);
        } catch (e) {
            console.error("Queue Worker Error:", e.message);
        }
    }

    isProcessingQueue = false;
    if (msgQueue.length > 0) setTimeout(() => processQueue(conn), 10);
};

// Sessions
const sessionDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
}

function bootstrapSession() {
    if (!fs.existsSync(path.join(sessionDir, 'creds.json'))) {
        if (config.SESSION_ID && config.SESSION_ID.trim() !== '') {
            const cleanSess = config.SESSION_ID.replace("FAIZAN-MD~", '').replace("BOSS-MD~", '');
            try {
                const decodedData = Buffer.from(cleanSess, 'base64').toString('utf-8');
                fs.writeFileSync(path.join(sessionDir, 'creds.json'), decodedData);
                console.log("✅ Session loaded successfully from config.SESSION_ID");
            } catch (err) {
                console.error("❌ Invalid SESSION_ID decoding format:", err.message);
            }
        }
    }
}

bootstrapSession();

let conn = null;
let reconnectAttempts = 0;

async function startWhatsAppBot() {
    console.log("⚡ Starting BOSS-MD WhatsApp Bot Engine...");
    perfStats.status = 'Connecting';

    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();

        conn = makeWASocket({
            logger: P({ level: 'silent' }),
            printQRInTerminal: false,
            browser: Browsers.macOS("Firefox"),
            syncFullHistory: false,
            auth: state,
            version,
            markOnlineOnConnect: true,
            emitOwnEvents: false,
            fireInitQueries: false,
            retryRequestDelayMs: 250
        });

        conn.ev.on('creds.update', saveCreds);
        attachConnectionHelpers(conn);

        conn.generatePairingCode = async (phoneNumber) => {
            try {
                const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
                if (!cleanNumber) throw new Error("Invalid phone number format");
                
                await sleep(1500);
                const code = await conn.requestPairingCode(cleanNumber);
                perfStats.pairingCode = code;
                console.log(`🔑 Generated Pairing Code for [${cleanNumber}]: ${code}`);
                return code;
            } catch (err) {
                console.error("❌ Pairing Code Generation Error:", err.message);
                throw err;
            }
        };

        conn.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) console.log("📱 QR Code Received for Terminal Pairing");

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const reason = lastDisconnect?.error?.output?.payload?.error || 'Unknown Reason';
                console.log(`⚠️ Connection Closed [Status: ${statusCode}] - ${reason}`);
                perfStats.status = 'Disconnected';

                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                if (shouldReconnect) {
                    reconnectAttempts++;
                    const delay = Math.min(reconnectAttempts * 2000, 15000);
                    console.log(`🔄 Reconnecting in ${delay / 1000}s (Attempt ${reconnectAttempts})...`);
                    setTimeout(() => startWhatsAppBot(), delay);
                } else {
                    console.log("❌ Logged out. Session cleared.");
                    if (fs.existsSync(sessionDir)) {
                        fs.rmSync(sessionDir, { recursive: true, force: true });
                    }
                }
            } else if (connection === 'open') {
                reconnectAttempts = 0;
                perfStats.status = 'Connected';
                perfStats.connectedUser = conn.user?.id ? conn.user.id.split(':')[0] : 'Unknown';
                console.log(`🎉 WHATSAPP CONNECTED SUCCESSFULLY! User: ${perfStats.connectedUser}`);

                console.log("⚡ Installing Bot Plugins...");
                const pluginCount = loadPlugins(path.join(__dirname, 'plugins'));
                console.log(`✅ Loaded ${pluginCount} plugins into memory.`);

                autoFollowNewsletters(conn);
                sendStartupWelcomeMessage(conn);
            }
        });

        conn.ev.on("group-participants.update", (update) => {
            try { GroupEvents(conn, update); } catch (err) {}
        });

        conn.ev.on("call", async (json) => {
            try {
                if (config.ANTI_CALL !== 'true') return;
                const call = json.find(c => c.status === 'offer');
                if (!call) return;
                await conn.rejectCall(call.id, call.from);
            } catch (err) {}
        });

        if (config.ANTI_DELETE === 'true') {
            conn.ev.on('messages.update', async (updates) => {
                try { await AntiDelete(conn, updates); } catch (err) {}
            });
        }

        conn.ev.on('messages.upsert', async (mekData) => {
            try {
                const message = mekData.messages[0];
                if (!message || !message.message) return;
                msgQueue.push(message);
                if (msgQueue.length === 1) processQueue(conn);
            } catch (err) {}
        });

    } catch (err) {
        console.error("❌ startWhatsAppBot error:", err.message);
        perfStats.status = 'Standby (Awaiting Pairing)';
    }

    return conn;
}

function attachConnectionHelpers(conn) {
    conn.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return (decode.user && decode.server && decode.user + '@' + decode.server) || jid;
        } else return jid;
    };

    conn.parseMention = async (text) => {
        return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net');
    };

    conn.downloadMediaMessage = async (message) => {
        return downloadMediaMessage(message);
    };

    conn.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
        let quoted = message.msg ? message.msg : message;
        let mime = (message.msg || message).mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(quoted, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        let type = await getFileTypeFromBuffer(buffer);
        let trueFileName = attachExtension ? (filename + '.' + (type ? type.ext : 'bin')) : filename;
        fs.writeFileSync(trueFileName, buffer);
        return trueFileName;
    };

    conn.sendFile = async (jid, PATH, fileName, quoted = {}, options = {}) => {
        let types = await conn.getFile(PATH, true);
        let { filename, size, ext, mime, data } = types;
        let type = '', mimetype = mime, pathFile = filename;
        
        if (/image/.test(mime)) type = 'image';
        else if (/video/.test(mime)) type = 'video';
        else if (/audio/.test(mime)) type = 'audio';
        else type = 'document';

        await conn.sendMessage(jid, {
            [type]: { url: pathFile },
            mimetype,
            fileName,
            ...options
        }, { quoted, ...options });

        return fs.promises.unlink(pathFile).catch(() => {});
    };

    conn.getFile = async (PATH, save) => {
        let res;
        let data = Buffer.isBuffer(PATH) 
            ? PATH 
            : /^data:.*?\/.*?;base64,/i.test(PATH) 
            ? Buffer.from(PATH.split(',')[1], 'base64') 
            : /^https?:\/\//.test(PATH) 
            ? await getBuffer(PATH) 
            : fs.existsSync(PATH) 
            ? fs.readFileSync(PATH) 
            : typeof PATH === 'string' 
            ? PATH 
            : Buffer.alloc(0);

        let type = (await getFileTypeFromBuffer(data)) || {
            mime: 'application/octet-stream',
            ext: 'bin'
        };

        let filename = path.join(os.tmpdir(), `${Date.now()}.${type.ext}`);
        if (data && save) fs.writeFileSync(filename, data);
        return { res, filename, size: data.length, ...type, data };
    };

    conn.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
        const buffer = await getBuffer(url);
        const type = await getFileTypeFromBuffer(buffer);
        const mime = type ? type.mime : 'image/jpeg';

        if (mime.startsWith('image/')) {
            return conn.sendMessage(jid, { image: buffer, caption, ...options }, { quoted });
        } else if (mime.startsWith('video/')) {
            return conn.sendMessage(jid, { video: buffer, caption, mimetype: 'video/mp4', ...options }, { quoted });
        } else if (mime.startsWith('audio/')) {
            return conn.sendMessage(jid, { audio: buffer, mimetype: 'audio/mp3', ...options }, { quoted });
        } else {
            return conn.sendMessage(jid, { document: buffer, mimetype: mime, fileName: 'file', caption, ...options }, { quoted });
        }
    };

    conn.sendContact = async (jid, numbers = [], quoted = '', opts = {}) => {
        let list = [];
        for (let i of numbers) {
            const num = i.replace(/[^0-9]/g, '');
            list.push({
                displayName: `Contact ${num}`,
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Contact;${num};;;\nFN:${config.OWNER_NAME}\nitem1.TEL;waid=${num}:${num}\nitem1.X-ABLabel:Mobile\nEND:VCARD`
            });
        }
        return conn.sendMessage(jid, {
            contacts: { displayName: `${list.length} Contact`, contacts: list },
            ...opts
        }, { quoted });
    };

    conn.cMod = (jid, copy, text = '', sender = conn.user.id, options = {}) => {
        let mtype = Object.keys(copy.message)[0];
        let msg = copy.message[mtype];
        if (typeof msg === 'string') copy.message[mtype] = text || msg;
        else if (msg.caption) msg.caption = text || msg.caption;
        else if (msg.text) msg.text = text || msg.text;
        copy.key.remoteJid = jid;
        copy.key.fromMe = sender === conn.user.id;
        return proto.WebMessageInfo.fromObject(copy);
    };

    conn.serializeM = (m) => sms(conn, m);
}

async function handleMessageInbound(conn, message) {
    perfStats.msgCount++;
    const startTime = Date.now();

    try {
        if (!message || !message.message) return;

        const msgId = message.key.id;
        if (speedCache.messageDeduplication.has(msgId)) return;
        speedCache.messageDeduplication.add(msgId);

        let msgContent = message.message;
        const type = getContentType(msgContent);
        if (type === 'ephemeralMessage') {
            msgContent = msgContent.ephemeralMessage.message;
        }

        const from = message.key.remoteJid;
        if (!from) return;

        if (from === 'status@broadcast') {
            await handleStatusUpdates(conn, message);
            return;
        }

        saveMessage(msgId, message);
        const m = sms(conn, message);

        const sender = message.key.fromMe 
            ? (conn.user?.id ? conn.user.id.split(':')[0] + '@s.whatsapp.net' : from)
            : (message.key.participant || from);
        
        const senderNumber = sender.split('@')[0];
        const botNumber = conn.user?.id ? conn.user.id.split(':')[0] : '';
        const isMe = botNumber === senderNumber;
        const isOwner = ownerNumbers.includes(senderNumber) || isMe;
        const isGroup = from.endsWith('@g.us');

        saveContact(sender, message.pushName);
        let body = m.body || '';

        if (config.AUTO_READ === 'true') {
            await conn.readMessages([message.key]).catch(() => {});
        }

        if (!isOwner && config.MODE === 'private') return;
        if (!isOwner && isGroup && config.MODE === 'inbox') return;
        if (!isOwner && !isGroup && config.MODE === 'groups') return;

        let groupMetadata = null;
        let isAdmins = false;
        let isBotAdmins = false;

        if (isGroup) {
            saveMessageCount(from, sender);
            groupMetadata = getGroupMetadata(from);
            if (!groupMetadata) {
                groupMetadata = await conn.groupMetadata(from).catch(() => null);
                if (groupMetadata) saveGroupMetadata(from, groupMetadata);
            }

            if (groupMetadata) {
                const groupAdmins = getGroupAdmins(groupMetadata.participants);
                isAdmins = groupAdmins.includes(sender);
                const botJid = botNumber + '@s.whatsapp.net';
                isBotAdmins = groupAdmins.includes(botJid);
            }
        }

        if (config.AUTO_REACT === 'true' && !message.key.fromMe) {
            const reactions = isOwner 
                ? ["👑", "💀", "📊", "⚙️", "🧠", "🎯"] 
                : ['❤️', '🔥', '👍', '😊', '🎉', '🌟'];
            const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
            setTimeout(() => {
                m.react(randomReaction).catch(() => {});
            }, 50);
        }

        const currentPrefix = config.PREFIX || '.';
        const isCmd = body.startsWith(currentPrefix);

        if (isCmd) {
            const cmdName = body.slice(currentPrefix.length).trim().split(' ')[0].toLowerCase();
            const args = body.trim().split(/ +/).slice(1);
            const q = args.join(' ');

            const matchedCmd = commands.find(c => 
                c.pattern === cmdName || (c.alias && c.alias.includes(cmdName))
            );

            if (matchedCmd && matchedCmd.enabled) {
                if (matchedCmd.onlyOwner && !isOwner) {
                    return m.reply("🚫 *This command is reserved for the Bot Owner.*");
                }
                if (matchedCmd.isGroup && !isGroup) {
                    return m.reply("🚫 *This command can only be used inside WhatsApp Groups.*");
                }

                if (matchedCmd.react) {
                    m.react(matchedCmd.react).catch(() => {});
                }

                await matchedCmd.function(conn, message, m, {
                    from,
                    body,
                    isCmd,
                    command: cmdName,
                    args,
                    q,
                    text: q,
                    isGroup,
                    sender,
                    senderNumber,
                    botNumber,
                    pushname: message.pushName || 'User',
                    isMe,
                    isOwner,
                    groupMetadata,
                    isBotAdmins,
                    isAdmins,
                    reply: (text) => conn.sendMessage(from, { text }, { quoted: message })
                });
            }
        } else {
            if (!isGroup && !message.key.fromMe && config.AI_MODE === 'true' && body.length > 2) {
                await handleAiConversation(conn, from, body, message);
            }
        }

        const duration = Date.now() - startTime;
        perfStats.avgResponse = Math.round((perfStats.avgResponse * 0.8) + (duration * 0.2));

    } catch (err) {
        console.error("❌ Message Inbound Processing Error:", err.message);
    }
}

async function handleStatusUpdates(conn, mek) {
    try {
        if (config.AUTO_STATUS_SEEN === 'true') {
            await conn.readMessages([mek.key]).catch(() => {});
        }

        if (config.AUTO_STATUS_REACT === 'true') {
            const emojis = ['❤️', '🔥', '💎', '💗', '🥰', '💐', '😎', '✅', '🌟', '🗿'];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            await conn.sendMessage(mek.key.remoteJid, {
                react: { text: randomEmoji, key: mek.key }
            }, { statusJidList: [mek.key.participant] }).catch(() => {});
        }

        if (config.AUTO_STATUS_REPLY === 'true' && config.AUTO_STATUS_MSG) {
            const user = mek.key.participant;
            await conn.sendMessage(user, {
                text: config.AUTO_STATUS_MSG
            }, { quoted: mek }).catch(() => {});
        }
    } catch (err) {}
}

async function handleAiConversation(conn, from, query, quotedMessage) {
    try {
        const apiKey = process.env.GEMINI_API_KEY || '';
        if (!apiKey) return;

        const GenAIClass = await getGenAIClass();
        if (!GenAIClass) return;

        const ai = new GenAIClass({
            apiKey,
            httpOptions: {
                headers: { 'User-Agent': 'aistudio-build' }
            }
        });

        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: query,
            config: {
                systemInstruction: "You are BOSS-MD, a friendly, courteous WhatsApp AI assistant. Respond warmly and concisely."
            }
        });

        const replyText = response.text;
        if (replyText) {
            await conn.sendMessage(from, { text: `🤖 ${replyText}` }, { quoted: quotedMessage });
        }
    } catch (err) {}
}

function sendStartupWelcomeMessage(conn) {
    setTimeout(async () => {
        try {
            if (!conn?.user?.id) return;
            const meJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';
            const welcomeBanner = `🎉 *BOSS-MD WHATSAPP BOT IS ONLINE!* 🎉\n\n` +
                `🔹 *Status:* Operational & Active\n` +
                `🔹 *Prefix:* \`${config.PREFIX}\`\n` +
                `🔹 *Operating Mode:* \`${config.MODE}\`\n` +
                `🔹 *AI Mode:* \`${config.AI_MODE}\`\n` +
                `⚡ *Commands Loaded:* ${commands.length}\n\n` +
                `> Built with Baileys, Express, and Gemini AI.\n` +
                `> Access Dashboard at http://localhost:3000`;

            await conn.sendMessage(meJid, {
                image: { url: config.STARTUP_IMAGE },
                caption: welcomeBanner
            }).catch(() => {});
        } catch (err) {}
    }, 3000);
}

function attachExpressServer(app) {
    app.use(bodyParser.json());

    app.get('/api/status', (req, res) => {
        const memoryUsage = process.memoryUsage();
        res.json({
            status: perfStats.status,
            connectedUser: perfStats.connectedUser,
            pairingCode: perfStats.pairingCode,
            uptime: Math.floor((Date.now() - perfStats.startTime) / 1000),
            msgCount: perfStats.msgCount,
            avgResponseMs: perfStats.avgResponse,
            queueLength: msgQueue.length,
            cachedGroups: speedCache.groups.size,
            ramUsedMB: (memoryUsage.heapUsed / 1024 / 1024).toFixed(1),
            totalRamMB: (os.totalmem() / 1024 / 1024).toFixed(0),
            config: config.getConfig()
        });
    });

    app.post('/api/pairing', async (req, res) => {
        try {
            const { phoneNumber } = req.body;
            if (!phoneNumber) {
                return res.status(400).json({ error: "Phone number is required." });
            }
            if (!conn) {
                return res.status(503).json({ error: "WhatsApp engine is initializing. Please try again in 5 seconds." });
            }

            const code = await conn.generatePairingCode(phoneNumber);
            res.json({ success: true, pairingCode: code, phoneNumber });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/config', (req, res) => {
        const newSettings = req.body;
        const updated = config.updateConfig(newSettings);
        res.json({ success: true, config: updated });
    });

    app.get('/api/plugins', (req, res) => {
        res.json({
            count: commands.length,
            plugins: commands.map(c => ({
                pattern: c.pattern,
                alias: c.alias,
                desc: c.desc,
                category: c.category,
                enabled: c.enabled,
                onlyOwner: c.onlyOwner,
                isGroup: c.isGroup
            }))
        });
    });

    app.post('/api/plugins/reload', (req, res) => {
        const count = reloadPlugins(path.join(__dirname, 'plugins'));
        res.json({ success: true, count });
    });

    app.post('/api/chat', async (req, res) => {
        try {
            const { message } = req.body;
            if (!message) return res.status(400).json({ error: "Message required" });

            const apiKey = process.env.GEMINI_API_KEY || '';
            if (!apiKey) {
                return res.json({ response: "🤖 [AI Offline]: GEMINI_API_KEY is missing." });
            }

            const GenAIClass = await getGenAIClass();
            if (!GenAIClass) {
                return res.json({ response: "🤖 [AI Offline]: @google/genai module failed to load." });
            }

            const ai = new GenAIClass({
                apiKey,
                httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
            });

            const result = await ai.models.generateContent({
                model: 'gemini-3.6-flash',
                contents: message,
                config: {
                    systemInstruction: "You are BOSS-MD WhatsApp Bot simulator. Answer helpfully."
                }
            });

            res.json({ response: result.text || "No output generated." });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
}

process.on('uncaughtException', (err) => {
    console.error('🛡️ Uncaught Exception Trapped:', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🛡️ Unhandled Rejection Trapped:', reason);
});

module.exports = {
    startWhatsAppBot,
    attachExpressServer,
    perfStats,
    getConn: () => conn
};
