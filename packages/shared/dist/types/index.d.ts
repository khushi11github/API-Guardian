export interface AuthUser {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}
export interface LoginDto {
    email: string;
    password: string;
}
export interface RegisterDto {
    email: string;
    name: string;
    password: string;
}
export type Environment = 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT' | 'TESTING';
export interface Project {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    baseUrl: string;
    environment: Environment;
    isDemo: boolean;
    consecutiveFailureThreshold: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateProjectDto {
    name: string;
    description?: string;
    baseUrl: string;
    environment: Environment;
}
export interface UpdateProjectDto {
    name?: string;
    description?: string;
    baseUrl?: string;
    environment?: Environment;
    consecutiveFailureThreshold?: number;
}
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ScheduleInterval = 'MANUAL' | 'EVERY_1_MIN' | 'EVERY_5_MIN' | 'EVERY_15_MIN' | 'EVERY_30_MIN' | 'EVERY_1_HOUR' | 'EVERY_6_HOURS' | 'DAILY';
export interface EndpointHeader {
    key: string;
    value: string;
}
export interface EndpointParameter {
    key: string;
    value: string;
}
export interface Endpoint {
    id: string;
    projectId: string;
    name: string;
    method: HttpMethod;
    path: string;
    description: string | null;
    headers: EndpointHeader[];
    parameters: EndpointParameter[];
    body: string | null;
    expectedStatusCode: number;
    expectedSchema: string | null;
    timeoutMs: number;
    schedule: ScheduleInterval;
    isActive: boolean;
    authType: AuthType;
    authConfig: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export type AuthType = 'NONE' | 'BEARER' | 'BASIC' | 'API_KEY';
export interface CreateEndpointDto {
    name: string;
    method: HttpMethod;
    path: string;
    description?: string;
    headers?: EndpointHeader[];
    parameters?: EndpointParameter[];
    body?: string;
    expectedStatusCode?: number;
    expectedSchema?: string;
    timeoutMs?: number;
    schedule?: ScheduleInterval;
    authType?: AuthType;
    authConfig?: string;
}
export interface UpdateEndpointDto extends Partial<CreateEndpointDto> {
    isActive?: boolean;
}
export type AssertionType = 'STATUS_CODE' | 'RESPONSE_TIME' | 'JSON_FIELD' | 'JSON_SCHEMA' | 'HEADER' | 'BODY_CONTAINS' | 'BODY_NOT_CONTAINS';
export type AssertionOperator = 'EQUALS' | 'NOT_EQUALS' | 'LESS_THAN' | 'GREATER_THAN' | 'LESS_THAN_OR_EQUAL' | 'GREATER_THAN_OR_EQUAL' | 'CONTAINS' | 'NOT_CONTAINS' | 'EXISTS' | 'NOT_EXISTS' | 'MATCHES_SCHEMA';
export interface Assertion {
    id: string;
    endpointId: string;
    type: AssertionType;
    field?: string;
    operator: AssertionOperator;
    expected: string;
    isActive: boolean;
}
export interface CreateAssertionDto {
    type: AssertionType;
    field?: string;
    operator: AssertionOperator;
    expected: string;
}
export interface AssertionResult {
    assertionId?: string;
    type: AssertionType;
    field?: string;
    operator: AssertionOperator;
    expected: string;
    actual: string;
    passed: boolean;
    message: string;
}
export type TestRunStatus = 'PASSED' | 'FAILED' | 'TIMEOUT' | 'ERROR';
export interface TestRun {
    id: string;
    endpointId: string;
    status: TestRunStatus;
    statusCode: number | null;
    responseTimeMs: number | null;
    responseBody: string | null;
    responseHeaders: Record<string, string>;
    errorMessage: string | null;
    assertionResults: AssertionResult[];
    triggeredBy: 'MANUAL' | 'SCHEDULER';
    timestamp: Date;
}
export interface TestRunSummary {
    id: string;
    status: TestRunStatus;
    statusCode: number | null;
    responseTimeMs: number | null;
    errorMessage: string | null;
    timestamp: Date;
}
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export interface Incident {
    id: string;
    endpointId: string;
    projectId: string;
    status: IncidentStatus;
    severity: IncidentSeverity;
    title: string;
    errorMessage: string | null;
    failureCount: number;
    startedAt: Date;
    resolvedAt: Date | null;
    affectedChecks: number;
}
export type ContractChangeType = 'FIELD_REMOVED' | 'FIELD_ADDED' | 'TYPE_CHANGED' | 'STATUS_CODE_CHANGED' | 'REQUIRED_FIELD_MISSING';
export interface ContractChange {
    id: string;
    contractId: string;
    field: string;
    changeType: ContractChangeType;
    previousValue: string | null;
    currentValue: string | null;
    severity: IncidentSeverity;
    detectedAt: Date;
}
export interface ApiContract {
    id: string;
    endpointId: string;
    spec: string;
    version: string;
    createdAt: Date;
}
export interface ContractDiffResult {
    hasChanges: boolean;
    changes: Array<{
        field: string;
        changeType: ContractChangeType;
        previousValue: string | null;
        currentValue: string | null;
        severity: IncidentSeverity;
    }>;
}
export interface ProjectStats {
    totalEndpoints: number;
    healthyEndpoints: number;
    failingEndpoints: number;
    degradedEndpoints: number;
    averageResponseTimeMs: number;
    uptimePercentage: number;
    totalTestRuns: number;
    failureRate: number;
    activeIncidents: number;
}
export interface ResponseTimePoint {
    timestamp: Date;
    value: number;
    status: TestRunStatus;
}
export interface UptimePoint {
    date: string;
    uptime: number;
    total: number;
    passed: number;
    failed: number;
}
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
export interface LogEntry {
    id: string;
    projectId: string | null;
    endpointId: string | null;
    level: LogLevel;
    service: string;
    message: string;
    metadata: Record<string, unknown>;
    timestamp: Date;
}
export type NotificationType = 'EMAIL' | 'WEBHOOK';
export interface NotificationConfig {
    id: string;
    userId: string;
    projectId: string;
    type: NotificationType;
    config: EmailNotificationConfig | WebhookNotificationConfig;
    enabled: boolean;
}
export interface EmailNotificationConfig {
    to: string[];
}
export interface WebhookNotificationConfig {
    url: string;
    secret?: string;
    events: WebhookEvent[];
}
export type WebhookEvent = 'incident.created' | 'incident.resolved' | 'endpoint.failed' | 'endpoint.recovered' | 'contract.changed';
export interface AiAnalysis {
    id: string;
    testRunId: string;
    summary: string;
    probableCause: string;
    confidence: number;
    evidence: string[];
    suggestedActions: string[];
    severity: IncidentSeverity;
    provider: string;
    createdAt: Date;
}
export interface AiAnalysisInput {
    endpoint: {
        name: string;
        method: HttpMethod;
        path: string;
        expectedStatusCode: number;
    };
    testRun: {
        status: TestRunStatus;
        statusCode: number | null;
        responseTimeMs: number | null;
        responseBody: string | null;
        responseHeaders: Record<string, string>;
        errorMessage: string | null;
        assertionResults: AssertionResult[];
    };
    recentHistory: TestRunSummary[];
    recentFailures: TestRunSummary[];
}
export interface AiAnalysisOutput {
    summary: string;
    probableCause: string;
    confidence: number;
    evidence: string[];
    suggestedActions: string[];
    severity: IncidentSeverity;
}
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}
export interface ApiError {
    success: false;
    error: string;
    code?: string;
    details?: unknown;
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
export interface MonitoringJobData {
    endpointId: string;
    projectId: string;
}
export interface NotificationJobData {
    type: 'incident' | 'recovery' | 'contract';
    projectId: string;
    endpointId?: string;
    incidentId?: string;
    payload: Record<string, unknown>;
}
//# sourceMappingURL=index.d.ts.map