import { IncidentStatus, TestRunStatus } from '@api-guardian/shared';
interface FailureContext {
    status: TestRunStatus;
    statusCode: number | null;
    responseTimeMs: number | null;
    errorMessage: string | null;
}
export declare class IncidentService {
    handleFailure(endpointId: string, projectId: string, userId: string, ctx: FailureContext, testRunId: string): Promise<void>;
    handleRecovery(endpointId: string, projectId: string): Promise<void>;
    list(userId: string, projectId: string, status?: IncidentStatus): Promise<({
        endpoint: {
            name: string;
            method: import("@prisma/client").$Enums.HttpMethod;
            path: string;
        };
    } & {
        id: string;
        updatedAt: Date;
        projectId: string;
        endpointId: string;
        status: import("@prisma/client").$Enums.IncidentStatus;
        severity: import("@prisma/client").$Enums.IncidentSeverity;
        title: string;
        errorMessage: string | null;
        failureCount: number;
        affectedChecks: number;
        startedAt: Date;
        resolvedAt: Date | null;
    })[]>;
    getById(userId: string, incidentId: string): Promise<({
        project: {
            name: string;
            userId: string;
        };
        endpoint: {
            name: string;
            method: import("@prisma/client").$Enums.HttpMethod;
            path: string;
        };
    } & {
        id: string;
        updatedAt: Date;
        projectId: string;
        endpointId: string;
        status: import("@prisma/client").$Enums.IncidentStatus;
        severity: import("@prisma/client").$Enums.IncidentSeverity;
        title: string;
        errorMessage: string | null;
        failureCount: number;
        affectedChecks: number;
        startedAt: Date;
        resolvedAt: Date | null;
    }) | null>;
    update(userId: string, incidentId: string, status: IncidentStatus): Promise<{
        id: string;
        updatedAt: Date;
        projectId: string;
        endpointId: string;
        status: import("@prisma/client").$Enums.IncidentStatus;
        severity: import("@prisma/client").$Enums.IncidentSeverity;
        title: string;
        errorMessage: string | null;
        failureCount: number;
        affectedChecks: number;
        startedAt: Date;
        resolvedAt: Date | null;
    } | null>;
}
export declare const incidentService: IncidentService;
export {};
//# sourceMappingURL=incident.service.d.ts.map