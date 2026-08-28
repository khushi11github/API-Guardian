"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractController = void 0;
const client_js_1 = __importDefault(require("../prisma/client.js"));
const errors_js_1 = require("../lib/errors.js");
const yaml_1 = __importDefault(require("yaml"));
exports.contractController = {
    getEndpointContracts: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const { endpointId } = req.params;
        const endpoint = await client_js_1.default.endpoint.findUnique({
            where: { id: endpointId },
            include: { project: { select: { userId: true } } },
        });
        if (!endpoint)
            throw new errors_js_1.NotFoundError('Endpoint');
        if (endpoint.project.userId !== req.user.id)
            throw new errors_js_1.ForbiddenError('Access denied');
        const contracts = await client_js_1.default.apiContract.findMany({
            where: { endpointId },
            include: { changes: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: contracts });
    }),
    uploadOpenApiSpec: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const { endpointId } = req.params;
        const { specContent, specType = 'OPENAPI' } = req.body;
        if (!specContent) {
            throw new errors_js_1.ValidationError('specContent is required');
        }
        const endpoint = await client_js_1.default.endpoint.findUnique({
            where: { id: endpointId },
            include: { project: { select: { userId: true } } },
        });
        if (!endpoint)
            throw new errors_js_1.NotFoundError('Endpoint');
        if (endpoint.project.userId !== req.user.id)
            throw new errors_js_1.ForbiddenError('Access denied');
        let parsedSpec;
        try {
            if (typeof specContent === 'object') {
                parsedSpec = specContent;
            }
            else if (specContent.trim().startsWith('{')) {
                parsedSpec = JSON.parse(specContent);
            }
            else {
                parsedSpec = yaml_1.default.parse(specContent);
            }
        }
        catch (err) {
            throw new errors_js_1.ValidationError(`Failed to parse specification: ${err.message}`);
        }
        // Save as contract baseline
        const contract = await client_js_1.default.apiContract.create({
            data: {
                endpointId,
                spec: typeof parsedSpec === 'string' ? parsedSpec : JSON.stringify(parsedSpec, null, 2),
                specType: specType === 'OPENAPI' ? 'OPENAPI' : 'JSON_SCHEMA',
                version: `spec-${Date.now()}`,
                isBaseline: true,
            },
        });
        // Also update endpoint's expectedSchema if json schema or openapi component schema
        await client_js_1.default.endpoint.update({
            where: { id: endpointId },
            data: {
                expectedSchema: typeof parsedSpec === 'string' ? parsedSpec : JSON.stringify(parsedSpec),
            },
        });
        res.status(201).json({ success: true, data: contract, message: 'Contract uploaded and set as baseline' });
    }),
    getContractChanges: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const { endpointId } = req.params;
        const endpoint = await client_js_1.default.endpoint.findUnique({
            where: { id: endpointId },
            include: { project: { select: { userId: true } } },
        });
        if (!endpoint)
            throw new errors_js_1.NotFoundError('Endpoint');
        if (endpoint.project.userId !== req.user.id)
            throw new errors_js_1.ForbiddenError('Access denied');
        const changes = await client_js_1.default.contractChange.findMany({
            where: { contract: { endpointId } },
            orderBy: { detectedAt: 'desc' },
            include: { contract: true },
            take: 50,
        });
        res.json({ success: true, data: changes });
    }),
};
//# sourceMappingURL=contract.controller.js.map