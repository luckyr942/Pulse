const Redis = require('ioredis');
const env = require('./utils');

//now the instance for the redis 
const redisInstCreateClient = (name) =>{
  const client = new Redis(env.REDIS_URL,{
    //maxReties per request 
    maxRetriesPerRequest: null, //to prevent from connection drops
    retryStartegy(times){
      const delay = Math.max(times*100, 3000); //3 sec dealy for the new request
      return delay;
    }
  });

  //connection listen 
  client.on('connect', () =>{
    console.log(`Redis (${name}) Connected successfully.`);
  });

  client.on('error', (err) =>{
    console.error(`Redis (${name}) Connection error:`, error.message);
  });

  return client;
};

//now the three seperate client for the system needed
const redisClient = redisInstCreateClient('Cache');
const redisPubClient = redisInstCreateClient('Pub');
const redisSubClient = redisInstCreateClient('Sub');

module.exports = {
  redisClient,
  redisPubClient,
  redisSubClient
}