"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.endpointService = exports.EndpointService = void 0;
const client_js_1 = __importDefault(require("../prisma/client.js"));
const errors_js_1 = require("../lib/errors.js");
const project_service_js_1 = require("./project.service.js");
const scheduler_service_js_1 = require("./scheduler.service.js");
class EndpointService {
    async create(userId, projectId, dto) {
        await project_service_js_1.projectService.verifyOwnership(userId, projectId);
        const endpoint = await client_js_1.default.endpoint.create({
            data: {
                projectId,
                name: dto.name.trim(),
                method: dto.method ?? 'GET',
                path: dto.path.trim(),
                description: dto.description?.trim() ?? null,
                headers: (dto.headers ?? []),
                parameters: (dto.parameters ?? []),
                body: dto.body ?? null,
                expectedStatusCode: dto.expectedStatusCode ?? 200,
                expectedSchema: dto.expectedSchema ?? null,
                timeoutMs: dto.timeoutMs ?? 30000,
                schedule: dto.schedule ?? 'MANUAL',
                authType: dto.authType ?? 'NONE',
                authConfig: dto.authConfig ?? null,
            },
            include: { assertions: true },
        });
        // Schedule monitoring if not MANUAL
        if (endpoint.schedule !== 'MANUAL') {
            await scheduler_service_js_1.schedulerService.scheduleEndpoint(endpoint.id, endpoint.schedule);
        }
        return endpoint;
    }
    async listByProject(userId, projectId) {
        await project_service_js_1.projectService.verifyOwnership(userId, projectId);
        const endpoints = await client_js_1.default.endpoint.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
            include: {
                assertions: true,
                _count: { select: { testRuns: true, incidents: true } },
            },
        });
        return endpoints;
    }
    async getById(userId, endpointId) {
        const endpoint = await client_js_1.default.endpoint.findUnique({
            where: { id: endpointId },
            include: {
                assertions: true,
                project: { select: { userId: true } },
            },
        });
        if (!endpoint)
            throw new errors_js_1.NotFoundError('Endpoint');
        if (endpoint.project.userId !== userId)
            throw new errors_js_1.ForbiddenError('Access denied');
        return endpoint;
    }
    async update(userId, endpointId, dto) {
        const existing = await this.getById(userId, endpointId);
        const endpoint = await client_js_1.default.endpoint.update({
            where: { id: endpointId },
            data: {
                ...(dto.name && { name: dto.name.trim() }),
                ...(dto.method && { method: dto.method }),
                ...(dto.path && { path: dto.path.trim() }),
                ...(dto.description !== undefined && { description: dto.description?.trim() ?? null }),
                ...(dto.headers !== undefined && { headers: dto.headers }),
                ...(dto.parameters !== undefined && { parameters: dto.parameters }),
                ...(dto.body !== undefined && { body: dto.body }),
                ...(dto.expectedStatusCode !== undefined && { expectedStatusCode: dto.expectedStatusCode }),
                ...(dto.expectedSchema !== undefined && { expectedSchema: dto.expectedSchema }),
                ...(dto.timeoutMs !== undefined && { timeoutMs: dto.timeoutMs }),
                ...(dto.schedule !== undefined && { schedule: dto.schedule }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
                ...(dto.authType !== undefined && { authType: dto.authType }),
                ...(dto.authConfig !== undefined && { authConfig: dto.authConfig }),
            },
            include: { assertions: true },
        });
        // Update scheduler if schedule changed
        if (dto.schedule && dto.schedule !== existing.schedule) {
            if (dto.schedule === 'MANUAL') {
                await scheduler_service_js_1.schedulerService.unscheduleEndpoint(endpointId);
            }
            else {
                await scheduler_service_js_1.schedulerService.scheduleEndpoint(endpointId, dto.schedule);
            }
        }
        // Pause/resume on isActive change
        if (dto.isActive === false) {
            await scheduler_service_js_1.schedulerService.unscheduleEndpoint(endpointId);
        }
        else if (dto.isActive === true && endpoint.schedule !== 'MANUAL') {
            await scheduler_service_js_1.schedulerService.scheduleEndpoint(endpointId, endpoint.schedule);
        }
        return endpoint;
    }
    async delete(userId, endpointId) {
        await this.getById(userId, endpointId);
        await scheduler_service_js_1.schedulerService.unscheduleEndpoint(endpointId);
        await client_js_1.default.endpoint.delete({ where: { id: endpointId } });
    }
    // ─── Assertions ─────────────────────────────────────────────
    async addAssertion(userId, endpointId, dto) {
        await this.getById(userId, endpointId);
        const assertion = await client_js_1.default.assertion.create({
            data: {
                endpointId,
                type: dto.type,
                field: dto.field ?? null,
                operator: dto.operator,
                expected: dto.expected,
            },
        });
        return assertion;
    }
    async updateAssertion(userId, endpointId, assertionId, dto) {
        await this.getById(userId, endpointId);
        const assertion = await client_js_1.default.assertion.update({
            where: { id: assertionId },
            data: {
                ...(dto.type && { type: dto.type }),
                ...(dto.field !== undefined && { field: dto.field ?? null }),
                ...(dto.operator && { operator: dto.operator }),
                ...(dto.expected !== undefined && { expected: dto.expected }),
            },
        });
        return assertion;
    }
    async deleteAssertion(userId, endpointId, assertionId) {
        await this.getById(userId, endpointId);
        await client_js_1.default.assertion.delete({ where: { id: assertionId } });
    }
    async listAssertions(userId, endpointId) {
        await this.getById(userId, endpointId);
        const assertions = await client_js_1.default.assertion.findMany({
            where: { endpointId, isActive: true },
        });
        return assertions;
    }
}
exports.EndpointService = EndpointService;
exports.endpointService = new EndpointService();
//# sourceMappingURL=endpoint.service.js.map