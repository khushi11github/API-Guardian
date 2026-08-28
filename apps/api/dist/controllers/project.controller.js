"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectController = void 0;
const project_service_js_1 = require("../services/project.service.js");
const errors_js_1 = require("../lib/errors.js");
exports.projectController = {
    create: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const project = await project_service_js_1.projectService.create(req.user.id, req.body);
        res.status(201).json({ success: true, data: project });
    }),
    list: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const projects = await project_service_js_1.projectService.list(req.user.id);
        res.json({ success: true, data: projects });
    }),
    getById: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const project = await project_service_js_1.projectService.getById(req.user.id, req.params.id);
        res.json({ success: true, data: project });
    }),
    update: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const project = await project_service_js_1.projectService.update(req.user.id, req.params.id, req.body);
        res.json({ success: true, data: project });
    }),
    delete: (0, errors_js_1.asyncHandler)(async (req, res) => {
        await project_service_js_1.projectService.delete(req.user.id, req.params.id);
        res.json({ success: true, data: null, message: 'Project deleted' });
    }),
};
//# sourceMappingURL=project.controller.js.map