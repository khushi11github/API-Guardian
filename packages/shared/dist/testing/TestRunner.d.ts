import { HttpMethod, TestRunStatus, AssertionResult, EndpointHeader, EndpointParameter, AuthType } from '../types/index.js';
export interface TestRunnerConfig {
    method: HttpMethod;
    baseUrl: string;
    path: string;
    headers?: EndpointHeader[];
    parameters?: EndpointParameter[];
    body?: string | null;
    timeoutMs?: number;
    authType?: AuthType;
    authConfig?: string | null;
    expectedStatusCode?: number;
    assertions?: Array<{
        id?: string;
        type: import('../types/index.js').AssertionType;
        field?: string | null;
        operator: import('../types/index.js').AssertionOperator;
        expected: string;
    }>;
    skipSsrfCheck?: boolean;
}
export interface TestRunResult {
    status: TestRunStatus;
    statusCode: number | null;
    responseTimeMs: number | null;
    responseBody: string | null;
    responseHeaders: Record<string, string>;
    errorMessage: string | null;
    assertionResults: AssertionResult[];
    requestUrl: string;
    requestMethod: HttpMethod;
}
export declare class TestRunner {
    run(config: TestRunnerConfig): Promise<TestRunResult>;
}
export declare const testRunner: TestRunner;
//# sourceMappingURL=TestRunner.d.ts.map