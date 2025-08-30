const priority = 2;
const isAwait = true;

async function messageHandler(
  rem,
  message,
  _userDb,
  _groupDb,
  _mentionUserDb,
  clientData
) {
  const { prefix, isGroupAdmins } = clientData;
  if (!message.isGroupMsg || !message.from || !message.sender) return;
  if (!_groupDb?.isAntiHidetag) return;
  if (message.type === 'stickerMessage') return;
  if (!message.body) return;

  const isMutedAdmin = _groupDb?.muted?.isMutedAdmin;
  const isMuted = _groupDb?.muted?.isMuted;

  if (message.body == prefix + 'muteadmin') {
    if (!message.isGroupMsg)
      return rem.reply(
        message.from,
        'Perintah ini hanya bisa di gunakan dalam group!'
      );
    if (!isGroupAdmins)
      return rem.reply(
        message.from,
        'Maaf, perintah ini hanya dapat dilakukan oleh Admin Group!'
      );
    if (isMutedAdmin)
      return rem.reply(
        message.from,
        `Bot sudah di mute pada chat ini! _${prefix}unmuteadmin_ untuk unmute!`
      );

    await _mongo_GroupSchema.updateOne(
      { iId: message.from },
      { $set: { muted: { isMutedAdmin: true } } }
    );
    rem.reply(
      message.from,
      'Bot telah di mute dari member pada chat ini! _' +
        prefix +
        'unmuteadmin_ untuk unmute!'
    );
    return 'break';
  } else if (message.body == prefix + 'unmuteadmin') {
    if (!message.isGroupMsg)
      return rem.reply(
        message.from,
        'Perintah ini hanya bisa di gunakan dalam group!'
      );
    if (!isGroupAdmins)
      return rem.reply(
        message.from,
        'Maaf, perintah ini hanya dapat dilakukan oleh Admin Group!'
      );
    if (!isMutedAdmin)
      return rem.reply(message.from, `Bot tidak di mute pada chat ini!`);

    await _mongo_GroupSchema.updateOne(
      { iId: message.from },
      { $set: { muted: { isMutedAdmin: false } } }
    );
    rem.reply(message.from, 'Bot telah di unmute!');
    return 'break';
  }

  if (message.body === prefix + 'mute') {
    if (!message.isGroupMsg)
      return rem.reply(
        message.from,
        'Perintah ini hanya bisa di gunakan dalam group!'
      );
    if (!isGroupAdmins)
      return rem.reply(
        message.from,
        'Maaf, perintah ini hanya dapat dilakukan oleh Admin Group!'
      );
    if (isMuted)
      return rem.reply(
        message.from,
        `Bot sudah di mute pada chat ini! _${prefix}unmute_ untuk unmute!`
      );

    await _mongo_GroupSchema.updateOne(
      { iId: message.from },
      { $set: { muted: { isMuted: true } } }
    );
    rem.reply(
      message.from,
      'Bot telah di mute pada chat ini! _' + prefix + 'unmute_ untuk unmute!'
    );
    return 'break';
  } else if (message.body === prefix + 'unmute') {
    if (!message.isGroupMsg)
      return rem.reply(
        message.from,
        'Perintah ini hanya bisa di gunakan dalam group!'
      );
    if (!isGroupAdmins)
      return rem.reply(
        message.from,
        'Maaf, perintah ini hanya dapat dilakukan oleh Admin Group!'
      );
    if (!isMuted)
      return rem.reply(message.from, `Bot tidak di mute pada chat ini!`);

    await _mongo_GroupSchema.updateOne(
      { iId: message.from },
      { $set: { muted: { isMuted: false } } }
    );
    rem.reply(message.from, 'Bot telah di unmute!');
    return 'break';
  }

  if (isMutedAdmin && !isGroupAdmins) return 'break';
  if (isMuted) return 'break';
}

module.exports = { priority, isAwait, messageHandler };
