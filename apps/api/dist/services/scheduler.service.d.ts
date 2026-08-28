import { Queue } from 'bullmq';
import { MonitoringJobData } from '@api-guardian/shared';
export declare const MONITORING_QUEUE_NAME = "monitoring";
export declare const NOTIFICATION_QUEUE_NAME = "notifications";
export declare function getMonitoringQueue(): Queue<MonitoringJobData>;
export declare class SchedulerService {
    private getRepeatableJobId;
    scheduleEndpoint(endpointId: string, schedule: string): Promise<void>;
    unscheduleEndpoint(endpointId: string): Promise<void>;
    triggerNow(endpointId: string, projectId: string): Promise<string>;
    getScheduledEndpoints(): Promise<string[]>;
}
export declare const schedulerService: SchedulerService;
//# sourceMappingURL=scheduler.service.d.ts.map