const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.json');

const defaultConfig = {
    BOT_NAME: process.env.BOT_NAME || 'BOSS-MD',
    OWNER_NAME: process.env.OWNER_NAME || 'FAIZAN & ZAHID',
    OWNER_NUMBER: process.env.OWNER_NUMBER || '923076411099',
    SESSION_ID: process.env.SESSION_ID || '',
    PREFIX: process.env.PREFIX || '.',
    MODE: process.env.MODE || 'public',
    AI_MODE: process.env.AI_MODE || 'true',
    AUTO_READ: process.env.AUTO_READ || 'false',
    AUTO_REACT: process.env.AUTO_REACT || 'true',
    ANTI_DELETE: process.env.ANTI_DELETE || 'true',
    ANTI_CALL: process.env.ANTI_CALL || 'true',
    AUTO_STATUS_SEEN: process.env.AUTO_STATUS_SEEN || 'true',
    AUTO_STATUS_REACT: process.env.AUTO_STATUS_REACT || 'true',
    AUTO_STATUS_REPLY: process.env.AUTO_STATUS_REPLY || 'false',
    AUTO_STATUS_MSG: process.env.AUTO_STATUS_MSG || 'Status viewed by BOSS-MD WhatsApp Bot 🚀',
    STARTUP_IMAGE: process.env.STARTUP_IMAGE || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80'
};

let currentConfig = { ...defaultConfig };

if (fs.existsSync(configPath)) {
    try {
        const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        currentConfig = { ...defaultConfig, ...saved };
    } catch (err) {}
}

function getConfig() {
    return currentConfig;
}

function updateConfig(newSettings = {}) {
    currentConfig = { ...currentConfig, ...newSettings };
    try {
        fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2));
    } catch (err) {}
    return currentConfig;
}

module.exports = new Proxy(currentConfig, {
    get(target, prop) {
        if (prop === 'getConfig') return getConfig;
        if (prop === 'updateConfig') return updateConfig;
        return currentConfig[prop];
    },
    set(target, prop, value) {
        currentConfig[prop] = value;
        return true;
    }
});
