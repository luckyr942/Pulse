module.exports = {
    HTTP_STATUS:{
        OK: 200,
        CREATED: 201,
        ACCEPTED: 202,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        INTERNAL_SERVER_ERROR: 500,
    },

    MESSAGE_STATUS: {
        SENT: 'sent',
        DELIVERED: 'delivered',
        READ: 'read'
    },

    RABBITMQ: {
        QUEUES: {
            PERSISTENCE: 'chat.persistence',
            NOTIFICATIONS: 'chat.notifications',
            RETRY: 'chat.retry',
            DEAD_LETTER: 'chat.deadletter'
        },

        EXCHANGES: {
            CHAT_EVENTS: 'chat.events'
        },

        ROUTING_KEYS:{
            MESSAGE_SENT: 'message.sent',
            MESSAGE_OFFLINE: 'message.offline',
            MESSAGE_RETRY: 'message.retry',
            MESSAGE_FAIL: 'message.fail'
        }
    },

    REDIS: {
        CHANNELS: {
            USER_SOCKET: 'user.socket',
            SERVER_BROADCAST: 'user.broadcast'
        },
        KEYS: {
            PRESENCE_USER: 'presence:user:',
            STATS_CONNECTIONS: 'stats:connections:'
        }
    },

    SOCKET_EVENTS: {
        SEND_MESSAGE: 'send_message',
        RECEIVE_MESSAGE: 'receive_message',
        MESSAGE_DELIVERED: 'message_delivered',
        MESSAGE_READ: 'message_read',
        USER_TYPING: 'user_typing',
        USER_STOPPED_TYPING: 'user_stopped_typing',
        PRESENCE_UPDATE: 'presence_update'
    }
};