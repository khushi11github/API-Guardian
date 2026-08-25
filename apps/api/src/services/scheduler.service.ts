import { Queue } from 'bullmq';
import { getRedisClient } from '../lib/redis.js';
import { SCHEDULE_CRON } from '@api-guardian/shared';
import { logger } from '../lib/logger.js';
import { MonitoringJobData } from '@api-guardian/shared';

export const MONITORING_QUEUE_NAME = 'monitoring';
export const NOTIFICATION_QUEUE_NAME = 'notifications';

let monitoringQueue: Queue<MonitoringJobData> | null = null;

export function getMonitoringQueue(): Queue<MonitoringJobData> {
  if (!monitoringQueue) {
    monitoringQueue = new Queue<MonitoringJobData>(MONITORING_QUEUE_NAME, {
      connection: getRedisClient(),
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

export class SchedulerService {
  private getRepeatableJobId(endpointId: string): string {
    return `monitor:${endpointId}`;
  }

  async scheduleEndpoint(endpointId: string, schedule: string): Promise<void> {
    const cron = SCHEDULE_CRON[schedule];
    if (!cron) {
      logger.warn(`No cron expression for schedule: ${schedule}`);
      return;
    }

    const queue = getMonitoringQueue();

    // Remove existing repeatable job for this endpoint first
    await this.unscheduleEndpoint(endpointId);

    const jobId = this.getRepeatableJobId(endpointId);

    await queue.add(
      'monitor-endpoint',
      { endpointId, projectId: '' }, // projectId loaded in worker
      {
        repeat: { pattern: cron },
        jobId,
      },
    );

    logger.info(`Scheduled endpoint ${endpointId} with cron: ${cron}`);
  }

  async unscheduleEndpoint(endpointId: string): Promise<void> {
    const queue = getMonitoringQueue();

    try {
      // Get all repeatable jobs and find the one for this endpoint
      const repeatableJobs = await queue.getRepeatableJobs();
      const job = repeatableJobs.find(j =>
        j.id === this.getRepeatableJobId(endpointId) ||
        j.key.includes(endpointId),
      );

      if (job) {
        await queue.removeRepeatableByKey(job.key);
        logger.info(`Unscheduled endpoint ${endpointId}`);
      }
    } catch (err) {
      logger.error(`Failed to unschedule endpoint ${endpointId}`, {
        error: (err as Error).message,
      });
    }
  }

  async triggerNow(endpointId: string, projectId: string): Promise<string> {
    const queue = getMonitoringQueue();
    const job = await queue.add(
      'monitor-endpoint',
      { endpointId, projectId },
      {
        priority: 1, // high priority for manual triggers
      },
    );
    return job.id ?? '';
  }

  async getScheduledEndpoints(): Promise<string[]> {
    const queue = getMonitoringQueue();
    const repeatableJobs = await queue.getRepeatableJobs();
    return repeatableJobs
      .filter(j => j.id?.startsWith('monitor:'))
      .map(j => j.id!.replace('monitor:', ''));
  }
}

export const schedulerService = new SchedulerService();
