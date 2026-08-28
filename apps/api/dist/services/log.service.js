"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logService = exports.LogService = void 0;
const client_js_1 = __importDefault(require("../prisma/client.js"));
class LogService {
    async log(input) {
        await client_js_1.default.log.create({
            data: {
                projectId: input.projectId ?? null,
                endpointId: input.endpointId ?? null,
                level: input.level,
                service: input.service,
                message: input.message,
                metadata: (input.metadata ?? {}),
            },
        });
    }
    async list(userId, filters = {}) {
        const { projectId, endpointId, level, search, startDate, endDate, page = 1, pageSize = 50 } = filters;
        // Build where clause (always scoped to user's projects)
        const where = {
            ...(projectId
                ? { projectId, project: { userId } }
                : { project: { userId } }),
            ...(endpointId && { endpointId }),
            ...(level && { level }),
            ...(search && { message: { contains: search, mode: 'insensitive' } }),
            ...(startDate || endDate
                ? {
                    timestamp: {
                        ...(startDate && { gte: startDate }),
                        ...(endDate && { lte: endDate }),
                    },
                }
                : {}),
        };
        const [data, total] = await Promise.all([
            client_js_1.default.log.findMany({
                where,
                orderBy: { timestamp: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    endpoint: { select: { name: true, method: true, path: true } },
                },
            }),
            client_js_1.default.log.count({ where }),
        ]);
        return {
            data,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }
}
exports.LogService = LogService;
exports.logService = new LogService();
//# sourceMappingURL=log.service.js.map