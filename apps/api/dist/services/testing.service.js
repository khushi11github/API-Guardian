"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testingService = exports.TestingService = void 0;
const client_js_1 = __importDefault(require("../prisma/client.js"));
const shared_1 = require("@api-guardian/shared");
const shared_2 = require("@api-guardian/shared");
const logger_js_1 = require("../lib/logger.js");
const errors_js_1 = require("../lib/errors.js");
const incident_service_js_1 = require("./incident.service.js");
const log_service_js_1 = require("./log.service.js");
class TestingService {
    async runTest(userId, endpointId, triggeredBy = 'MANUAL') {
        // Load endpoint with project ownership check
        const endpoint = await client_js_1.default.endpoint.findUnique({
            where: { id: endpointId },
            include: {
                assertions: { where: { isActive: true } },
                project: { select: { userId: true, baseUrl: true, id: true } },
            },
        });
        if (!endpoint)
            throw new errors_js_1.NotFoundError('Endpoint');
        if (triggeredBy === 'MANUAL' && endpoint.project.userId !== userId) {
            throw new errors_js_1.ForbiddenError('Access denied');
        }
        const result = await shared_1.testRunner.run({
            method: endpoint.method,
            baseUrl: endpoint.project.baseUrl,
            path: endpoint.path,
            headers: endpoint.headers,
            parameters: endpoint.parameters,
            body: endpoint.body,
            timeoutMs: endpoint.timeoutMs,
            authType: endpoint.authType,
            authConfig: endpoint.authConfig,
            expectedStatusCode: endpoint.expectedStatusCode,
            assertions: endpoint.assertions.map(a => ({
                id: a.id,
                type: a.type,
                field: a.field,
                operator: a.operator,
                expected: a.expected,
            })),
        });
        // Persist result
        const testRun = await client_js_1.default.testRun.create({
            data: {
                endpointId,
                status: result.status,
                statusCode: result.statusCode,
                responseTimeMs: result.responseTimeMs,
                responseBody: result.responseBody,
                responseHeaders: result.responseHeaders,
                errorMessage: result.errorMessage,
                assertionResults: result.assertionResults,
                triggeredBy,
            },
        });
        // Log test run
        await log_service_js_1.logService.log({
            projectId: endpoint.project.id,
            endpointId,
            level: result.status === 'PASSED' ? 'INFO' : 'ERROR',
            service: 'testing-engine',
            message: `Test run ${result.status}: ${endpoint.method} ${endpoint.path}`,
            metadata: {
                testRunId: testRun.id,
                statusCode: result.statusCode,
                responseTimeMs: result.responseTimeMs,
                triggeredBy,
            },
        });
        // Contract monitoring — compare with last successful response
        if (result.status === 'PASSED' && result.responseBody) {
            await this.checkContractChanges(endpoint, result.responseBody, result.statusCode);
        }
        // Incident management
        if (result.status !== 'PASSED') {
            await incident_service_js_1.incidentService.handleFailure(endpointId, endpoint.project.id, endpoint.project.userId, result, testRun.id);
        }
        else {
            await incident_service_js_1.incidentService.handleRecovery(endpointId, endpoint.project.id);
        }
        return testRun;
    }
    async getResults(userId, endpointId, options = {}) {
        const { page = 1, pageSize = 20, status } = options;
        // Verify ownership
        const endpoint = await client_js_1.default.endpoint.findUnique({
            where: { id: endpointId },
            include: { project: { select: { userId: true } } },
        });
        if (!endpoint)
            throw new errors_js_1.NotFoundError('Endpoint');
        if (endpoint.project.userId !== userId)
            throw new errors_js_1.ForbiddenError('Access denied');
        const where = {
            endpointId,
            ...(status && { status }),
        };
        const [data, total] = await Promise.all([
            client_js_1.default.testRun.findMany({
                where,
                orderBy: { timestamp: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            client_js_1.default.testRun.count({ where }),
        ]);
        return {
            data,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }
    async getLatestResult(endpointId) {
        const run = await client_js_1.default.testRun.findFirst({
            where: { endpointId },
            orderBy: { timestamp: 'desc' },
        });
        return run;
    }
    async checkContractChanges(endpoint, responseBody, statusCode) {
        try {
            // Get the last contract baseline
            const lastContract = await client_js_1.default.apiContract.findFirst({
                where: { endpointId: endpoint.id, isBaseline: true },
                orderBy: { createdAt: 'desc' },
            });
            if (!lastContract) {
                // First successful response — create baseline
                await client_js_1.default.apiContract.create({
                    data: {
                        endpointId: endpoint.id,
                        spec: responseBody,
                        specType: 'JSON_SCHEMA',
                        version: '1',
                        isBaseline: true,
                    },
                });
                return;
            }
            // Diff against baseline
            const diff = (0, shared_2.diffJsonResponses)(lastContract.spec, responseBody, undefined, statusCode ?? undefined);
            if (diff.hasChanges) {
                // Save new contract version
                const newContract = await client_js_1.default.apiContract.create({
                    data: {
                        endpointId: endpoint.id,
                        spec: responseBody,
                        specType: 'JSON_SCHEMA',
                        version: String(parseInt(lastContract.version) + 1),
                        isBaseline: false,
                    },
                });
                // Record each change
                for (const change of diff.changes) {
                    await client_js_1.default.contractChange.create({
                        data: {
                            contractId: newContract.id,
                            field: change.field,
                            changeType: change.changeType,
                            previousValue: change.previousValue,
                            currentValue: change.currentValue,
                            severity: change.severity,
                        },
                    });
                }
                logger_js_1.logger.info(`Contract changes detected for endpoint ${endpoint.id}`, {
                    changes: diff.changes.length,
                });
            }
            // Also validate against expected OpenAPI schema if provided
            if (endpoint.expectedSchema) {
                try {
                    const schema = JSON.parse(endpoint.expectedSchema);
                    const schemaDiff = (0, shared_2.diffAgainstOpenApiSchema)(schema, responseBody);
                    if (schemaDiff.hasChanges) {
                        logger_js_1.logger.warn(`Schema validation failures for endpoint ${endpoint.id}`, {
                            changes: schemaDiff.changes,
                        });
                    }
                }
                catch {
                    // Ignore schema parse errors
                }
            }
        }
        catch (err) {
            logger_js_1.logger.error('Contract check failed', { error: err.message, endpointId: endpoint.id });
        }
    }
}
exports.TestingService = TestingService;
exports.testingService = new TestingService();
//# sourceMappingURL=testing.service.js.map