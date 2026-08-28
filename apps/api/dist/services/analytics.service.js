"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsService = exports.AnalyticsService = void 0;
const client_js_1 = __importDefault(require("../prisma/client.js"));
class AnalyticsService {
    async getProjectStats(userId, projectId) {
        // Verify ownership
        const project = await client_js_1.default.project.findFirst({
            where: { id: projectId, userId },
        });
        if (!project) {
            return this.emptyStats();
        }
        const endpoints = await client_js_1.default.endpoint.findMany({
            where: { projectId },
            select: { id: true, isActive: true },
        });
        const endpointIds = endpoints.map(e => e.id);
        // Last 24h test runs for stats
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [recentRuns, activeIncidents] = await Promise.all([
            client_js_1.default.testRun.findMany({
                where: {
                    endpointId: { in: endpointIds },
                    timestamp: { gte: since24h },
                },
                select: {
                    endpointId: true,
                    status: true,
                    responseTimeMs: true,
                },
            }),
            client_js_1.default.incident.count({
                where: {
                    projectId,
                    status: { in: ['OPEN', 'INVESTIGATING'] },
                },
            }),
        ]);
        // Per-endpoint health
        const endpointStatus = new Map();
        for (const ep of endpoints) {
            const runs = recentRuns.filter(r => r.endpointId === ep.id);
            if (runs.length === 0) {
                endpointStatus.set(ep.id, 'healthy'); // no data yet
                continue;
            }
            const passedCount = runs.filter(r => r.status === 'PASSED').length;
            const rate = passedCount / runs.length;
            if (rate >= 0.95)
                endpointStatus.set(ep.id, 'healthy');
            else if (rate >= 0.7)
                endpointStatus.set(ep.id, 'degraded');
            else
                endpointStatus.set(ep.id, 'failing');
        }
        const healthyEndpoints = [...endpointStatus.values()].filter(s => s === 'healthy').length;
        const failingEndpoints = [...endpointStatus.values()].filter(s => s === 'failing').length;
        const degradedEndpoints = [...endpointStatus.values()].filter(s => s === 'degraded').length;
        const responseTimes = recentRuns
            .filter(r => r.responseTimeMs !== null)
            .map(r => r.responseTimeMs);
        const averageResponseTimeMs = responseTimes.length > 0
            ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
            : 0;
        const totalRuns = recentRuns.length;
        const passedRuns = recentRuns.filter(r => r.status === 'PASSED').length;
        const uptimePercentage = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 10000) / 100 : 100;
        const failureRate = totalRuns > 0 ? Math.round(((totalRuns - passedRuns) / totalRuns) * 10000) / 100 : 0;
        return {
            totalEndpoints: endpoints.length,
            healthyEndpoints,
            failingEndpoints,
            degradedEndpoints,
            averageResponseTimeMs,
            uptimePercentage,
            totalTestRuns: totalRuns,
            failureRate,
            activeIncidents,
        };
    }
    async getResponseTimeHistory(userId, endpointId, hours = 24) {
        const endpoint = await client_js_1.default.endpoint.findUnique({
            where: { id: endpointId },
            include: { project: { select: { userId: true } } },
        });
        if (!endpoint || endpoint.project.userId !== userId)
            return [];
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);
        const runs = await client_js_1.default.testRun.findMany({
            where: {
                endpointId,
                timestamp: { gte: since },
            },
            orderBy: { timestamp: 'asc' },
            select: { timestamp: true, responseTimeMs: true, status: true },
        });
        return runs.map(r => ({
            timestamp: r.timestamp,
            value: r.responseTimeMs ?? 0,
            status: r.status,
        }));
    }
    async getUptimeHistory(userId, projectId, days = 30) {
        const project = await client_js_1.default.project.findFirst({
            where: { id: projectId, userId },
        });
        if (!project)
            return [];
        const endpoints = await client_js_1.default.endpoint.findMany({
            where: { projectId },
            select: { id: true },
        });
        const endpointIds = endpoints.map(e => e.id);
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const runs = await client_js_1.default.testRun.findMany({
            where: {
                endpointId: { in: endpointIds },
                timestamp: { gte: since },
            },
            select: { timestamp: true, status: true },
        });
        // Group by day
        const dayMap = new Map();
        for (const run of runs) {
            const day = run.timestamp.toISOString().split('T')[0];
            const existing = dayMap.get(day) ?? { passed: 0, total: 0 };
            existing.total++;
            if (run.status === 'PASSED')
                existing.passed++;
            dayMap.set(day, existing);
        }
        return Array.from(dayMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, { passed, total }]) => ({
            date,
            uptime: total > 0 ? Math.round((passed / total) * 10000) / 100 : 100,
            total,
            passed,
            failed: total - passed,
        }));
    }
    async getDashboardStats(userId) {
        const projects = await client_js_1.default.project.findMany({
            where: { userId },
            select: { id: true, name: true },
        });
        const projectStats = await Promise.all(projects.map(async (p) => ({
            id: p.id,
            name: p.name,
            stats: await this.getProjectStats(userId, p.id),
        })));
        const totalEndpoints = projectStats.reduce((a, p) => a + p.stats.totalEndpoints, 0);
        const totalTestRuns24h = projectStats.reduce((a, p) => a + p.stats.totalTestRuns, 0);
        const activeIncidents = projectStats.reduce((a, p) => a + p.stats.activeIncidents, 0);
        const responseTimes = projectStats
            .filter(p => p.stats.averageResponseTimeMs > 0)
            .map(p => p.stats.averageResponseTimeMs);
        const averageResponseTimeMs = responseTimes.length > 0
            ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
            : 0;
        const uptimes = projectStats
            .filter(p => p.stats.totalTestRuns > 0)
            .map(p => p.stats.uptimePercentage);
        const overallUptime = uptimes.length > 0
            ? Math.round((uptimes.reduce((a, b) => a + b, 0) / uptimes.length) * 100) / 100
            : 100;
        return {
            totalProjects: projects.length,
            totalEndpoints,
            totalTestRuns24h,
            averageResponseTimeMs,
            overallUptime,
            activeIncidents,
            projects: projectStats,
        };
    }
    emptyStats() {
        return {
            totalEndpoints: 0,
            healthyEndpoints: 0,
            failingEndpoints: 0,
            degradedEndpoints: 0,
            averageResponseTimeMs: 0,
            uptimePercentage: 100,
            totalTestRuns: 0,
            failureRate: 0,
            activeIncidents: 0,
        };
    }
}
exports.AnalyticsService = AnalyticsService;
exports.analyticsService = new AnalyticsService();
//# sourceMappingURL=analytics.service.js.map