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
    list(userId: string, projectId: string, status?: IncidentStatus): Promise<any>;
    getById(userId: string, incidentId: string): Promise<any>;
    update(userId: string, incidentId: string, status: IncidentStatus): Promise<any>;
}
export declare const incidentService: IncidentService;
export {};
//# sourceMappingURL=incident.service.d.ts.map