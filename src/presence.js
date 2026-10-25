
'use strict';

const { ActivityType } = require('discord.js');
const logger = require('./logger');

function applyListeningPresence(client) {
  client.user.setPresence({
    activities: [
      {
        name: 'Your complaints',
        type: ActivityType.Listening,
      },
    ],
    status: 'idle',
  });

  logger.success('Presence set to Listening to everything');
}

module.exports = {
  applyListeningPresence,
};
