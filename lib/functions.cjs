const axios = require('axios');

async function getBuffer(url, options = {}) {
    try {
        const res = await axios({
            method: 'get',
            url,
            headers: {
                'DNT': 1,
                'Upgrade-Insecure-Requests': 1
            },
            responseType: 'arraybuffer',
            ...options
        });
        return res.data;
    } catch (err) {
        return Buffer.alloc(0);
    }
}

function getGroupAdmins(participants = []) {
    const admins = [];
    for (const p of participants) {
        if (p.admin === 'admin' || p.admin === 'superadmin') {
            admins.push(p.id);
        }
    }
    return admins;
}

function getRandom(ext = '') {
    return `${Math.floor(Math.random() * 10000)}${ext}`;
}

function h2k(number) {
    const SI_POSTFIXES = ["", "k", "M", "G", "T", "P", "E"];
    const tier = Math.log10(Math.abs(number)) / 3 | 0;
    if (tier === 0) return number;
    const postfix = SI_POSTFIXES[tier];
    const scale = Math.pow(10, tier * 3);
    const scaled = number / scale;
    let formatted = scaled.toFixed(1) + '';
    if (/\.0$/.test(formatted)) formatted = formatted.substr(0, formatted.length - 2);
    return formatted + postfix;
}

function isUrl(url) {
    return url.match(
        new RegExp(
            /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/,
            'gi'
        )
    );
}

function Json(string) {
    return JSON.stringify(string, null, 2);
}

function runtime(seconds) {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const dDisplay = d > 0 ? d + (d === 1 ? " day, " : " days, ") : "";
    const hDisplay = h > 0 ? h + (h === 1 ? " hour, " : " hours, ") : "";
    const mDisplay = m > 0 ? m + (m === 1 ? " minute, " : " minutes, ") : "";
    const sDisplay = s > 0 ? s + (s === 1 ? " second" : " seconds") : "";
    return dDisplay + hDisplay + mDisplay + sDisplay;
}

const sleep = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url, options = {}) {
    try {
        const res = await axios.get(url, options);
        return res.data;
    } catch (err) {
        return { error: err.message };
    }
}

function formatSize(bytes) {
    if (bytes >= 1073741824) { bytes = (bytes / 1073741824).toFixed(2) + " GB"; }
    else if (bytes >= 1048576) { bytes = (bytes / 1048576).toFixed(2) + " MB"; }
    else if (bytes >= 1024) { bytes = (bytes / 1024).toFixed(2) + " KB"; }
    else if (bytes > 1) { bytes = bytes + " bytes"; }
    else if (bytes === 1) { bytes = bytes + " byte"; }
    else { bytes = "0 bytes"; }
    return bytes;
}

module.exports = {
    getBuffer,
    getGroupAdmins,
    getRandom,
    h2k,
    isUrl,
    Json,
    runtime,
    sleep,
    fetchJson,
    formatSize
};
