"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_js_1 = require("./app.js");
const logger_js_1 = require("./lib/logger.js");
const client_js_1 = __importDefault(require("./prisma/client.js"));
const redis_js_1 = require("./lib/redis.js");
const PORT = parseInt(process.env.PORT || '4000', 10);
async function bootstrap() {
    const app = (0, app_js_1.createApp)();
    // Test DB connection
    try {
        await client_js_1.default.$connect();
        logger_js_1.logger.info('Database connection established');
    }
    catch (err) {
        logger_js_1.logger.error('Failed to connect to database', { error: err.message });
    }
    // Test Redis connection
    try {
        const redis = (0, redis_js_1.getRedisClient)();
        await redis.ping();
        logger_js_1.logger.info('Redis connection verified');
    }
    catch (err) {
        logger_js_1.logger.warn('Redis connection failed or pending', { error: err.message });
    }
    const server = app.listen(PORT, () => {
        logger_js_1.logger.info(`🚀 API Guardian Server running on port ${PORT}`);
        logger_js_1.logger.info(`Health check: http://localhost:${PORT}/api/health`);
    });
    const gracefulShutdown = async (signal) => {
        logger_js_1.logger.info(`Received ${signal}. Gracefully shutting down...`);
        server.close(async () => {
            logger_js_1.logger.info('HTTP server closed');
            await client_js_1.default.$disconnect();
            await (0, redis_js_1.closeRedis)();
            logger_js_1.logger.info('Connections closed. Exiting process.');
            process.exit(0);
        });
        // Force exit after 10s if stuck
        setTimeout(() => {
            logger_js_1.logger.error('Force shutdown after timeout');
            process.exit(1);
        }, 10000);
    };
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}
bootstrap().catch((err) => {
    logger_js_1.logger.error('Server crash on startup', { error: err.message, stack: err.stack });
    process.exit(1);
});
//# sourceMappingURL=server.js.map