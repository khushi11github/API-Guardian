import { AssertionResult, AssertionType, AssertionOperator, TestRunStatus } from '../types/index.js';
export interface AssertionInput {
    statusCode: number | null;
    responseTimeMs: number | null;
    responseBody: string | null;
    responseHeaders: Record<string, string>;
}
export declare function evaluateAssertion(assertion: {
    type: AssertionType;
    field?: string | null;
    operator: AssertionOperator;
    expected: string;
    id?: string;
}, input: AssertionInput): AssertionResult;
export declare function evaluateAllAssertions(assertions: Array<{
    id?: string;
    type: AssertionType;
    field?: string | null;
    operator: AssertionOperator;
    expected: string;
}>, input: AssertionInput): {
    results: AssertionResult[];
    allPassed: boolean;
};
export declare function deriveTestStatus(httpError: Error | null, timedOut: boolean, assertionResults: AssertionResult[]): TestRunStatus;
//# sourceMappingURL=assertions.d.ts.map