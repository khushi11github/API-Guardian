import { TestRun, TestRunStatus } from '@api-guardian/shared';
export declare class TestingService {
    runTest(userId: string, endpointId: string, triggeredBy?: 'MANUAL' | 'SCHEDULER'): Promise<TestRun>;
    getResults(userId: string, endpointId: string, options?: {
        page?: number;
        pageSize?: number;
        status?: TestRunStatus;
    }): Promise<{
        data: any;
        total: any;
        page: number;
        pageSize: number;
        totalPages: number;
    }>;
    getLatestResult(endpointId: string): Promise<TestRun | null>;
    private checkContractChanges;
}
export declare const testingService: TestingService;
//# sourceMappingURL=testing.service.d.ts.map