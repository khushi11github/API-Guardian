import { TestRun, TestRunStatus } from '@api-guardian/shared';
import { Prisma } from '@prisma/client';
export declare class TestingService {
    runTest(userId: string, endpointId: string, triggeredBy?: 'MANUAL' | 'SCHEDULER'): Promise<TestRun>;
    getResults(userId: string, endpointId: string, options?: {
        page?: number;
        pageSize?: number;
        status?: TestRunStatus;
    }): Promise<{
        data: {
            statusCode: number | null;
            id: string;
            endpointId: string;
            status: import("@prisma/client").$Enums.TestRunStatus;
            errorMessage: string | null;
            timestamp: Date;
            responseTimeMs: number | null;
            responseBody: string | null;
            responseHeaders: Prisma.JsonValue;
            assertionResults: Prisma.JsonValue;
            triggeredBy: import("@prisma/client").$Enums.TriggerSource;
        }[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    }>;
    getLatestResult(endpointId: string): Promise<TestRun | null>;
    private checkContractChanges;
}
export declare const testingService: TestingService;
//# sourceMappingURL=testing.service.d.ts.map