const env = require('./utils');

const formartMessage = (level, message) =>{
    const timeStamp = new Date().toISOString();

    return `[${timeStamp}] [${level.toUpperCase()}] [Port:${env.PORT}]: ${message}`;

};

const logger = {
    info: (message) =>{
        console.log(formartMessage('info', message));
    },
    error: (message) =>{
        console.error(formartMessage('error', message));
    },
    warn: (message) => {
        console.log(formartMessage('warn', message));
    },
    debug: (message) =>{
        if(env.NODE_ENV != 'production'){
            console.log(formartMessage('debug', message));
        }
    }
};

module.exports = logger;