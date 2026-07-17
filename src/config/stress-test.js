const { io } = require('socket.io-client');
const http = require('http');
const mongoose = require('mongoose');

const BACKEND_URL = 'http://localhost:3001';
const MONGO_URI = 'mongodb+srv://luckyrajchoudhary2901_db_user:fwc_db_pass@cluster0.iof38iu.mongodb.net/?appName=Cluster0';

// Helper function to make HTTP POST requests
const postRequest = (path, data) => {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
};

const runStressTest = async () => {
  console.log('🏁 Starting Pulse Scalability & Stress Test...');
  
  try {
    // 1. Create two virtual users for the stress test
    const user1Name = `stress_alice_${Date.now()}`;
    const user2Name = `stress_bob_${Date.now()}`;
    
    console.log(`👤 Registering Stress Alice (${user1Name})...`);
    const reg1 = await postRequest('/api/auth/register', { username: user1Name, password: 'password123' });
    if (!reg1.success) throw new Error('Failed to register Alice');
    const aliceToken = reg1.data.token;
    const aliceId = reg1.data.user.id;
    
    console.log(`👤 Registering Stress Bob (${user2Name})...`);
    const reg2 = await postRequest('/api/auth/register', { username: user2Name, password: 'password123' });
    if (!reg2.success) throw new Error('Failed to register Bob');
    const bobToken = reg2.data.token;
    const bobId = reg2.data.user.id;

    // 2. Establish a conversation session between them
    console.log('💬 Creating chat conversation room between Alice and Bob...');
    const convRes = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3001,
        path: '/api/conversations',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aliceToken}`
        }
      }, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => resolve(JSON.parse(body)));
      });
      req.on('error', reject);
      req.write(JSON.stringify({ recipientId: bobId }));
      req.end();
    });

    if (!convRes.success) throw new Error('Failed to create conversation session');
    const conversationId = convRes.data._id;
    console.log(`✅ Conversation Room Created: ID = ${conversationId}`);

    // 3. Connect both users to WebSocket Gateway via Socket.IO
    console.log('🔌 Connecting Alice and Bob to Socket.IO WebSocket Gateway...');
    const aliceSocket = io(BACKEND_URL, { auth: { token: aliceToken } });
    const bobSocket = io(BACKEND_URL, { auth: { token: bobToken } });

    await Promise.all([
      new Promise((resolve) => aliceSocket.on('connect', resolve)),
      new Promise((resolve) => bobSocket.on('connect', resolve))
    ]);
    console.log('🟢 Alice & Bob connected to WebSocket nodes successfully!');

    // Track received messages for Bob
    let bobReceivedCount = 0;
    bobSocket.on('receive_message', (msg) => {
      if (msg.conversationId === conversationId) {
        bobReceivedCount++;
      }
    });

    // 4. Begin Stress Load Emitting
    const totalMessages = 100;
    console.log(`⚡ Emitting ${totalMessages} messages from Alice to Bob sequentially under high throughput...`);

    const startTime = Date.now();
    let sentCount = 0;
    let ackCount = 0;

    for (let i = 0; i < totalMessages; i++) {
      const payload = {
        conversationId,
        recipientId: bobId,
        content: `Stress test message payload #${i}`,
        messageType: 'text',
        idempotencyKey: `stress_${conversationId}_${i}`
      };

      sentCount++;
      aliceSocket.emit('send_message', payload, (ack) => {
        if (ack?.success) {
          ackCount++;
        }
      });
      // Small 5ms delay to prevent socket pipe overflow, resulting in ~200 msg/sec load
      await new Promise(r => setTimeout(r, 5));
    }

    // Wait a couple of seconds for all socket events and queue messages to process
    console.log('⏳ Waiting for all WebSocket deliveries and RabbitMQ consumers to finish...');
    await new Promise(r => setTimeout(r, 3000));

    const endTime = Date.now();
    const durationSec = (endTime - startTime - 3000) / 1000;
    const throughput = sentCount / durationSec;

    console.log('\n--- 📊 STRESS TEST SUMMARY ---');
    console.log(`⏱️  Total Duration: ${durationSec.toFixed(2)} seconds`);
    console.log(`✉️  Messages Sent by Alice: ${sentCount}`);
    console.log(`✅ Server Acknowledged (Socket level): ${ackCount} / ${totalMessages}`);
    console.log(`📥 Bob Received (Socket level): ${bobReceivedCount} / ${totalMessages}`);
    console.log(`⚡ Throughput Rate: ${throughput.toFixed(1)} messages/second`);

    // 5. Connect to MongoDB to verify persistence
    console.log('\n🔍 Verifying MongoDB write-behind persistence...');
    await mongoose.connect(MONGO_URI);
    
    // Import Message model dynamically
    require('../models/Message');
    const Message = mongoose.model('Message');
    const persistedCount = await Message.countDocuments({ conversationId });
    console.log(`💾 Saved Messages in MongoDB: ${persistedCount} / ${totalMessages}`);

    if (persistedCount === totalMessages) {
      console.log('🏆 SUCCESS: All messages successfully written to database without blocking server event loop!');
    } else {
      console.log('⚠️ WARNING: DB writes and messages sent count mismatch. Ensure DB Consumer worker is active.');
    }

    // Cleanup
    aliceSocket.disconnect();
    bobSocket.disconnect();
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Stress Test Failed:', error);
    process.exit(1);
  }
};

runStressTest();
