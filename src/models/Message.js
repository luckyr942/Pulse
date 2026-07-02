const mongoose = require('mongoose');
const { MESSAGE_STATUS } = require('../shared/constants/messageStatus');

const MessageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'video', 'file'],
        default: 'text'
    },
    status: {
        type: String,
        enum: Object.values(MESSAGE_STATUS),
        default: MESSAGE_STATUS.SENT
    },
    deliveredAt: {
        type: Date,
    },
    readAt: {
        type: Date,
    },
    idempotencyKey: {
        type: String,
        required: true,
        unique: true,
        index: true
    }
},{
    timestamps: true
});

module.exports = mongoose.model('Message', MessageSchema);