import { LogLevel } from '@api-guardian/shared';
interface LogInput {
    projectId?: string | null;
    endpointId?: string | null;
    level: LogLevel;
    service: string;
    message: string;
    metadata?: Record<string, unknown>;
}
export declare class LogService {
    log(input: LogInput): Promise<void>;
    list(userId: string, filters?: {
        projectId?: string;
        endpointId?: string;
        level?: LogLevel;
        search?: string;
        startDate?: Date;
        endDate?: Date;
        page?: number;
        pageSize?: number;
    }): Promise<{
        data: any;
        total: any;
        page: number;
        pageSize: number;
        totalPages: number;
    }>;
}
export declare const logService: LogService;
export {};
//# sourceMappingURL=log.service.d.ts.map