const mongoose = require('mongoose');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const cleanup = async () => {
  try {
    const mongoUri = 'mongodb+srv://luckyrajchoudhary2901_db_user:fwc_db_pass@cluster0.iof38iu.mongodb.net/?appName=Cluster0';
    await mongoose.connect(mongoUri);
    console.log('Database connected for cleanup...');

    // Clear messages and conversations (keep users)
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    console.log('Deleted all conversations and messages.');

    console.log('Cleanup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error in cleanup:', error);
    process.exit(1);
  }
};

cleanup();
