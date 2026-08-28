"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const ioredis_1 = __importDefault(require("ioredis"));
const monitoring_worker_js_1 = require("./workers/monitoring.worker.js");
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new ioredis_1.default(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});
console.log(`🚀 Starting API Guardian Background Monitoring Worker...`);
console.log(`Connected to Redis at: ${redisUrl}`);
const monitoringWorker = (0, monitoring_worker_js_1.createMonitoringWorker)(redis);
const shutdown = async (signal) => {
    console.log(`Received ${signal}. Gracefully stopping worker...`);
    await monitoringWorker.close();
    await redis.quit();
    console.log('Worker shutdown complete.');
    process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
//# sourceMappingURL=index.js.map