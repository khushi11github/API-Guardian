"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schedulerService = exports.SchedulerService = exports.NOTIFICATION_QUEUE_NAME = exports.MONITORING_QUEUE_NAME = void 0;
exports.getMonitoringQueue = getMonitoringQueue;
const bullmq_1 = require("bullmq");
const redis_js_1 = require("../lib/redis.js");
const shared_1 = require("@api-guardian/shared");
const logger_js_1 = require("../lib/logger.js");
exports.MONITORING_QUEUE_NAME = 'monitoring';
exports.NOTIFICATION_QUEUE_NAME = 'notifications';
let monitoringQueue = null;
function getMonitoringQueue() {
    if (!monitoringQueue) {
        monitoringQueue = new bullmq_1.Queue(exports.MONITORING_QUEUE_NAME, {
            connection: (0, redis_js_1.getRedisClient)(),
            defaultJobOptions: {
                removeOnComplete: 100,
                removeOnFail: 500,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
            },
        });
    }
    return monitoringQueue;
}
class SchedulerService {
    getRepeatableJobId(endpointId) {
        return `monitor:${endpointId}`;
    }
    async scheduleEndpoint(endpointId, schedule) {
        const cron = shared_1.SCHEDULE_CRON[schedule];
        if (!cron) {
            logger_js_1.logger.warn(`No cron expression for schedule: ${schedule}`);
            return;
        }
        const queue = getMonitoringQueue();
        // Remove existing repeatable job for this endpoint first
        await this.unscheduleEndpoint(endpointId);
        const jobId = this.getRepeatableJobId(endpointId);
        await queue.add('monitor-endpoint', { endpointId, projectId: '' }, // projectId loaded in worker
        {
            repeat: { pattern: cron },
            jobId,
        });
        logger_js_1.logger.info(`Scheduled endpoint ${endpointId} with cron: ${cron}`);
    }
    async unscheduleEndpoint(endpointId) {
        const queue = getMonitoringQueue();
        try {
            // Get all repeatable jobs and find the one for this endpoint
            const repeatableJobs = await queue.getRepeatableJobs();
            const job = repeatableJobs.find(j => j.id === this.getRepeatableJobId(endpointId) ||
                j.key.includes(endpointId));
            if (job) {
                await queue.removeRepeatableByKey(job.key);
                logger_js_1.logger.info(`Unscheduled endpoint ${endpointId}`);
            }
        }
        catch (err) {
            logger_js_1.logger.error(`Failed to unschedule endpoint ${endpointId}`, {
                error: err.message,
            });
        }
    }
    async triggerNow(endpointId, projectId) {
        const queue = getMonitoringQueue();
        const job = await queue.add('monitor-endpoint', { endpointId, projectId }, {
            priority: 1, // high priority for manual triggers
        });
        return job.id ?? '';
    }
    async getScheduledEndpoints() {
        const queue = getMonitoringQueue();
        const repeatableJobs = await queue.getRepeatableJobs();
        return repeatableJobs
            .filter(j => j.id?.startsWith('monitor:'))
            .map(j => j.id.replace('monitor:', ''));
    }
}
exports.SchedulerService = SchedulerService;
exports.schedulerService = new SchedulerService();
//# sourceMappingURL=scheduler.service.js.map