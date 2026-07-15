//boots the application: connects database and queues,
//  wraps the server in Socket.IO, 
// initializes real-time controllers,
//  and binds to a dynamic port

const http = require('http');
const{ Server } = require('socket.io');
const app = require('./app');
const env = require('./config/utils');
const logger = require('./config/logger');
const connectDB = require('./config/db');
const { redisClient } = require('./config/redis');
const { connectRabbitMQ } = require('./config/rabbitmq');
const { initRedisPubSub } = require('./services/redisPubSub');
const { initSocketManager } = require('./services/socketManager');

const startServer = async () =>{
    try {
        //initialize db and queue
        await connectDB();
        await connectRabbitMQ();

        //verify the connection to redis container is online
        await redisClient.ping();
        logger.info('Redis connection established');

        //wrap express in HTTP Server
        const server = http.createServer(app);

        const io = new Server(server, {         //Bind Socket.IO Server
            cors:{
                origin: '*',
                methods: ['GET', 'POST']
            }
        });

        global.io = io;

        //intialize or boot real time socket controller and inter-server pUBsub
        const socketManager = require('./services/socketManager');
        initSocketManager(io);
        initRedisPubSub(socketManager);

        //determine dynamic port passed by command line 
        const args = process.argv.slice(2);
        const dynamicPort = args[0] ? parseInt(args[0], 10) : env.PORT;
        env.PORT = dynamicPort; // Update logger port dynamically

        server.listen(dynamicPort, env.HOST, () => {
            logger.info(`WebSocket server node running on ${env.HOST}:${dynamicPort}`);
        });

    } catch (error) {
        logger.error('Critical server bootstrap failure. Server crashed:', error);
        process.exit(1);
    }
};

startServer(); 
