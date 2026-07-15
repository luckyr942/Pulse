const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the project root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  HOST: process.env.HOST || '0.0.0.0',
  MONGODB_URL: process.env.MONGODB_URI || 'mongodb://localhost:27017/pulse',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  JWT_SECRET: process.env.JWT_SECRET || 'pulse_secret_key_default'
};

if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set in environment. Using default developer key.');
}

module.exports = config;
