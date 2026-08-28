"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectService = exports.ProjectService = void 0;
const client_js_1 = __importDefault(require("../prisma/client.js"));
const errors_js_1 = require("../lib/errors.js");
class ProjectService {
    async create(userId, dto) {
        const project = await client_js_1.default.project.create({
            data: {
                userId,
                name: dto.name.trim(),
                description: dto.description?.trim() ?? null,
                baseUrl: dto.baseUrl.trim().replace(/\/$/, ''),
                environment: dto.environment,
            },
        });
        return project;
    }
    async list(userId) {
        const projects = await client_js_1.default.project.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        return projects;
    }
    async getById(userId, projectId) {
        const project = await client_js_1.default.project.findUnique({
            where: { id: projectId },
        });
        if (!project)
            throw new errors_js_1.NotFoundError('Project');
        if (project.userId !== userId)
            throw new errors_js_1.ForbiddenError('Access denied');
        return project;
    }
    async update(userId, projectId, dto) {
        await this.getById(userId, projectId); // Ownership check
        const project = await client_js_1.default.project.update({
            where: { id: projectId },
            data: {
                ...(dto.name && { name: dto.name.trim() }),
                ...(dto.description !== undefined && { description: dto.description?.trim() ?? null }),
                ...(dto.baseUrl && { baseUrl: dto.baseUrl.trim().replace(/\/$/, '') }),
                ...(dto.environment && { environment: dto.environment }),
                ...(dto.consecutiveFailureThreshold !== undefined && {
                    consecutiveFailureThreshold: dto.consecutiveFailureThreshold,
                }),
            },
        });
        return project;
    }
    async delete(userId, projectId) {
        await this.getById(userId, projectId); // Ownership check
        await client_js_1.default.project.delete({ where: { id: projectId } });
    }
    async verifyOwnership(userId, projectId) {
        const project = await client_js_1.default.project.findUnique({
            where: { id: projectId },
            select: { userId: true },
        });
        if (!project)
            throw new errors_js_1.NotFoundError('Project');
        if (project.userId !== userId)
            throw new errors_js_1.ForbiddenError('Access denied');
    }
}
exports.ProjectService = ProjectService;
exports.projectService = new ProjectService();
//# sourceMappingURL=project.service.js.map