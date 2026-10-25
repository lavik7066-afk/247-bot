
'use strict';

require('dotenv').config();

const REQUIRED_ENV_VARS = ['BOT_TOKEN', 'GUILD_ID', 'VOICE_CHANNEL_ID'];

function validateConfig() {
  const missing = REQUIRED_ENV_VARS.filter(
    (key) => !process.env[key] || process.env[key].trim() === ''
  );

  if (missing.length > 0) {
    console.error(
      `[ERROR] Missing required environment variables: ${missing.join(', ')}`
    );
    process.exit(1);
  }
}

validateConfig();

const config = {
  botToken: process.env.BOT_TOKEN.trim(),
  guildId: process.env.GUILD_ID.trim(),
  voiceChannelId: process.env.VOICE_CHANNEL_ID.trim(),

  voiceChannelStatus: (
    process.env.VOICE_CHANNEL_STATUS || '<a:hk_sleep:1563806955326275759> Sleeping'
  ).trim(),

  twitch: {
    name: (process.env.TWITCH_STREAM_NAME || '').trim(),
    url: (process.env.TWITCH_STREAM_URL || '').trim(),
  },
};

module.exports = config;
