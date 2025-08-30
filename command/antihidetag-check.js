const priority = 2;
const isAwait = false;

function messageHandler(
  rem,
  message,
  _userDb,
  _groupDb,
  _mentionUserDb,
  clientData
) {
  const { isBotGroupAdmins } = clientData;
  if (!message.isGroupMsg || !message.from || !message.sender) return;
  if (!_groupDb?.isAntiHidetag) return;
  if (!isBotGroupAdmins || message.type === 'stickerMessage') return;
  if (!message.body) return;

  const bodyMsgAntiHidetag = caption || body;
  const mentionedJidListAntiHidetag = message.mentionedJidList;
  if (
    bodyMsgAntiHidetag != undefined &&
    !bodyMsgAntiHidetag?.includes('@') &&
    mentionedJidListAntiHidetag?.[0] != undefined
  ) {
    rem
      .reply(
        message.from,
        `*「 ANTI HIDETAG 」*\n\nKamu mengirimkan hidetag, maaf kamu di kick dari grup :(`
      )
      .then(async () => {
        await rem.deleteMessage(message.from, {
          id: message.id,
          remoteJid: message.from,
          fromMe: message.key.fromMe,
          participant: message.key.participant,
        });
        rem.groupParticipantsUpdate(message.from, [message.sender], 'remove');
      });
    return 'break';
  }
}

module.exports = { priority, isAwait, messageHandler };
