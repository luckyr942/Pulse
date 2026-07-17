//this is for the publish channel connection to rabbitmq

const { getChannel, EXCHANGE, MSG_SENT_KEY, MSG_OFFLINE_KEY } = require('../config/rabbitmq');
const logger = require('../config/logger');

// Publishes message to write-behind persistence queue 
// (chat.persistence)
const publishToPersistence = (messageData) =>{
    try{
        const channel = getChannel();
        const payload = Buffer.from(JSON.stringify(messageData));
        
        //routing key: 'message.sent'
        channel.publish(EXCHANGE, MSG_SENT_KEY, payload, {persistent: true});
        logger.debug(`Published to Persistence Queue: key = ${messageData.idempotencyKey} for message ${messageData.idempotencyKey}`);

    }catch(error){
        logger.error('Failed to publish persistence event to RabbitMQ', error);
    }
};

// Publishes offline alerts to notifications queue 
// (chat.notifications)
const publishToNotifications = (notificationData) =>{
    try{
        const channel = getChannel();
        const payload = Buffer.from(JSON.stringify(notificationData));

        //routing key : 'message.offlibe
        channel.publish(EXCHANGE, MSG_OFFLINE_KEY, payload, {persistent: true});
        logger.debug(`Peublished to Notification Queue for user: ${notificationData.recipientId}`);
    }
    catch (error) {
    logger.error('Failed to publish offline notification to RabbitMQ', error);
  }
};

module.exports = {
    publishToPersistence,
    publishToNotifications
};