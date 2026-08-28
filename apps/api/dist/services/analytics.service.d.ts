import { ProjectStats, ResponseTimePoint, UptimePoint } from '@api-guardian/shared';
export declare class AnalyticsService {
    getProjectStats(userId: string, projectId: string): Promise<ProjectStats>;
    getResponseTimeHistory(userId: string, endpointId: string, hours?: number): Promise<ResponseTimePoint[]>;
    getUptimeHistory(userId: string, projectId: string, days?: number): Promise<UptimePoint[]>;
    getDashboardStats(userId: string): Promise<{
        totalProjects: number;
        totalEndpoints: number;
        totalTestRuns24h: number;
        averageResponseTimeMs: number;
        overallUptime: number;
        activeIncidents: number;
        projects: Array<{
            id: string;
            name: string;
            stats: ProjectStats;
        }>;
    }>;
    private emptyStats;
}
export declare const analyticsService: AnalyticsService;
//# sourceMappingURL=analytics.service.d.ts.map