interface IncidentPayload {
    incidentId: string;
    endpointId: string;
    endpointName: string;
    method: string;
    path: string;
    statusCode: number | null;
    failureCount: number;
    severity: string;
    startedAt: string;
    errorMessage: string | null;
}
interface RecoveryPayload {
    incidentId: string;
    endpointId: string;
    endpointName: string;
    method: string;
    path: string;
    resolvedAt: string;
}
export declare class NotificationService {
    notifyIncident(projectId: string, incidentId: string, payload: IncidentPayload): Promise<void>;
    notifyRecovery(projectId: string, payload: RecoveryPayload): Promise<void>;
    notifyContractChange(projectId: string, payload: {
        endpointId: string;
        endpointName: string;
        changes: Array<{
            field: string;
            changeType: string;
            previousValue: string | null;
            currentValue: string | null;
        }>;
    }): Promise<void>;
    private buildIncidentEmail;
    private buildRecoveryEmail;
}
export declare const notificationService: NotificationService;
export {};
//# sourceMappingURL=notification.service.d.ts.map