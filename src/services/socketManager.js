const jwt = require('jsonwebtoken');
const env = require('../config/utils');
const logger = require('../config/logger');
const { redisClient } = require('../config/redis');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { REDIS, SOCKET_EVENTS } = require('../shared/constants/messageStatus');
const { subcribeToUserChannel,unsubscribeFromUserChannel, publishToUser, subscribeToUserChannel } = require('./redisPubSub');
const {publishToPersistence,publishToNotifications} = require('./publisher');

//to map the active socket connection on this locl node (userId -> socketId )
const localSocket = new Map();

const initSocketManager = (io) =>{
    //verify the jwt for authentiation
    io.use(async (socket, next) =>{
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers['x-auth-token'];
            if(!token) {
                return next(new Error('Authentication token required'));
            }

            const decoded = jwt.verify(token, env.JWT_SECRET);
            const user = await User.findById(decoded.id);

            if(!user){
                return next(new Error("User no longer exists"));
            }
            socket.user = user;
            next();
        } catch (err) {
            logger.error('Socket authentication failed', err);
            next(new Error('Invalid token'));
        }
    });

    //Handle connection
    io.on('connection', async (socket) =>{
        const userId = socket.user._id.toString();
        localSocket.set(userId, socket.id);

        logger.info(`User connected locally: ${socket.user.userName}) (${userId})`);
    

        //1 -> presence status to Redis with a 30s TTL 
        const presenceKey = `${REDIS.KEYS.PRESENCE_USER}${userId}`;
        await redisClient.set(presenceKey, env.PORT, 'EX', 30);

        //2 -> now subscribe the server node to recieve interserver events to thos user
        await subscribeToUserChannel(userId);

        //3 -> now broadcast status update
        io.emit(SOCKET_EVENTS.PRESENCE_UPDATE, {userId, status: 'online'});

        //Client HEARTBEAT: client tick to keep presence active in Redis Cache
        socket.on('heartbeat', async () => {
            await redisClient.set(presenceKey, env.PORT,  'EX', 30);
        });

        //SEND MESSAGE HADLING
        socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (payload, callback) =>{
            try {
                const {conversationId, recipientId, content, messageType, idempotencyKey} = payload;

                if(!conversationId || !recipientId || !content || !idempotencyKey ) {
                    return callback && callback({ error: 'Missing required parameters '});
                }

                const messageData = {
                    conversationId,
                    senderId: userId,
                    content,
                    messageType: messageType || 'text',
                    idempotencyKey,
                    status: 'sent',
                    createdAt: new Date().toISOString()
                };

                //step 1: to check the presence of recipient
                const recipientPresenceKey = `${REDIS.KEYS.PRESENCE_USER}${recipientId}`;
                const recipientPort = await redisClient.get(recipientPresenceKey);
                
                if(recipientPort){
                    //recipient is online
                    if(parseInt(recipientPort, 10) === env.PORT) {
                        //CaseA : Connected to the Same server node --> direct delivery 
                        deliverLocal(recipientId, messageData);
                    }else {
                        //Case B : different server connect node -> route via Redis PubSub
                        await publishToUser(recipientId, messageData);
                    }
                }
                else{
                    //Case C: Recipinet is offline --> ROute alert RabbitMQ notification Queue
                    publishToNotifications({
                        recipientId,
                        senderName: socket.user.userName,
                        content: content.substring(0,50),
                        idempotencyKey
                    });
                }

                //Step 2 : Asynchornously queue database persistence write via RabbitMq
                publishToPersistence(messageData);
                
                //Acknowledge receipt back to sender
                if(callback) callback({ success: true, message: messageData});
                
            } catch (error) {
                logger.error('Failed to handle socket send_message event', error);
                if(callback) callback({error: 'Internal Server Error'});
            }
        });

        //Handle typing events
        socket.on(SOCKET_EVENTS.USER_TYPING, (payload) =>{
            const { recipientId, conversationId } = payload;
            //forward typing state to user
            forwardEventToUser(recipientId, SOCKET_EVENTS.USER_TYPING, {
                senderId: userId,
                conversationId
            });
        });

        socket.on(SOCKET_EVENTS.USER_STOPPED_TYPING , (payload) => {
            const { recipientId, conversationId } = payload;
            forwardEventToUser(recipientId, SOCKET_EVENTS.USER_STOPPED_TYPING, {
                senderId: userId,
                conversationId
            });
        });

        //Handle Disconnect
        socket.on('disconnect', async() =>{
            localSocket.delete(userId);
            logger.info(`User disconnected locally: ${socket.user.userName} (${userId}`);

            //remove the redis presence indicator
            await redisClient.del(presenceKey);

            //unsubscribe from the redis inter-server channel
            await unsubscribeFromUserChannel(userId);

            //broadcast presence state
            io.emit(SOCKET_EVENTS.PRESENCE_UPDATE, {userId, status: 'offline'});
        });
    });
};


//deliver a msg to socket connected directly to this port
const deliverLocal = (userId, messageData) =>{
    const socketId = localSocket.get(userId);
    if(socketId){
        global.io.to(socketId).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, messageData);
        logger.debug(`Socket delivered locally to user ${userId} on port ${env.PORT}`);
    }
};

//routing helper to target specific user across nodes
const forwardEventToUser = async (recipientId, eventNames, payload) =>{
    const recipientPresenceKey = `${REDIS.KEYS.PRESENCE_USER}${recipientId}`;
    const recipientPort = await redisClient.get(recipientPresenceKey);
    
    if (recipientPort) {
        if (parseInt(recipientPort, 10) === env.PORT) {
         const socketId = localSocket.get(recipientId);
        if (socketId) global.io.to(socketId).emit(eventNames, payload);
    } else {
      await publishToUser(recipientId, { eventName, payload });
    }
  }
};

module.exports = {
    initSocketManager,
    deliverLocal
};