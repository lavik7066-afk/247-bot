
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { Client, GatewayIntentBits } = require('discord.js');

const config = require('./config');
const logger = require('./logger');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

function loadEvents(discordClient) {
  const eventsPath = path.join(__dirname, 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (!event?.name || typeof event.execute !== 'function') {
      logger.warn(`Skipping invalid event file: ${file}`);
      continue;
    }

    if (event.once) {
      discordClient.once(event.name, (...args) => event.execute(...args));
    } else {
      discordClient.on(event.name, (...args) => event.execute(...args));
    }

    logger.info(`Loaded event: ${event.name}`);
  }
}

function registerProcessSafetyNets() {
  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled promise rejection: ${reason instanceof Error ? reason.stack : reason}`);
  });

  process.on('uncaughtException', (error) => {
    logger.error(`Uncaught exception: ${error.stack || error.message}`);
  });
}

async function main() {
  registerProcessSafetyNets();
  loadEvents(client);

  logger.info('Logging in...');
  await client.login(config.botToken);
}

main().catch((error) => {
  logger.error(`Fatal error during startup: ${error.stack || error.message}`);
  process.exit(1);
});
