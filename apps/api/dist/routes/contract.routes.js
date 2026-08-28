"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contract_controller_js_1 = require("../controllers/contract.controller.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const router = (0, express_1.Router)();
router.use(auth_middleware_js_1.authenticate);
router.get('/endpoints/:endpointId/contracts', contract_controller_js_1.contractController.getEndpointContracts);
router.post('/endpoints/:endpointId/contracts', contract_controller_js_1.contractController.uploadOpenApiSpec);
router.get('/endpoints/:endpointId/contracts/changes', contract_controller_js_1.contractController.getContractChanges);
exports.default = router;
//# sourceMappingURL=contract.routes.js.map