/**
 * Handles group participant updates (Welcome / Goodbye / Promote / Demote notifications)
 */
const config = require('../config.cjs');

async function GroupEvents(conn, update) {
    try {
        const { id, participants, action } = update;
        if (!id || !participants || !action) return;

        console.log(`👥 Group Event [${action}] in ${id} for:`, participants);

        if (action === 'add') {
            for (const participant of participants) {
                const userNum = participant.split('@')[0];
                const welcomeMsg = `👋 Welcome @${userNum} to the group!\n\nI am *${config.BOT_NAME}* WhatsApp Bot. Type \`${config.PREFIX}help\` to see available commands.`;
                await conn.sendMessage(id, {
                    text: welcomeMsg,
                    mentions: [participant]
                }).catch(() => {});
            }
        } else if (action === 'remove') {
            for (const participant of participants) {
                const userNum = participant.split('@')[0];
                const goodbyeMsg = `👋 Goodbye @${userNum}. We will miss you!`;
                await conn.sendMessage(id, {
                    text: goodbyeMsg,
                    mentions: [participant]
                }).catch(() => {});
            }
        } else if (action === 'promote') {
            for (const participant of participants) {
                const userNum = participant.split('@')[0];
                await conn.sendMessage(id, {
                    text: `🎉 Congratulations @${userNum}! You are now a Group Admin.`,
                    mentions: [participant]
                }).catch(() => {});
            }
        } else if (action === 'demote') {
            for (const participant of participants) {
                const userNum = participant.split('@')[0];
                await conn.sendMessage(id, {
                    text: `⚠️ Notice: @${userNum} is no longer a Group Admin.`,
                    mentions: [participant]
                }).catch(() => {});
            }
        }
    } catch (err) {
        console.error("GroupEvents Handler Error:", err.message);
    }
}

module.exports = GroupEvents;
