const mongoose = require('mongoose');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const MOCK_USERS = [
  {
    _id: new mongoose.Types.ObjectId('6a500abb2109979c5eaaa39a'),
    userName: 'alice',
    password: 'password123'
  },
  {
    _id: new mongoose.Types.ObjectId('6a500abb2109979c5eaaa39b'),
    userName: 'bob',
    password: 'password123'
  },
  {
    _id: new mongoose.Types.ObjectId('6a500abb2109979c5eaaa39c'),
    userName: 'charlie',
    password: 'password123'
  }
];

const seedMockData = async () => {
  try {
    const mongoUri = 'mongodb+srv://luckyrajchoudhary2901_db_user:fwc_db_pass@cluster0.iof38iu.mongodb.net/?appName=Cluster0';
    await mongoose.connect(mongoUri);
    console.log('Database connected for seeding...');

    for (const mockUser of MOCK_USERS) {
      const existing = await User.findById(mockUser._id);
      if (!existing) {
        await User.create(mockUser);
        console.log(`Created mock user: ${mockUser.userName} with ID ${mockUser._id}`);
      } else {
        console.log(`Mock user already exists: ${mockUser.userName}`);
      }
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedMockData();
