"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMonitoringWorker = createMonitoringWorker;
const bullmq_1 = require("bullmq");
const client_1 = require("@prisma/client");
const shared_1 = require("@api-guardian/shared");
const prisma = new client_1.PrismaClient();
function createMonitoringWorker(redisConnection) {
    const worker = new bullmq_1.Worker('monitoring', async (job) => {
        const { endpointId } = job.data;
        console.log(`[WORKER] Running scheduled test for endpoint: ${endpointId}`);
        const endpoint = await prisma.endpoint.findUnique({
            where: { id: endpointId },
            include: {
                assertions: { where: { isActive: true } },
                project: true,
            },
        });
        if (!endpoint || !endpoint.isActive) {
            console.log(`[WORKER] Endpoint ${endpointId} is inactive or deleted. Skipping.`);
            return;
        }
        // Execute the test using shared TestRunner
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
            assertions: endpoint.assertions.map((a) => ({
                id: a.id,
                type: a.type,
                field: a.field,
                operator: a.operator,
                expected: a.expected,
            })),
        });
        // 1. Record TestRun in database
        const testRun = await prisma.testRun.create({
            data: {
                endpointId: endpoint.id,
                status: result.status,
                statusCode: result.statusCode,
                responseTimeMs: result.responseTimeMs,
                responseBody: result.responseBody,
                responseHeaders: result.responseHeaders,
                errorMessage: result.errorMessage,
                assertionResults: result.assertionResults,
                triggeredBy: client_1.TriggerSource.SCHEDULER,
            },
        });
        // 2. Structured Log
        await prisma.log.create({
            data: {
                projectId: endpoint.projectId,
                endpointId: endpoint.id,
                level: result.status === 'PASSED' ? client_1.LogLevel.INFO : client_1.LogLevel.ERROR,
                service: 'monitoring-worker',
                message: `Worker check ${result.status}: ${endpoint.method} ${endpoint.path} (${result.responseTimeMs}ms, status ${result.statusCode})`,
                metadata: {
                    jobId: job.id,
                    testRunId: testRun.id,
                    statusCode: result.statusCode,
                    responseTimeMs: result.responseTimeMs,
                },
            },
        });
        // 3. Contract Diffing (on successful responses)
        if (result.status === 'PASSED' && result.responseBody) {
            try {
                const baseline = await prisma.apiContract.findFirst({
                    where: { endpointId: endpoint.id, isBaseline: true },
                    orderBy: { createdAt: 'desc' },
                });
                if (!baseline) {
                    await prisma.apiContract.create({
                        data: {
                            endpointId: endpoint.id,
                            spec: result.responseBody,
                            version: '1.0.0',
                            isBaseline: true,
                        },
                    });
                }
                else {
                    const diff = (0, shared_1.diffJsonResponses)(baseline.spec, result.responseBody);
                    if (diff.hasChanges) {
                        const contract = await prisma.apiContract.create({
                            data: {
                                endpointId: endpoint.id,
                                spec: result.responseBody,
                                version: `auto-${Date.now()}`,
                                isBaseline: false,
                            },
                        });
                        for (const change of diff.changes) {
                            await prisma.contractChange.create({
                                data: {
                                    contractId: contract.id,
                                    field: change.field,
                                    changeType: change.changeType,
                                    previousValue: change.previousValue,
                                    currentValue: change.currentValue,
                                    severity: change.severity,
                                },
                            });
                        }
                        console.log(`[WORKER] Contract changes logged for ${endpoint.name}`);
                    }
                }
            }
            catch (contractErr) {
                console.error(`[WORKER] Contract diff error: ${contractErr.message}`);
            }
        }
        // 4. Incident Automation
        const threshold = endpoint.project.consecutiveFailureThreshold || 3;
        if (result.status !== 'PASSED') {
            const recentRuns = await prisma.testRun.findMany({
                where: { endpointId: endpoint.id },
                orderBy: { timestamp: 'desc' },
                take: threshold,
                select: { status: true },
            });
            const consecutiveFails = recentRuns.filter((r) => r.status !== 'PASSED').length;
            const openIncident = await prisma.incident.findFirst({
                where: {
                    endpointId: endpoint.id,
                    status: { in: [client_1.IncidentStatus.OPEN, client_1.IncidentStatus.INVESTIGATING] },
                },
            });
            if (openIncident) {
                await prisma.incident.update({
                    where: { id: openIncident.id },
                    data: {
                        failureCount: { increment: 1 },
                        affectedChecks: { increment: 1 },
                        errorMessage: result.errorMessage ?? openIncident.errorMessage,
                    },
                });
            }
            else if (consecutiveFails >= threshold) {
                const newIncident = await prisma.incident.create({
                    data: {
                        endpointId: endpoint.id,
                        projectId: endpoint.projectId,
                        title: `${endpoint.method} ${endpoint.path} failed with ${result.statusCode ?? 'TIMEOUT'}`,
                        status: client_1.IncidentStatus.OPEN,
                        severity: (result.statusCode && result.statusCode >= 500) ? client_1.IncidentSeverity.CRITICAL : client_1.IncidentSeverity.HIGH,
                        errorMessage: result.errorMessage ?? `HTTP ${result.statusCode}`,
                        failureCount: consecutiveFails,
                        affectedChecks: consecutiveFails,
                    },
                });
                console.log(`[WORKER] 🚨 Auto-created Incident #${newIncident.id} for ${endpoint.name}`);
            }
        }
        else {
            // Auto-resolve any open incident
            const openIncidents = await prisma.incident.findMany({
                where: {
                    endpointId: endpoint.id,
                    status: { in: [client_1.IncidentStatus.OPEN, client_1.IncidentStatus.INVESTIGATING] },
                },
            });
            for (const inc of openIncidents) {
                await prisma.incident.update({
                    where: { id: inc.id },
                    data: {
                        status: client_1.IncidentStatus.RESOLVED,
                        resolvedAt: new Date(),
                    },
                });
                console.log(`[WORKER] ✅ Auto-resolved Incident #${inc.id}`);
            }
        }
    }, {
        connection: redisConnection,
        concurrency: 5,
    });
    worker.on('completed', (job) => {
        console.log(`[WORKER] Job ${job.id} completed successfully`);
    });
    worker.on('failed', (job, err) => {
        console.error(`[WORKER] Job ${job?.id} failed with error: ${err.message}`);
    });
    return worker;
}
//# sourceMappingURL=monitoring.worker.js.map