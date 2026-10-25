
'use strict';

const { Events } = require('discord.js');

const logger = require('../logger');
const { joinTargetVoiceChannel } = require('../voice');
const { applyListeningPresence } = require('../presence');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.success(`Bot Online — logged in as ${client.user.tag}`);

    applyListeningPresence(client);

    logger.voice('Joining Voice...');
    await joinTargetVoiceChannel(client);
  },
};
