"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsController = void 0;
const analytics_service_js_1 = require("../services/analytics.service.js");
const errors_js_1 = require("../lib/errors.js");
exports.analyticsController = {
    getDashboard: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const stats = await analytics_service_js_1.analyticsService.getDashboardStats(req.user.id);
        res.json({ success: true, data: stats });
    }),
    getProjectStats: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const stats = await analytics_service_js_1.analyticsService.getProjectStats(req.user.id, req.params.projectId);
        res.json({ success: true, data: stats });
    }),
    getResponseTimeHistory: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const hours = req.query.hours ? parseInt(req.query.hours) : 24;
        const data = await analytics_service_js_1.analyticsService.getResponseTimeHistory(req.user.id, req.params.endpointId, hours);
        res.json({ success: true, data });
    }),
    getUptimeHistory: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const days = req.query.days ? parseInt(req.query.days) : 30;
        const data = await analytics_service_js_1.analyticsService.getUptimeHistory(req.user.id, req.params.projectId, days);
        res.json({ success: true, data });
    }),
};
//# sourceMappingURL=analytics.controller.js.map