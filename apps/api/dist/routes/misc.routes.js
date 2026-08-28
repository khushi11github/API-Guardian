"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const incident_controller_js_1 = require("../controllers/incident.controller.js");
const analytics_controller_js_1 = require("../controllers/analytics.controller.js");
const log_controller_js_1 = require("../controllers/log.controller.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const router = (0, express_1.Router)();
router.use(auth_middleware_js_1.authenticate);
router.get('/incidents/:id', incident_controller_js_1.incidentController.getById);
router.put('/incidents/:id', incident_controller_js_1.incidentController.update);
router.post('/incidents/test-runs/:testRunId/analyze', incident_controller_js_1.incidentController.analyzeWithAi);
router.get('/analytics/dashboard', analytics_controller_js_1.analyticsController.getDashboard);
router.get('/logs', log_controller_js_1.logController.list);
exports.default = router;
//# sourceMappingURL=misc.routes.js.map