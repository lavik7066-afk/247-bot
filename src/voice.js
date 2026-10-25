
'use strict';

const {
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
} = require('@discordjs/voice');

const config = require('./config');
const logger = require('./logger');

const RECONNECT_RETRY_DELAY_MS = 5000;
const DISCONNECT_RECOVERY_TIMEOUT_MS = 30000;
const STATE_CHANGE_TIMEOUT_MS = 20000;

let reconnectTimer = null;
let isConnecting = false;

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect(client) {
  if (reconnectTimer) return;

  logger.reconnect(
    `Retrying in ${RECONNECT_RETRY_DELAY_MS / 1000} seconds...`
  );

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;

    joinTargetVoiceChannel(client).catch((error) => {
      logger.error(`Unexpected reconnect error: ${error.message}`);
      scheduleReconnect(client);
    });
  }, RECONNECT_RETRY_DELAY_MS);
}

function safeDestroy(connection) {
  try {
    if (
      connection &&
      connection.state.status !== VoiceConnectionStatus.Destroyed
    ) {
      connection.destroy();
    }
  } catch (error) {
    logger.error(`Failed to destroy voice connection: ${error.message}`);
  }
}

async function setVoiceChannelStatus(channelId) {
  const status = config.voiceChannelStatus;

  if (!status) return;

  try {
    const response = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/voice-status`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${config.botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      }
    );

    if (!response.ok) {
      const details = await response.text();

      logger.error(
        `Voice status failed (${response.status}): ${details}`
      );
      return;
    }

    logger.success(`Voice status set to: ${status}`);
  } catch (error) {
    logger.error(`Voice status request failed: ${error.message}`);
  }
}

function attachConnectionListeners(connection, client) {
  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    logger.warn('Voice disconnected. Waiting for recovery...');

    try {
      await entersState(
        connection,
        VoiceConnectionStatus.Ready,
        DISCONNECT_RECOVERY_TIMEOUT_MS
      );

      logger.success('Voice connection recovered.');
      await setVoiceChannelStatus(config.voiceChannelId);
    } catch {
      logger.warn('Voice recovery failed. Reconnecting...');
      safeDestroy(connection);
      scheduleReconnect(client);
    }
  });

  connection.on(VoiceConnectionStatus.Destroyed, () => {
    logger.warn('Voice connection destroyed.');
    scheduleReconnect(client);
  });

  connection.on('error', (error) => {
    logger.error(`Voice connection error: ${error.message}`);
  });
}

async function joinTargetVoiceChannel(client) {
  if (isConnecting) return;

  isConnecting = true;

  try {
    clearReconnectTimer();

    const guild = await client.guilds.fetch(config.guildId);

    if (!guild) {
      logger.error('Configured server was not found.');
      scheduleReconnect(client);
      return;
    }

    const channel = await guild.channels
      .fetch(config.voiceChannelId)
      .catch(() => null);

    if (!channel || !channel.isVoiceBased()) {
      logger.error('Configured voice channel was not found.');
      scheduleReconnect(client);
      return;
    }

    const existingConnection = getVoiceConnection(config.guildId);

    if (
      existingConnection &&
      existingConnection.state.status === VoiceConnectionStatus.Ready &&
      existingConnection.joinConfig.channelId === config.voiceChannelId
    ) {
      logger.info('Already connected to the target voice channel.');
      await setVoiceChannelStatus(channel.id);
      return;
    }

    if (existingConnection) {
      safeDestroy(existingConnection);
    }

    logger.voice(`Joining voice channel "${channel.name}"...`);

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
    });

    attachConnectionListeners(connection, client);

    await entersState(
      connection,
      VoiceConnectionStatus.Ready,
      STATE_CHANGE_TIMEOUT_MS
    );

    logger.success(`Connected to "${channel.name}". Staying 24/7.`);

    await setVoiceChannelStatus(channel.id);
  } catch (error) {
    logger.error(`Failed to join voice channel: ${error.message}`);
    scheduleReconnect(client);
  } finally {
    isConnecting = false;
  }
}

function isConnectedToVoice() {
  const connection = getVoiceConnection(config.guildId);

  return Boolean(
    connection &&
    connection.state.status === VoiceConnectionStatus.Ready
  );
}

module.exports = {
  joinTargetVoiceChannel,
  isConnectedToVoice,
};
