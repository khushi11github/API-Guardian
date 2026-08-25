import dotenv from 'dotenv';
dotenv.config();

import IORedis from 'ioredis';
import { createMonitoringWorker } from './workers/monitoring.worker.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

console.log(`🚀 Starting API Guardian Background Monitoring Worker...`);
console.log(`Connected to Redis at: ${redisUrl}`);

const monitoringWorker = createMonitoringWorker(redis);

const shutdown = async (signal: string) => {
  console.log(`Received ${signal}. Gracefully stopping worker...`);
  await monitoringWorker.close();
  await redis.quit();
  console.log('Worker shutdown complete.');
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
