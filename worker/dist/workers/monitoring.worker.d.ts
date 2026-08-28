import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { MonitoringJobData } from '@api-guardian/shared';
export declare function createMonitoringWorker(redisConnection: IORedis): Worker<MonitoringJobData, any, string>;
//# sourceMappingURL=monitoring.worker.d.ts.map