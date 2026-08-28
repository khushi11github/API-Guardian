"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const project_controller_js_1 = require("../controllers/project.controller.js");
const endpoint_controller_js_1 = require("../controllers/endpoint.controller.js");
const incident_controller_js_1 = require("../controllers/incident.controller.js");
const analytics_controller_js_1 = require("../controllers/analytics.controller.js");
const log_controller_js_1 = require("../controllers/log.controller.js");
const webhook_controller_js_1 = require("../controllers/webhook.controller.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const router = (0, express_1.Router)();
// All project routes require authentication
router.use(auth_middleware_js_1.authenticate);
// ─── Projects ────────────────────────────────────────────────
router.get('/', project_controller_js_1.projectController.list);
router.post('/', project_controller_js_1.projectController.create);
router.get('/:id', project_controller_js_1.projectController.getById);
router.put('/:id', project_controller_js_1.projectController.update);
router.delete('/:id', project_controller_js_1.projectController.delete);
// ─── Endpoints (nested under project) ────────────────────────
router.get('/:projectId/endpoints', endpoint_controller_js_1.endpointController.listByProject);
router.post('/:projectId/endpoints', endpoint_controller_js_1.endpointController.create);
// ─── Incidents ────────────────────────────────────────────────
router.get('/:projectId/incidents', incident_controller_js_1.incidentController.list);
// ─── Analytics ───────────────────────────────────────────────
router.get('/:projectId/analytics', analytics_controller_js_1.analyticsController.getProjectStats);
router.get('/:projectId/analytics/uptime', analytics_controller_js_1.analyticsController.getUptimeHistory);
// ─── Logs ────────────────────────────────────────────────────
router.get('/:projectId/logs', log_controller_js_1.logController.list);
// ─── Webhooks ────────────────────────────────────────────────
router.get('/:projectId/webhooks', webhook_controller_js_1.webhookController.list);
router.post('/:projectId/webhooks', webhook_controller_js_1.webhookController.create);
router.get('/:projectId/notifications', webhook_controller_js_1.webhookController.listNotifications);
router.post('/:projectId/notifications', webhook_controller_js_1.webhookController.createNotification);
exports.default = router;
//# sourceMappingURL=project.routes.js.map