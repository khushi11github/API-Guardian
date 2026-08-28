"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const auth_service_js_1 = require("../services/auth.service.js");
const errors_js_1 = require("../lib/errors.js");
exports.authController = {
    register: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const { user, tokens } = await auth_service_js_1.authService.register(req.body);
        res.status(201).json({
            success: true,
            data: { user, tokens },
            message: 'Account created successfully',
        });
    }),
    login: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const { user, tokens } = await auth_service_js_1.authService.login(req.body);
        res.json({
            success: true,
            data: { user, tokens },
            message: 'Logged in successfully',
        });
    }),
    refresh: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const { refreshToken } = req.body;
        const tokens = await auth_service_js_1.authService.refreshTokens(refreshToken);
        res.json({ success: true, data: tokens });
    }),
    getProfile: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const user = await auth_service_js_1.authService.getProfile(req.user.id);
        res.json({ success: true, data: user });
    }),
    updateProfile: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const user = await auth_service_js_1.authService.updateProfile(req.user.id, req.body);
        res.json({ success: true, data: user });
    }),
    changePassword: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const { currentPassword, newPassword } = req.body;
        await auth_service_js_1.authService.changePassword(req.user.id, currentPassword, newPassword);
        res.json({ success: true, data: null, message: 'Password changed successfully' });
    }),
};
//# sourceMappingURL=auth.controller.js.map