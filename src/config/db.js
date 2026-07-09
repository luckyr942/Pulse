const mongoose = require('mongoose');
const env = require('./utils');
const logger = require('./logger');

const connectDatabase = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 5000 // Time out after 5s if MongoDB is down
    };
    
    const connection = await mongoose.connect(env.MONGODB_URL, options);
    logger.info(`Database Connected: ${connection.connection.host}`);
  } catch (error) {
    logger.error(`Database Connection Error: ${error.message}`);
    logger.info('Retrying database connection in 5 seconds...');
    // Retry logic
    setTimeout(connectDatabase, 5000);
  }
};

module.exports = connectDatabase;
