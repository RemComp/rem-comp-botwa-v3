const fs = require('fs');
const path = require('path');

/**
 * Recursively search for command files in directories
 * @param {string} dirPath - The directory path to search
 * @param {string} relativePath - The relative path for naming commands
 * @returns {Array} Array of command objects
 */
function loadCommandsRecursively(dirPath, relativePath = '') {
    const commandTmp = [];
    
    try {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const isDir = fs.statSync(itemPath).isDirectory();
            
            if (item.endsWith('.js')) {
                // Load JavaScript command files
                const commandLoad = require(itemPath);
                
                // Skip functions.js files as they contain utility functions
                if (item === 'functions.js') continue;
                
                if (!commandLoad || !commandLoad.messageHandler) {
                    global.log.warn(`Command ${relativePath}${item} is not valid or does not have a messageHandler function.`);
                    continue;
                }
                
                const fileNameWithoutExt = item.slice(0, -3);
                const commandPriority = commandLoad.priority || 0;
                
                // Determine command name based on file structure
                let commandName;
                if (relativePath === '') {
                    // Root level command file
                    commandName = fileNameWithoutExt;
                } else if (fileNameWithoutExt === 'index') {
                    // index.js in subdirectory - use directory name
                    commandName = relativePath.slice(0, -1); // Remove trailing slash
                } else {
                    // Named file in subdirectory
                    commandName = `${relativePath}${fileNameWithoutExt}`;
                }
                
                commandTmp.push({
                    name: commandName,
                    messageHandler: commandLoad.messageHandler,
                    isAwait: commandLoad.isAwait || false,
                    cmd: commandLoad?.cmd || false,
                    priority: commandPriority
                });
                
                global.log.debug(`Loaded command: ${commandName} from ${relativePath}${item}`);
                
            } else if (isDir) {
                // Recursively search subdirectories
                const newRelativePath = relativePath + item + '/';
                const subCommands = loadCommandsRecursively(itemPath, newRelativePath);
                commandTmp.push(...subCommands);
            }
        }
    } catch (error) {
        global.log.error(`Error reading directory ${dirPath}:`, error.message);
    }
    
    return commandTmp;
}

async function loadCommand() {
    const commandDir = path.resolve(`${process.cwd()}/command/`);
    
    if (!fs.existsSync(commandDir)) {
        global.log.error(`Command directory does not exist: ${commandDir}`);
        return;
    }
    
    global.log.info('Loading commands recursively...');
    
    // Load all commands recursively
    const commandTmp = loadCommandsRecursively(commandDir);
    
    // Sort commands by priority
    commandTmp.sort((a, b) => a.priority - b.priority);
    
    // Store globally
    global.listCommand = commandTmp;
    
    global.log.info(`Successfully loaded ${commandTmp.length} commands`);
    
    // Log loaded command names for debugging
    if (process.env.DEV_MODE === 'true') {
        const commandNames = commandTmp.map(cmd => cmd.name).join(', ');
        global.log.debug(`Loaded commands: ${commandNames}`);
    }
}

if (process.env.DEV_MODE === 'true') {
    fs.watch(path.resolve(`${process.cwd()}/command/`), async (eventType, filename) => {
        global.log.info(`Command directory changed: ${eventType} - ${filename}`);
        if (eventType === 'change' || eventType === 'rename') {
            await loadCommand();
        }
    });
}

exports.loadCommand = loadCommand;