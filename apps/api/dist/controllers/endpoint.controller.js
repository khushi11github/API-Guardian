"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.endpointController = void 0;
const endpoint_service_js_1 = require("../services/endpoint.service.js");
const testing_service_js_1 = require("../services/testing.service.js");
const errors_js_1 = require("../lib/errors.js");
exports.endpointController = {
    create: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const endpoint = await endpoint_service_js_1.endpointService.create(req.user.id, req.params.projectId, req.body);
        res.status(201).json({ success: true, data: endpoint });
    }),
    listByProject: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const endpoints = await endpoint_service_js_1.endpointService.listByProject(req.user.id, req.params.projectId);
        res.json({ success: true, data: endpoints });
    }),
    getById: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const endpoint = await endpoint_service_js_1.endpointService.getById(req.user.id, req.params.id);
        res.json({ success: true, data: endpoint });
    }),
    update: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const endpoint = await endpoint_service_js_1.endpointService.update(req.user.id, req.params.id, req.body);
        res.json({ success: true, data: endpoint });
    }),
    delete: (0, errors_js_1.asyncHandler)(async (req, res) => {
        await endpoint_service_js_1.endpointService.delete(req.user.id, req.params.id);
        res.json({ success: true, data: null, message: 'Endpoint deleted' });
    }),
    triggerTest: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const result = await testing_service_js_1.testingService.runTest(req.user.id, req.params.id, 'MANUAL');
        res.json({ success: true, data: result });
    }),
    getResults: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const { page, pageSize, status } = req.query;
        const results = await testing_service_js_1.testingService.getResults(req.user.id, req.params.id, {
            page: page ? parseInt(page) : 1,
            pageSize: pageSize ? parseInt(pageSize) : 20,
            status: status,
        });
        res.json({ success: true, data: results });
    }),
    // Assertions
    addAssertion: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const assertion = await endpoint_service_js_1.endpointService.addAssertion(req.user.id, req.params.id, req.body);
        res.status(201).json({ success: true, data: assertion });
    }),
    listAssertions: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const assertions = await endpoint_service_js_1.endpointService.listAssertions(req.user.id, req.params.id);
        res.json({ success: true, data: assertions });
    }),
    updateAssertion: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const assertion = await endpoint_service_js_1.endpointService.updateAssertion(req.user.id, req.params.id, req.params.assertionId, req.body);
        res.json({ success: true, data: assertion });
    }),
    deleteAssertion: (0, errors_js_1.asyncHandler)(async (req, res) => {
        await endpoint_service_js_1.endpointService.deleteAssertion(req.user.id, req.params.id, req.params.assertionId);
        res.json({ success: true, data: null });
    }),
};
//# sourceMappingURL=endpoint.controller.js.map