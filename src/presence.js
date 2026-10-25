
'use strict';

const { ActivityType } = require('discord.js');
const logger = require('./logger');

function applyListeningPresence(client) {
  client.user.setPresence({
    activities: [
      {
        name: 'everything',
        type: ActivityType.Listening,
      },
    ],
    status: 'online',
  });

  logger.success('Presence set to Listening to Your complaints');
}

module.exports = {
  applyListeningPresence,
};
