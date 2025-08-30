const priority = 3;
const isAwait = false;
const cmd = ['ping'];

async function messageHandler(
  rem,
  message,
  userDb,
  groupDb,
  mentionUserDb,
  clientData
) {
  const latency = Date.now() - (message.t || message.timestamp || Date.now());

  const replyText = `*Pong!* 🏓

*Latency:* ${latency} ms
*Status:* Online
*ID:* BOT_${rem.apiKey}`;

  await rem.reply(message.from, replyText);
}

module.exports = {
  priority,
  isAwait,
  cmd,
  messageHandler,
};
