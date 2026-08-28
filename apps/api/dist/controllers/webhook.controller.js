"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookController = void 0;
const errors_js_1 = require("../lib/errors.js");
const client_js_1 = __importDefault(require("../prisma/client.js"));
const crypto_1 = __importDefault(require("crypto"));
exports.webhookController = {
    create: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const { projectId } = req.params;
        const { url, events, enabled } = req.body;
        // Verify project ownership
        const project = await client_js_1.default.project.findFirst({
            where: { id: projectId, userId: req.user.id },
        });
        if (!project) {
            res.status(403).json({ success: false, error: 'Access denied' });
            return;
        }
        const secret = crypto_1.default.randomBytes(32).toString('hex');
        const webhook = await client_js_1.default.webhook.create({
            data: {
                projectId,
                userId: req.user.id,
                url,
                secret,
                events: events ?? ['incident.created', 'incident.resolved'],
                enabled: enabled ?? true,
            },
        });
        res.status(201).json({ success: true, data: webhook });
    }),
    list: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const { projectId } = req.params;
        const project = await client_js_1.default.project.findFirst({
            where: { id: projectId, userId: req.user.id },
        });
        if (!project) {
            res.status(403).json({ success: false, error: 'Access denied' });
            return;
        }
        const webhooks = await client_js_1.default.webhook.findMany({ where: { projectId } });
        res.json({ success: true, data: webhooks });
    }),
    update: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const webhook = await client_js_1.default.webhook.findFirst({
            where: { id: req.params.id, userId: req.user.id },
        });
        if (!webhook) {
            res.status(404).json({ success: false, error: 'Webhook not found' });
            return;
        }
        const updated = await client_js_1.default.webhook.update({
            where: { id: req.params.id },
            data: {
                ...(req.body.url && { url: req.body.url }),
                ...(req.body.events && { events: req.body.events }),
                ...(req.body.enabled !== undefined && { enabled: req.body.enabled }),
            },
        });
        res.json({ success: true, data: updated });
    }),
    delete: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const webhook = await client_js_1.default.webhook.findFirst({
            where: { id: req.params.id, userId: req.user.id },
        });
        if (!webhook) {
            res.status(404).json({ success: false, error: 'Webhook not found' });
            return;
        }
        await client_js_1.default.webhook.delete({ where: { id: req.params.id } });
        res.json({ success: true, data: null });
    }),
    // Notification configs
    createNotification: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const { projectId } = req.params;
        const project = await client_js_1.default.project.findFirst({
            where: { id: projectId, userId: req.user.id },
        });
        if (!project) {
            res.status(403).json({ success: false, error: 'Access denied' });
            return;
        }
        const notification = await client_js_1.default.notification.create({
            data: {
                userId: req.user.id,
                projectId,
                type: req.body.type,
                config: req.body.config,
                enabled: req.body.enabled ?? true,
            },
        });
        res.status(201).json({ success: true, data: notification });
    }),
    listNotifications: (0, errors_js_1.asyncHandler)(async (req, res) => {
        const { projectId } = req.params;
        const project = await client_js_1.default.project.findFirst({
            where: { id: projectId, userId: req.user.id },
        });
        if (!project) {
            res.status(403).json({ success: false, error: 'Access denied' });
            return;
        }
        const notifications = await client_js_1.default.notification.findMany({ where: { projectId } });
        res.json({ success: true, data: notifications });
    }),
};
//# sourceMappingURL=webhook.controller.js.map