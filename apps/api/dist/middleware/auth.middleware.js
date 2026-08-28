"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.authenticateWithUser = authenticateWithUser;
exports.requireProjectOwnership = requireProjectOwnership;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errors_js_1 = require("../lib/errors.js");
const client_js_1 = __importDefault(require("../prisma/client.js"));
function authenticate(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        throw new errors_js_1.UnauthorizedError('Missing or invalid Authorization header');
    }
    const token = authHeader.slice(7);
    try {
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET ?? 'change-me-in-production');
        req.user = { id: payload.sub, email: payload.email, name: '' };
        next();
    }
    catch (err) {
        if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new errors_js_1.UnauthorizedError('Token expired');
        }
        throw new errors_js_1.UnauthorizedError('Invalid token');
    }
}
// Middleware that also loads full user from DB (for routes needing name etc.)
async function authenticateWithUser(req, res, next) {
    authenticate(req, res, async () => {
        try {
            const user = await client_js_1.default.user.findUnique({
                where: { id: req.user.id },
                select: { id: true, email: true, name: true },
            });
            if (!user) {
                next(new errors_js_1.UnauthorizedError('User not found'));
                return;
            }
            req.user = user;
            next();
        }
        catch (err) {
            next(err);
        }
    });
}
/**
 * Verifies that the authenticated user owns the given project.
 */
async function requireProjectOwnership(req, _res, next) {
    try {
        const projectId = req.params.projectId ?? req.params.id;
        if (!projectId) {
            next(new errors_js_1.ForbiddenError('Project ID required'));
            return;
        }
        const project = await client_js_1.default.project.findUnique({
            where: { id: projectId },
            select: { userId: true },
        });
        if (!project) {
            // Don't reveal existence — return 403
            next(new errors_js_1.ForbiddenError('Access denied'));
            return;
        }
        if (project.userId !== req.user.id) {
            next(new errors_js_1.ForbiddenError('Access denied'));
            return;
        }
        next();
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=auth.middleware.js.map