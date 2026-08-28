"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_js_1 = require("../controllers/auth.controller.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const rateLimiter_middleware_js_1 = require("../middleware/rateLimiter.middleware.js");
const router = (0, express_1.Router)();
router.post('/register', rateLimiter_middleware_js_1.authRateLimiter, auth_controller_js_1.authController.register);
router.post('/login', rateLimiter_middleware_js_1.authRateLimiter, auth_controller_js_1.authController.login);
router.post('/refresh', rateLimiter_middleware_js_1.authRateLimiter, auth_controller_js_1.authController.refresh);
// Protected
router.get('/me', auth_middleware_js_1.authenticate, auth_controller_js_1.authController.getProfile);
router.put('/me', auth_middleware_js_1.authenticate, auth_controller_js_1.authController.updateProfile);
router.post('/me/change-password', auth_middleware_js_1.authenticate, auth_controller_js_1.authController.changePassword);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map