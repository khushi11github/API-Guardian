"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.incidentService = exports.IncidentService = void 0;
const client_js_1 = __importDefault(require("../prisma/client.js"));
const logger_js_1 = require("../lib/logger.js");
const notification_service_js_1 = require("./notification.service.js");
function determineSeverity(statusCode, failureCount) {
    if (statusCode === null)
        return 'HIGH';
    if (statusCode >= 500)
        return failureCount >= 5 ? 'CRITICAL' : 'HIGH';
    if (statusCode >= 400)
        return 'MEDIUM';
    return failureCount >= 10 ? 'HIGH' : 'MEDIUM';
}
class IncidentService {
    async handleFailure(endpointId, projectId, userId, ctx, testRunId) {
        const project = await client_js_1.default.project.findUnique({
            where: { id: projectId },
            select: { consecutiveFailureThreshold: true },
        });
        const threshold = project?.consecutiveFailureThreshold ?? 3;
        // Count consecutive failures
        const recentRuns = await client_js_1.default.testRun.findMany({
            where: { endpointId },
            orderBy: { timestamp: 'desc' },
            take: threshold,
            select: { status: true },
        });
        const consecutiveFails = recentRuns.filter(r => r.status !== 'PASSED').length;
        // Find existing open incident
        const existingIncident = await client_js_1.default.incident.findFirst({
            where: {
                endpointId,
                status: { in: ['OPEN', 'INVESTIGATING'] },
            },
            orderBy: { startedAt: 'desc' },
        });
        if (existingIncident) {
            // Update existing incident
            await client_js_1.default.incident.update({
                where: { id: existingIncident.id },
                data: {
                    failureCount: { increment: 1 },
                    affectedChecks: { increment: 1 },
                    severity: determineSeverity(ctx.statusCode, existingIncident.failureCount + 1),
                    errorMessage: ctx.errorMessage ?? existingIncident.errorMessage,
                },
            });
        }
        else if (consecutiveFails >= threshold) {
            // Create new incident
            const endpoint = await client_js_1.default.endpoint.findUnique({
                where: { id: endpointId },
                select: { name: true, method: true, path: true },
            });
            const severity = determineSeverity(ctx.statusCode, consecutiveFails);
            const incident = await client_js_1.default.incident.create({
                data: {
                    endpointId,
                    projectId,
                    title: `${endpoint?.method ?? 'HTTP'} ${endpoint?.path ?? endpointId} is failing`,
                    severity,
                    status: 'OPEN',
                    errorMessage: ctx.errorMessage ?? `HTTP ${ctx.statusCode}`,
                    failureCount: consecutiveFails,
                    affectedChecks: consecutiveFails,
                },
            });
            logger_js_1.logger.warn(`Incident created: ${incident.id}`, { endpointId, severity });
            // Notify
            await notification_service_js_1.notificationService.notifyIncident(projectId, incident.id, {
                incidentId: incident.id,
                endpointId,
                endpointName: endpoint?.name ?? endpointId,
                method: endpoint?.method ?? 'GET',
                path: endpoint?.path ?? '/',
                statusCode: ctx.statusCode,
                failureCount: consecutiveFails,
                severity,
                startedAt: new Date().toISOString(),
                errorMessage: ctx.errorMessage,
            });
        }
    }
    async handleRecovery(endpointId, projectId) {
        const openIncidents = await client_js_1.default.incident.findMany({
            where: {
                endpointId,
                status: { in: ['OPEN', 'INVESTIGATING'] },
            },
        });
        for (const incident of openIncidents) {
            await client_js_1.default.incident.update({
                where: { id: incident.id },
                data: {
                    status: 'RESOLVED',
                    resolvedAt: new Date(),
                },
            });
            logger_js_1.logger.info(`Incident resolved: ${incident.id}`, { endpointId });
            // Notify recovery
            const endpoint = await client_js_1.default.endpoint.findUnique({
                where: { id: endpointId },
                select: { name: true, method: true, path: true },
            });
            await notification_service_js_1.notificationService.notifyRecovery(projectId, {
                incidentId: incident.id,
                endpointId,
                endpointName: endpoint?.name ?? endpointId,
                method: endpoint?.method ?? 'GET',
                path: endpoint?.path ?? '/',
                resolvedAt: new Date().toISOString(),
            });
        }
    }
    async list(userId, projectId, status) {
        // Verify ownership
        const project = await client_js_1.default.project.findUnique({
            where: { id: projectId },
            select: { userId: true },
        });
        if (!project || project.userId !== userId)
            return [];
        return client_js_1.default.incident.findMany({
            where: {
                projectId,
                ...(status && { status }),
            },
            include: {
                endpoint: { select: { name: true, method: true, path: true } },
            },
            orderBy: { startedAt: 'desc' },
        });
    }
    async getById(userId, incidentId) {
        const incident = await client_js_1.default.incident.findUnique({
            where: { id: incidentId },
            include: {
                endpoint: { select: { name: true, method: true, path: true } },
                project: { select: { userId: true, name: true } },
            },
        });
        if (!incident || incident.project.userId !== userId)
            return null;
        return incident;
    }
    async update(userId, incidentId, status) {
        const incident = await this.getById(userId, incidentId);
        if (!incident)
            return null;
        return client_js_1.default.incident.update({
            where: { id: incidentId },
            data: {
                status,
                ...(status === 'RESOLVED' && { resolvedAt: new Date() }),
            },
        });
    }
}
exports.IncidentService = IncidentService;
exports.incidentService = new IncidentService();
//# sourceMappingURL=incident.service.js.map