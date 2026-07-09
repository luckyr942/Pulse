const { redisPubClient, redisSubClient } = require('../config/redis');
const { REDIS } = require('../shared/constants/messageStatus');
const logger = require('../config/logger');

let scoketManagerRef = null; //to deliver Socket package 

const initRedisPubSub = (socketManager) =>{
    socketManagerRef = socketManager,

    redisSubClient.on('message', (channel,message) =>{
        try {
            const data = JSON.parse(message);

            if(channel.startsWith(REDIS.CHANNELS.USER_SOCKET)){
                const userId = channel.split(':')[1];
                logger.debug(`Recieved inter-server route event for user ${userId}`);

                if(socketManagerRef){
                    socketManagerRef.deliverLocal(userId,data);
                }
            }
        } catch (error) {
            logger.error('Failed to process inter-server Redis PubSub message', error);
        }
    });
};

//now subscrive the node to listen the messgae for the user
const subscribeToUserChannel = async (userId) => {
  const channel = `${REDIS.CHANNELS.USER_SOCKET}:${userId}`;
  await redisSubClient.subscribe(channel);
  logger.debug(`Subscribed to inter-server channel: ${channel}`);
};
// Unsubscribe local node from user's messages
const unsubscribeFromUserChannel = async (userId) => {
  const channel = `${REDIS.CHANNELS.USER_SOCKET}:${userId}`;
  await redisSubClient.unsubscribe(channel);
  logger.debug(`Unsubscribed from inter-server channel: ${channel}`);
};
// Publish a message payload across instances to the recipient's channel
const publishToUser = async (recipientId, messagePayload) => {
  const channel = `${REDIS.CHANNELS.USER_SOCKET}:${recipientId}`;
  const payloadString = JSON.stringify(messagePayload);
  await redisPubClient.publish(channel, payloadString);
  logger.debug(`Published to inter-server channel: ${channel}`);
};
module.exports = {
  initRedisPubSub,
  subscribeToUserChannel,
  unsubscribeFromUserChannel,
  publishToUser
};