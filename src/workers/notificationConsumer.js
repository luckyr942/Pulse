const { connectRabbitMQ, getChannel } = require('../config/rabbitmq');
const { RABBITMQ } = require('../shared/constants/messageStatus');
const logger = require('../config/logger');

const notifbackgroundWorker = async () =>{
    await connectRabbitMQ();

    const channel = getChannel();
    const queueName = RABBITMQ.QUEUES.NOTIFICATIONS;

    logger.info(`Notification Consumer Worker listening on queue: ${queueName}`);

    channel.consume(queueName, (msg) =>{
        if(!msg) return;

        try {
            const data = JSON.parse(msg.content.toString());

            logger.info(`[Notification Sent] To recipient: ${data.recipientId} 
                 | From sender: ${data.senderName} 
                 | Message excerpt: "${data.content}"`);
            
            //Acknowledge receipt
            channel.ack(msg);

        } catch (error) {
            logger.error('Error procesing notification worker thread', error);
            
            channel.nack(msg, false, false); //Don't queue invalid notification payloads
        }
    });
};

notifbackgroundWorker();