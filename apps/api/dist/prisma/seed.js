"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const argon2_1 = __importDefault(require("argon2"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding API Guardian demo data...');
    // Clean old demo data if exists
    const existingUser = await prisma.user.findUnique({
        where: { email: 'demo@apiguardian.dev' },
    });
    if (existingUser) {
        console.log('Cleaning existing demo user and cascades...');
        await prisma.user.delete({ where: { id: existingUser.id } });
    }
    // 1. Create Demo User
    const passwordHash = await argon2_1.default.hash('Demo12345!', {
        type: argon2_1.default.argon2id,
    });
    const user = await prisma.user.create({
        data: {
            email: 'demo@apiguardian.dev',
            name: 'Alex Rivera (Demo)',
            passwordHash,
        },
    });
    console.log(`👤 Created demo user: ${user.email} (Password: Demo12345!)`);
    // 2. Create Demo Project
    const project = await prisma.project.create({
        data: {
            userId: user.id,
            name: 'E-Commerce Core API',
            description: 'Production microservices for shopping cart, payments, and product catalog',
            baseUrl: 'https://httpbin.org',
            environment: client_1.Environment.PRODUCTION,
            isDemo: true,
            consecutiveFailureThreshold: 3,
        },
    });
    console.log(`📦 Created demo project: ${project.name}`);
    // 3. Create Endpoints
    // Endpoint 1: Healthy (GET /get or /users)
    const healthyEndpoint = await prisma.endpoint.create({
        data: {
            projectId: project.id,
            name: 'Get User Profile',
            method: client_1.HttpMethod.GET,
            path: '/get',
            description: 'Fetches active authenticated user session details',
            headers: [{ key: 'Accept', value: 'application/json' }],
            expectedStatusCode: 200,
            timeoutMs: 5000,
            schedule: client_1.ScheduleInterval.EVERY_1_MIN,
            isActive: true,
            assertions: {
                create: [
                    {
                        type: client_1.AssertionType.STATUS_CODE,
                        operator: client_1.AssertionOperator.EQUALS,
                        expected: '200',
                    },
                    {
                        type: client_1.AssertionType.RESPONSE_TIME,
                        operator: client_1.AssertionOperator.LESS_THAN,
                        expected: '800',
                    },
                ],
            },
        },
    });
    // Endpoint 2: Degraded / Slow (GET /delay/2)
    const slowEndpoint = await prisma.endpoint.create({
        data: {
            projectId: project.id,
            name: 'Search Product Catalog',
            method: client_1.HttpMethod.GET,
            path: '/delay/2',
            description: 'Full-text query over Elasticsearch cluster for product discovery',
            expectedStatusCode: 200,
            timeoutMs: 10000,
            schedule: client_1.ScheduleInterval.EVERY_5_MIN,
            isActive: true,
            assertions: {
                create: [
                    {
                        type: client_1.AssertionType.STATUS_CODE,
                        operator: client_1.AssertionOperator.EQUALS,
                        expected: '200',
                    },
                    {
                        type: client_1.AssertionType.RESPONSE_TIME,
                        operator: client_1.AssertionOperator.LESS_THAN,
                        expected: '1000',
                    },
                ],
            },
        },
    });
    // Endpoint 3: Failing (POST /status/500)
    const failingEndpoint = await prisma.endpoint.create({
        data: {
            projectId: project.id,
            name: 'Process Order Payment',
            method: client_1.HttpMethod.POST,
            path: '/status/500',
            description: 'Charges payment gateway and triggers fulfillment pipeline',
            body: JSON.stringify({ cartId: 'cart_9981', amount: 149.99, currency: 'USD' }),
            expectedStatusCode: 200,
            timeoutMs: 5000,
            schedule: client_1.ScheduleInterval.EVERY_1_MIN,
            isActive: true,
            assertions: {
                create: [
                    {
                        type: client_1.AssertionType.STATUS_CODE,
                        operator: client_1.AssertionOperator.EQUALS,
                        expected: '200',
                    },
                ],
            },
        },
    });
    // Endpoint 4: Auth / Edge Case (GET /basic-auth/admin/secret)
    const authEndpoint = await prisma.endpoint.create({
        data: {
            projectId: project.id,
            name: 'Inventory Sync Admin',
            method: client_1.HttpMethod.GET,
            path: '/basic-auth/admin/secret',
            description: 'Backoffice warehouse replenishment synchronization',
            expectedStatusCode: 200,
            timeoutMs: 5000,
            schedule: client_1.ScheduleInterval.EVERY_15_MIN,
            isActive: true,
            authType: 'BASIC',
            authConfig: 'admin:secret',
        },
    });
    console.log(`🔗 Created 4 demo endpoints with diverse configurations`);
    // 4. Generate Historical Test Runs (24h back)
    const now = Date.now();
    const testRunsData = [];
    // Generate 24 runs for healthy endpoint (mostly passed, normal latencies ~120-250ms)
    for (let i = 24; i >= 0; i--) {
        const timestamp = new Date(now - i * 60 * 60 * 1000 + Math.floor(Math.random() * 50000));
        const responseTimeMs = Math.floor(110 + Math.random() * 80);
        testRunsData.push({
            endpointId: healthyEndpoint.id,
            status: client_1.TestRunStatus.PASSED,
            statusCode: 200,
            responseTimeMs,
            responseBody: JSON.stringify({ status: 'ok', userId: 'usr_8492', timestamp: timestamp.toISOString() }),
            responseHeaders: { 'content-type': 'application/json', 'server': 'gunicorn/19.9.0' },
            assertionResults: [
                { type: client_1.AssertionType.STATUS_CODE, operator: client_1.AssertionOperator.EQUALS, expected: '200', actual: '200', passed: true, message: 'Status code 200 equals 200' },
                { type: client_1.AssertionType.RESPONSE_TIME, operator: client_1.AssertionOperator.LESS_THAN, expected: '800', actual: `${responseTimeMs}`, passed: true, message: `Response time ${responseTimeMs}ms < 800ms` },
            ],
            triggeredBy: client_1.TriggerSource.SCHEDULER,
            timestamp,
        });
    }
    // Generate runs for slow endpoint (passed HTTP 200, but latency 1800-2400ms exceeding 1000ms assertion)
    for (let i = 24; i >= 0; i--) {
        const timestamp = new Date(now - i * 60 * 60 * 1000 + Math.floor(Math.random() * 50000));
        const responseTimeMs = Math.floor(1800 + Math.random() * 600);
        testRunsData.push({
            endpointId: slowEndpoint.id,
            status: client_1.TestRunStatus.FAILED,
            statusCode: 200,
            responseTimeMs,
            responseBody: JSON.stringify({ origin: '198.51.100.1', query: 'electronics' }),
            responseHeaders: { 'content-type': 'application/json' },
            assertionResults: [
                { type: client_1.AssertionType.STATUS_CODE, operator: client_1.AssertionOperator.EQUALS, expected: '200', actual: '200', passed: true, message: 'Status code 200 equals 200' },
                { type: client_1.AssertionType.RESPONSE_TIME, operator: client_1.AssertionOperator.LESS_THAN, expected: '1000', actual: `${responseTimeMs}`, passed: false, message: `Expected response time less_than 1000ms, got ${responseTimeMs}ms` },
            ],
            triggeredBy: client_1.TriggerSource.SCHEDULER,
            timestamp,
        });
    }
    // Generate runs for failing endpoint (recent 8 runs 500 Internal Server Error)
    for (let i = 24; i >= 0; i--) {
        const timestamp = new Date(now - i * 60 * 60 * 1000 + Math.floor(Math.random() * 50000));
        const isRecentFail = i <= 8;
        const responseTimeMs = isRecentFail ? Math.floor(1500 + Math.random() * 500) : Math.floor(200 + Math.random() * 100);
        testRunsData.push({
            endpointId: failingEndpoint.id,
            status: isRecentFail ? client_1.TestRunStatus.FAILED : client_1.TestRunStatus.PASSED,
            statusCode: isRecentFail ? 500 : 200,
            responseTimeMs,
            responseBody: isRecentFail
                ? JSON.stringify({ error: 'Internal Server Error', code: 'DB_CONNECTION_POOL_TIMEOUT', message: 'Connection to postgres-primary.internal timed out after 1500ms' })
                : JSON.stringify({ orderId: `ord_${1000 + i}`, status: 'processed' }),
            responseHeaders: { 'content-type': 'application/json' },
            errorMessage: isRecentFail ? 'Request failed with status code 500 (Internal Server Error)' : null,
            assertionResults: isRecentFail
                ? [{ type: client_1.AssertionType.STATUS_CODE, operator: client_1.AssertionOperator.EQUALS, expected: '200', actual: '500', passed: false, message: 'Expected status equals 200, got 500' }]
                : [{ type: client_1.AssertionType.STATUS_CODE, operator: client_1.AssertionOperator.EQUALS, expected: '200', actual: '200', passed: true, message: 'Status code 200 equals 200' }],
            triggeredBy: client_1.TriggerSource.SCHEDULER,
            timestamp,
        });
    }
    for (const run of testRunsData) {
        await prisma.testRun.create({ data: run });
    }
    console.log(`📊 Created ${testRunsData.length} historical test runs`);
    // 5. Create Incidents
    // Active Incident for failing endpoint
    const activeIncident = await prisma.incident.create({
        data: {
            projectId: project.id,
            endpointId: failingEndpoint.id,
            title: 'POST /status/500 is failing with HTTP 500',
            status: client_1.IncidentStatus.OPEN,
            severity: client_1.IncidentSeverity.CRITICAL,
            errorMessage: 'Database connection pool exhausted: connection timed out after 1500ms',
            failureCount: 8,
            affectedChecks: 8,
            startedAt: new Date(now - 8 * 60 * 60 * 1000),
        },
    });
    // Resolved Incident for healthy endpoint (was down yesterday for 45 min)
    await prisma.incident.create({
        data: {
            projectId: project.id,
            endpointId: healthyEndpoint.id,
            title: 'GET /get high latency anomaly',
            status: client_1.IncidentStatus.RESOLVED,
            severity: client_1.IncidentSeverity.MEDIUM,
            errorMessage: 'Upstream gateway DNS lookup delay',
            failureCount: 4,
            affectedChecks: 4,
            startedAt: new Date(now - 22 * 60 * 60 * 1000),
            resolvedAt: new Date(now - 21 * 60 * 60 * 1000),
        },
    });
    console.log(`🚨 Created active & resolved demo incidents`);
    // 6. Create API Contract Baseline & Contract Changes
    const baselineContract = await prisma.apiContract.create({
        data: {
            endpointId: healthyEndpoint.id,
            spec: JSON.stringify({
                id: 1042,
                name: 'Sarah Connor',
                role: 'admin',
                isActive: true,
                metadata: { tier: 'enterprise', loginCount: 142 }
            }, null, 2),
            specType: client_1.SpecType.JSON_SCHEMA,
            version: '1.0.0',
            isBaseline: true,
        },
    });
    const updatedContract = await prisma.apiContract.create({
        data: {
            endpointId: healthyEndpoint.id,
            spec: JSON.stringify({
                id: '1042', // Type changed from integer to string!
                name: 'Sarah Connor',
                isActive: true,
                metadata: { tier: 'enterprise', loginCount: 142 }
                // role field REMOVED!
            }, null, 2),
            specType: client_1.SpecType.JSON_SCHEMA,
            version: '1.1.0',
            isBaseline: false,
        },
    });
    await prisma.contractChange.createMany({
        data: [
            {
                contractId: updatedContract.id,
                field: 'id',
                changeType: client_1.ContractChangeType.TYPE_CHANGED,
                previousValue: 'number',
                currentValue: 'string',
                severity: client_1.IncidentSeverity.HIGH,
                detectedAt: new Date(now - 2 * 60 * 60 * 1000),
            },
            {
                contractId: updatedContract.id,
                field: 'role',
                changeType: client_1.ContractChangeType.FIELD_REMOVED,
                previousValue: 'string',
                currentValue: null,
                severity: client_1.IncidentSeverity.HIGH,
                detectedAt: new Date(now - 2 * 60 * 60 * 1000),
            },
        ],
    });
    console.log(`📑 Created API contract baseline and contract change records`);
    // 7. Seed AI Analysis for latest failure
    const latestFailRun = await prisma.testRun.findFirst({
        where: { endpointId: failingEndpoint.id, status: client_1.TestRunStatus.FAILED },
        orderBy: { timestamp: 'desc' },
    });
    if (latestFailRun) {
        await prisma.aiAnalysis.create({
            data: {
                testRunId: latestFailRun.id,
                summary: 'Database connection pool timeout causing HTTP 500 during order payment processing.',
                probableCause: 'PostgreSQL primary connection pool (max_connections=100) exhausted due to unindexed queries or deadlocks during concurrent cart checkout.',
                confidence: 0.92,
                evidence: [
                    'HTTP 500 response body contains DB_CONNECTION_POOL_TIMEOUT',
                    'Latency spiked from ~200ms to 1820ms right before server returned 500',
                    '8 consecutive failures starting at 10:32 AM',
                    'Recent deployment v2.4.1 added new inventory locking transaction',
                ],
                suggestedActions: [
                    'Inspect pg_stat_activity for active long-running queries or idle-in-transaction connections',
                    'Check database connection pool configuration (Pool size, max wait timeout)',
                    'Verify that recently added inventory transaction in v2.4.1 releases locks in all error branches',
                    'Temporarily increase pool size or enable connection pooling via PgBouncer',
                ],
                severity: client_1.IncidentSeverity.CRITICAL,
                provider: 'mock-ai-engine',
            },
        });
    }
    // 8. Seed Structured Logs
    const logEntries = [
        { level: client_1.LogLevel.INFO, service: 'scheduler', message: 'Triggered scheduled check for Get User Profile (1m interval)', metadata: { endpointId: healthyEndpoint.id } },
        { level: client_1.LogLevel.WARN, service: 'testing-engine', message: 'High response latency observed on Search Product Catalog: 1940ms > 1000ms threshold', metadata: { endpointId: slowEndpoint.id, latency: 1940 } },
        { level: client_1.LogLevel.ERROR, service: 'monitoring-worker', message: 'HTTP 500 Internal Server Error returned by Process Order Payment', metadata: { endpointId: failingEndpoint.id, status: 500, error: 'DB_CONNECTION_POOL_TIMEOUT' } },
        { level: client_1.LogLevel.CRITICAL, service: 'incident-system', message: 'Incident #1024 escalated to CRITICAL after 8 consecutive failures', metadata: { incidentId: activeIncident.id, failures: 8 } },
        { level: client_1.LogLevel.INFO, service: 'contract-differ', message: 'Contract change detected: field `id` changed from number to string, field `role` removed', metadata: { endpointId: healthyEndpoint.id } },
    ];
    for (const log of logEntries) {
        await prisma.log.create({
            data: {
                projectId: project.id,
                level: log.level,
                service: log.service,
                message: log.message,
                metadata: log.metadata,
                timestamp: new Date(now - Math.floor(Math.random() * 3600000)),
            },
        });
    }
    // 9. Webhook & Notification settings
    await prisma.webhook.create({
        data: {
            projectId: project.id,
            userId: user.id,
            url: 'https://webhook.site/api-guardian-demo-events',
            secret: 'whsec_demo_secret_key_84920491',
            events: ['incident.created', 'incident.resolved', 'contract.changed'],
            enabled: true,
        },
    });
    await prisma.notification.create({
        data: {
            projectId: project.id,
            userId: user.id,
            type: 'EMAIL',
            config: { to: ['devops@example.com', 'oncall@example.com'] },
            enabled: true,
        },
    });
    console.log('✅ Demo seed completed successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map