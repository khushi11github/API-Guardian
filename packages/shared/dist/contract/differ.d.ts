import { ContractDiffResult } from '../types/index.js';
export declare function diffJsonResponses(previous: string | null, current: string | null, previousStatusCode?: number, currentStatusCode?: number): ContractDiffResult;
/**
 * Diff an observed response against an OpenAPI schema.
 * Checks that all required fields are present and types match.
 */
export declare function diffAgainstOpenApiSchema(schema: Record<string, unknown>, responseBody: string | null): ContractDiffResult;
//# sourceMappingURL=differ.d.ts.map