"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
// Prevent multiple Prisma instances in development (hot reload)
const prisma = globalThis.__prisma ?? new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
if (process.env.NODE_ENV !== 'production') {
    globalThis.__prisma = prisma;
}
exports.default = prisma;
//# sourceMappingURL=client.js.map