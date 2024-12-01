import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  connectTimeout: 10000,
  readTimeout: 10000,
});

redis.on('error', (err) => console.log(err));

async function keepAlive() {
  try {
    await redis.set('keep_alive', 'alive');
    const val = await redis.get('keep_alive');
    console.log('Redis value:', val);
    await redis.del('keep_alive');
  } catch (err) {
    console.error('Error in keepAlive:', err);
  } finally {
    // Garantir desconexão do Redis para evitar que o script fique "pendurado"
    redis.disconnect();
  }
}

keepAlive();
