"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.incidentController = void 0;
const incident_service_js_1 = require("../services/incident.service.js");
const errors_js_1 = require("../lib/errors.js");
const ai_service_js_1 = require("../services/ai.service.js");
const client_js_1 = __importDefault(require("../prisma/client.js"));
exports.incidentController = {
    list: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const { status } = req.query;
        const incidents = await incident_service_js_1.incidentService.list(req.user.id, req.params.projectId, status);
        res.json({ success: true, data: incidents });
    }),
    getById: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const incident = await incident_service_js_1.incidentService.getById(req.user.id, req.params.id);
        res.json({ success: true, data: incident });
    }),
    update: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const incident = await incident_service_js_1.incidentService.update(req.user.id, req.params.id, req.body.status);
        res.json({ success: true, data: incident });
    }),
    analyzeWithAi: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const { testRunId } = req.params;
        // Check for cached analysis
        const cached = await client_js_1.default.aiAnalysis.findFirst({
            where: { testRunId },
            orderBy: { createdAt: 'desc' },
        });
        // Load test run + endpoint
        const testRun = await client_js_1.default.testRun.findUnique({
            where: { id: testRunId },
            include: {
                endpoint: {
                    include: {
                        project: { select: { userId: true } },
                    },
                },
            },
        });
        if (!testRun) {
            res.status(404).json({ success: false, error: 'Test run not found' });
            return;
        }
        if (testRun.endpoint.project.userId !== req.user.id) {
            res.status(403).json({ success: false, error: 'Access denied' });
            return;
        }
        if (cached && cached.createdAt > new Date(Date.now() - 5 * 60 * 1000)) {
            // Return cached if < 5 minutes old
            res.json({ success: true, data: cached, cached: true });
            return;
        }
        // Get recent history
        const recentHistory = await client_js_1.default.testRun.findMany({
            where: { endpointId: testRun.endpointId },
            orderBy: { timestamp: 'desc' },
            take: 20,
            select: { id: true, status: true, statusCode: true, responseTimeMs: true, errorMessage: true, timestamp: true },
        });
        const input = {
            endpoint: {
                name: testRun.endpoint.name,
                method: testRun.endpoint.method,
                path: testRun.endpoint.path,
                expectedStatusCode: testRun.endpoint.expectedStatusCode,
            },
            testRun: {
                status: testRun.status,
                statusCode: testRun.statusCode,
                responseTimeMs: testRun.responseTimeMs,
                responseBody: testRun.responseBody,
                responseHeaders: testRun.responseHeaders,
                errorMessage: testRun.errorMessage,
                assertionResults: testRun.assertionResults,
            },
            recentHistory: recentHistory,
            recentFailures: recentHistory.filter(r => r.status !== 'PASSED'),
        };
        const output = await ai_service_js_1.aiService.analyze(input);
        // Save analysis
        const analysis = await client_js_1.default.aiAnalysis.create({
            data: {
                testRunId,
                summary: output.summary,
                probableCause: output.probableCause,
                confidence: output.confidence,
                evidence: output.evidence,
                suggestedActions: output.suggestedActions,
                severity: output.severity,
                provider: ai_service_js_1.aiService.providerName,
            },
        });
        res.json({ success: true, data: analysis, cached: false });
    }),
};
//# sourceMappingURL=incident.controller.js.map