"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logController = void 0;
const log_service_js_1 = require("../services/log.service.js");
const errors_js_1 = require("../lib/errors.js");
exports.logController = {
    list: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const { projectId, endpointId, level, search, startDate, endDate, page, pageSize } = req.query;
        const result = await log_service_js_1.logService.list(req.user.id, {
            projectId: projectId,
            endpointId: endpointId,
            level: level,
            search: search,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            page: page ? parseInt(page) : 1,
            pageSize: pageSize ? parseInt(pageSize) : 50,
        });
        res.json({ success: true, data: result });
    }),
};
//# sourceMappingURL=log.controller.js.map