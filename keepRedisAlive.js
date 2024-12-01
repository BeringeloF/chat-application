import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST, // Host do Redis
  port: process.env.REDIS_PORT, // Porta do Redis
  password: process.env.REDIS_PASSWORD, // Senha do Redis (se necessário)
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined, // Para conexões seguras
});

redis.on('error', (err) => console.log(err));

async function keepAlive() {
  await redis.set('keep_alive', 'alive');
  const val = await redis.get('keep_alive');
  console.log(val);
  await redis.del('keep_alive');
}

keepAlive();
