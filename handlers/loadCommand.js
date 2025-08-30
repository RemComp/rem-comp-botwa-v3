const fs = require('fs');
const path = require('path');

async function loadCommand() {
  const commandList = fs.readdirSync(path.resolve(`${process.cwd()}/command/`));
  const commandTmp = [];
  for (const command of commandList) {
    const isDir = fs
      .statSync(path.resolve(`${process.cwd()}/command/${command}`))
      .isDirectory();
    if (command.endsWith('.js')) {
      const commandName = command.slice(0, -3);
      const commandLoad = require(
        path.resolve(`${process.cwd()}/command/${command}`)
      );
      if (!commandLoad || !commandLoad.messageHandler) {
        global.log.warn(
          `Command ${commandName} is not valid or does not have a messageHandler function.`
        );
        continue; // Skip invalid commands
      }

      const commandPriority = commandLoad.priority || 0;
      commandTmp.push({
        name: commandName,
        messageHandler: commandLoad.messageHandler,
        isAwait: commandLoad.isAwait || false,
        cmd: commandLoad?.cmd || false, // if false will pass any message with/not prefix
        priority: commandPriority,
      });
    } else if (isDir) {
      const commandFiles = fs
        .readdirSync(path.resolve(`${process.cwd()}/command/${command}`))
        .filter((file) => file.endsWith('.js'));
      for (const file of commandFiles) {
        const commandLoad = require(
          path.resolve(`${process.cwd()}/command/${command}/${file}`)
        );
        if (file === 'functions.js') continue; // Skip functions.js file
        if (!commandLoad || !commandLoad.messageHandler) {
          global.log.warn(
            `Command ${command}/${file} is not valid or does not have a messageHandler function.`
          );
          continue; // Skip invalid commands
        }

        const nameCmd = file.slice(0, -3);
        const commandPriority = commandLoad.priority || 0;
        commandTmp.push({
          name:
            nameCmd === 'index' ? command : `${command}/${file.slice(0, -3)}`,
          messageHandler: commandLoad.messageHandler,
          isAwait: commandLoad.isAwait || false,
          cmd: commandLoad?.cmd || false, // if false will pass any message
          priority: commandPriority,
        });
      }
    } else {
      global.log.warn(`Command ${command} is not a valid file or directory.`);
    }
  }
  commandTmp.sort((a, b) => a.priority - b.priority);
  global.listCommand = commandTmp;
  global.log.info(`Loaded ${commandTmp.length} commands`);
}

if (process.env.DEV_MODE === 'true') {
  fs.watch(
    path.resolve(`${process.cwd()}/command/`),
    async (eventType, filename) => {
      global.log.info(`Command directory changed: ${eventType} - ${filename}`);
      if (eventType === 'change' || eventType === 'rename') {
        await loadCommand();
      }
    }
  );
}

exports.loadCommand = loadCommand;
