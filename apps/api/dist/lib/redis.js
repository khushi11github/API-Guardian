"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = getRedisClient;
exports.closeRedis = closeRedis;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_js_1 = require("./logger.js");
let redisClient = null;
function getRedisClient() {
    if (!redisClient) {
        const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
        redisClient = new ioredis_1.default(url, {
            maxRetriesPerRequest: null, // Required by BullMQ
            enableReadyCheck: false,
            lazyConnect: true,
        });
        redisClient.on('connect', () => logger_js_1.logger.info('Redis connected'));
        redisClient.on('error', (err) => logger_js_1.logger.error('Redis error', { error: err.message }));
    }
    return redisClient;
}
async function closeRedis() {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
    }
}
//# sourceMappingURL=redis.js.map