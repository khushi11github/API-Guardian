import { createApp } from './app.js';
import { logger } from './lib/logger.js';
import prisma from './prisma/client.js';
import { getRedisClient, closeRedis } from './lib/redis.js';

const PORT = parseInt(process.env.PORT || '4000', 10);

async function bootstrap() {
  const app = createApp();

  // Test DB connection
  try {
    await prisma.$connect();
    logger.info('Database connection established');
  } catch (err: any) {
    logger.error('Failed to connect to database', { error: err.message });
  }

  // Test Redis connection
  try {
    const redis = getRedisClient();
    await redis.ping();
    logger.info('Redis connection verified');
  } catch (err: any) {
    logger.warn('Redis connection failed or pending', { error: err.message });
  }

  const server = app.listen(PORT, () => {
    logger.info(`🚀 API Guardian Server running on port ${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/api/health`);
  });

  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Gracefully shutting down...`);
    server.close(async () => {
      logger.info('HTTP server closed');
      await prisma.$disconnect();
      await closeRedis();
      logger.info('Connections closed. Exiting process.');
      process.exit(0);
    });

    // Force exit after 10s if stuck
    setTimeout(() => {
      logger.error('Force shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Server crash on startup', { error: err.message, stack: err.stack });
  process.exit(1);
});
