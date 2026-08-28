"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const rateLimiter_middleware_js_1 = require("./middleware/rateLimiter.middleware.js");
const errors_js_1 = require("./lib/errors.js");
const auth_routes_js_1 = __importDefault(require("./routes/auth.routes.js"));
const project_routes_js_1 = __importDefault(require("./routes/project.routes.js"));
const endpoint_routes_js_1 = __importDefault(require("./routes/endpoint.routes.js"));
const contract_routes_js_1 = __importDefault(require("./routes/contract.routes.js"));
const misc_routes_js_1 = __importDefault(require("./routes/misc.routes.js"));
function createApp() {
    const app = (0, express_1.default)();
    // Security & standard middleware
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)({
        origin: process.env.FRONTEND_URL || '*',
        credentials: true,
    }));
    app.use((0, compression_1.default)());
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    if (process.env.NODE_ENV !== 'test') {
        app.use((0, morgan_1.default)('combined'));
    }
    // Health check (public)
    app.get('/api/health', (req, res) => {
        res.json({
            status: 'ok',
            service: 'api-guardian',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
        });
    });
    // Apply general rate limiter
    app.use('/api', rateLimiter_middleware_js_1.apiRateLimiter);
    // Mount API routers
    app.use('/api/auth', auth_routes_js_1.default);
    app.use('/api/projects', project_routes_js_1.default);
    app.use('/api/endpoints', endpoint_routes_js_1.default);
    app.use('/api', contract_routes_js_1.default);
    app.use('/api', misc_routes_js_1.default);
    // 404 handler
    app.use((req, res) => {
        res.status(404).json({
            success: false,
            error: `Cannot ${req.method} ${req.path}`,
            code: 'ROUTE_NOT_FOUND',
        });
    });
    // Global error handler
    app.use(errors_js_1.errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map