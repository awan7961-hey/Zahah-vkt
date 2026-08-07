const newsletterJids = [
    "120363298514128688@newsletter",
    "120363144038483540@newsletter"
];

const FollowChannelJids = newsletterJids;

async function autoFollowNewsletters(conn) {
    if (!conn) return;
    try {
        for (const jid of newsletterJids) {
            if (conn.newsletterFollow) {
                await conn.newsletterFollow(jid).catch(() => {});
            }
        }
    } catch (err) {}
}

module.exports = {
    newsletterJids,
    FollowChannelJids,
    autoFollowNewsletters
};
