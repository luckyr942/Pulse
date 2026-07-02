const amqp = require('amqplib');
const env = require('./utils');

let connection = null;
let channel = null;

// Define Exchange and Queue names
const EXCHANGE = 'chat.events';
const PERSISTENCE_QUEUE = 'chat.persistence';
const NOTIFICATION_QUEUE = 'chat.notifications';

// Define Routing Keys
const MSG_SENT_KEY = 'message.sent';
const MSG_OFFLINE_KEY = 'message.offline';

const connectRabbitMQ = async () => {
  try {
    // 1. Connect to RabbitMQ broker
    connection = await amqp.connect(env.RABBITMQ_URL);
    console.log('RabbitMQ Connected successfully.');

    // 2. Create a channel for communication
    channel = await connection.createChannel();

    // 3. Declare a topic exchange (events route based on dot-separated keys)
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

    // 4. Declare queues as durable so messages survive broker restarts
    await channel.assertQueue(PERSISTENCE_QUEUE, { durable: true });
    await channel.assertQueue(NOTIFICATION_QUEUE, { durable: true });

    // 5. Bind queues to the exchange with routing keys
    // Persistence queue handles all messages that need saving to MongoDB
    await channel.bindQueue(PERSISTENCE_QUEUE, EXCHANGE, MSG_SENT_KEY);
    // Notification queue handles events for users who are currently offline
    await channel.bindQueue(NOTIFICATION_QUEUE, EXCHANGE, MSG_OFFLINE_KEY);

    console.log('RabbitMQ Topology (Exchange, Queues, Bindings) initialized.');

    // Listen for connection drops and attempt reconnection
    connection.on('error', (err) => {
      console.error('RabbitMQ Connection Error:', err.message);
      reconnect();
    });

    connection.on('close', () => {
      console.log('RabbitMQ Connection Closed. Reconnecting...');
      reconnect();
    });

  } catch (error) {
    console.error('RabbitMQ Connection Failed:', error.message);
    reconnect();
  }
};

const reconnect = () => {
  setTimeout(connectRabbitMQ, 5000);
};

// Safe getter to access the active channel from other files
const getChannel = () => {
  if (!channel) throw new Error('RabbitMQ channel not initialized');
  return channel;
};

module.exports = {
  connectRabbitMQ,
  getChannel,
  EXCHANGE,
  MSG_SENT_KEY,
  MSG_OFFLINE_KEY
};
