const connectDB = require('../config/db');
const { connectRabbitMQ, getChannel } = require('../config/rabbitmq');
const { RABBITMQ } = require('../shared/constants/messageStatus');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const logger = require('../config/logger');

const backgroundWorker = async () =>{
    //connect to DB & RabbitMQ 
    await connectDB();
    await connectRabbitMQ();

    const channel = getChannel();
    const queueName = RABBITMQ.QUEUES.PERSISTANCE;

    // fetch only 10 message ata time to throttle load
    await channel.prefetch(10);

    logger.info(`DB Consumer worker listening on queue: ${queueName}`);

    channel.consume(queueName, async (msg) => {
        if(!msg) return ;

        try {
            const data = JSON.parse(msg.content.toString());

            //check if message was already written (idempotency key protection)
            const existingMessage = await Message.findOne({
                idempotencyKey: data.idempotencyKey});
            
            if(!existingMessage){
                //save the msg to mongoDb
                await Message.create({
                    conversationId: data.conversationId,
                    sender: data.sender,
                    content: data.content,
                    messageType: data.messageType,
                    status: 'sent',
                    idempotencyKey: data.idempotencyKey
                });

                //update the conversation's last message reference
                await Conversation.findByIdAndUpdate(data.conversationId,{
                    lastMessage: data.conversationId, //links the reference,
                    updatedAt: new Date()
                });

                logger.info(`Message persistant : saved key = ${data.idempotencyKey}`);
            } 
            else {
                logger.warn (`Duplicate message ignored: key = ${data.idempotencyKey}`);
            }

            //after successful processing,Acknowledge receipt back to queue to pop message tell rabbitmq to remove the message from queue
            channel.ack(msg);

        } catch (error) {
            logger.error('Error processing database save worker thread', error);

            //reject message to trigger redelivery (false, true = don't requeue)
            //requeue the message on failure (set requeue to true)
            channel.nack(msg, false, true);
        }
    });
};

backgroundWorker();