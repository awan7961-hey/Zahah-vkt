const fs = require('fs');
const path = require('path');

const commands = [];

function cmd(info, func) {
    const data = {
        pattern: info.pattern,
        alias: info.alias || [],
        desc: info.desc || '',
        category: info.category || 'misc',
        react: info.react || '',
        enabled: info.enabled !== false,
        onlyOwner: !!info.onlyOwner,
        isGroup: !!info.isGroup,
        function: func
    };
    commands.push(data);
    return data;
}

function loadPlugins(pluginDirPath) {
    if (!fs.existsSync(pluginDirPath)) return 0;
    const files = fs.readdirSync(pluginDirPath);
    let count = 0;
    for (const file of files) {
        if (file.endsWith('.cjs') || file.endsWith('.js')) {
            const filePath = path.join(pluginDirPath, file);
            try {
                delete require.cache[require.resolve(filePath)];
                require(filePath);
                count++;
            } catch (err) {
                console.error(`Error loading plugin ${file}:`, err.message);
            }
        }
    }
    return count;
}

function reloadPlugins(pluginDirPath) {
    commands.length = 0;
    return loadPlugins(pluginDirPath);
}

module.exports = {
    cmd,
    commands,
    loadPlugins,
    reloadPlugins
};
