/**
 * Gemini AI Integration Plugin
 */
const { cmd } = require('../command.cjs');

cmd({
    pattern: 'ai',
    alias: ['gemini', 'gpt', 'ask', 'bot'],
    desc: 'Ask questions to Gemini AI model',
    category: 'ai',
    react: '🧠'
}, async (conn, mek, m, { q, reply }) => {
    if (!q) return reply("⚠️ *Please provide a prompt or question!* Example: `.ai Explain quantum computing`");

    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
        return reply("❌ *Gemini API Key is missing.* Please set `GEMINI_API_KEY` in environment settings.");
    }

    try {
        const genAIModule = await import('@google/genai');
        const GenAIClass = genAIModule.GoogleGenAI || genAIModule.default?.GoogleGenAI;

        if (!GenAIClass) {
            return reply("❌ *Could not load GoogleGenAI SDK module.*");
        }

        const ai = new GenAIClass({
            apiKey,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: q,
            config: {
                systemInstruction: "You are BOSS-MD, a helpful, intelligent WhatsApp AI assistant."
            }
        });

        const answer = response.text || "No response generated from model.";
        return reply(`🧠 *BOSS-MD Gemini AI*:\n\n${answer}`);
    } catch (err) {
        return reply(`❌ *AI Request Error*: ${err.message}`);
    }
});
