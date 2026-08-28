"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const endpoint_controller_js_1 = require("../controllers/endpoint.controller.js");
const analytics_controller_js_1 = require("../controllers/analytics.controller.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const rateLimiter_middleware_js_1 = require("../middleware/rateLimiter.middleware.js");
const router = (0, express_1.Router)();
router.use(auth_middleware_js_1.authenticate);
// ─── Endpoint CRUD ────────────────────────────────────────────
router.get('/:id', endpoint_controller_js_1.endpointController.getById);
router.put('/:id', endpoint_controller_js_1.endpointController.update);
router.delete('/:id', endpoint_controller_js_1.endpointController.delete);
// ─── Test trigger + results ───────────────────────────────────
router.post('/:id/test', rateLimiter_middleware_js_1.testTriggerRateLimiter, endpoint_controller_js_1.endpointController.triggerTest);
router.get('/:id/results', endpoint_controller_js_1.endpointController.getResults);
// ─── Assertions ───────────────────────────────────────────────
router.get('/:id/assertions', endpoint_controller_js_1.endpointController.listAssertions);
router.post('/:id/assertions', endpoint_controller_js_1.endpointController.addAssertion);
router.put('/:id/assertions/:assertionId', endpoint_controller_js_1.endpointController.updateAssertion);
router.delete('/:id/assertions/:assertionId', endpoint_controller_js_1.endpointController.deleteAssertion);
// ─── Analytics per endpoint ───────────────────────────────────
router.get('/:endpointId/analytics/response-time', analytics_controller_js_1.analyticsController.getResponseTimeHistory);
exports.default = router;
//# sourceMappingURL=endpoint.routes.js.map