"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testTriggerRateLimiter = exports.apiRateLimiter = exports.authRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: {
        success: false,
        error: 'Too many authentication attempts, please try again after 15 minutes',
        code: 'RATE_LIMITED',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.apiRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 120,
    message: {
        success: false,
        error: 'Too many requests, please slow down',
        code: 'RATE_LIMITED',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.testTriggerRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30,
    message: {
        success: false,
        error: 'Too many test triggers, please slow down',
        code: 'RATE_LIMITED',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
//# sourceMappingURL=rateLimiter.middleware.js.map