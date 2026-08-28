"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.NotificationService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const client_js_1 = __importDefault(require("../prisma/client.js"));
const logger_js_1 = require("../lib/logger.js");
// ─── Email ────────────────────────────────────────────────────
function createTransport() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT ?? '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass)
        return null;
    return nodemailer_1.default.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
    });
}
async function sendEmail(to, subject, html) {
    const transporter = createTransport();
    if (!transporter) {
        logger_js_1.logger.info('[NOTIFICATION] Email not configured. Would have sent:', { to, subject });
        return;
    }
    await transporter.sendMail({
        from: process.env.SMTP_FROM ?? 'noreply@api-guardian.dev',
        to: to.join(', '),
        subject,
        html,
    });
}
// ─── Webhook ─────────────────────────────────────────────────
function signPayload(payload, secret) {
    return crypto_1.default.createHmac('sha256', secret).update(payload).digest('hex');
}
async function sendWebhook(url, event, payload, secret) {
    const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
    const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'API-Guardian-Webhook/1.0',
        'X-AG-Event': event,
    };
    if (secret) {
        headers['X-AG-Signature'] = `sha256=${signPayload(body, secret)}`;
    }
    try {
        const res = await fetch(url, { method: 'POST', headers, body });
        if (!res.ok) {
            logger_js_1.logger.warn(`Webhook delivery failed: ${res.status} ${url}`);
        }
        else {
            logger_js_1.logger.info(`Webhook delivered: ${event} → ${url}`);
        }
    }
    catch (err) {
        logger_js_1.logger.error(`Webhook error: ${err.message}`, { url, event });
    }
}
// ─── Main service ─────────────────────────────────────────────
class NotificationService {
    async notifyIncident(projectId, incidentId, payload) {
        const [notifications, webhooks] = await Promise.all([
            client_js_1.default.notification.findMany({
                where: { projectId, enabled: true },
            }),
            client_js_1.default.webhook.findMany({
                where: { projectId, enabled: true },
            }),
        ]);
        const emailBody = this.buildIncidentEmail(payload);
        for (const notif of notifications) {
            if (notif.type === 'EMAIL') {
                const config = notif.config;
                await sendEmail(config.to, `🚨 API Guardian Alert: ${payload.method} ${payload.path}`, emailBody);
            }
        }
        for (const webhook of webhooks) {
            const events = webhook.events;
            if (events.includes('incident.created') || events.includes('*')) {
                await sendWebhook(webhook.url, 'incident.created', payload, webhook.secret);
            }
        }
    }
    async notifyRecovery(projectId, payload) {
        const [notifications, webhooks] = await Promise.all([
            client_js_1.default.notification.findMany({
                where: { projectId, enabled: true },
            }),
            client_js_1.default.webhook.findMany({
                where: { projectId, enabled: true },
            }),
        ]);
        const emailBody = this.buildRecoveryEmail(payload);
        for (const notif of notifications) {
            if (notif.type === 'EMAIL') {
                const config = notif.config;
                await sendEmail(config.to, `✅ API Guardian: ${payload.method} ${payload.path} Recovered`, emailBody);
            }
        }
        for (const webhook of webhooks) {
            const events = webhook.events;
            if (events.includes('incident.resolved') || events.includes('*')) {
                await sendWebhook(webhook.url, 'incident.resolved', payload, webhook.secret);
            }
        }
    }
    async notifyContractChange(projectId, payload) {
        const webhooks = await client_js_1.default.webhook.findMany({
            where: { projectId, enabled: true },
        });
        for (const webhook of webhooks) {
            const events = webhook.events;
            if (events.includes('contract.changed') || events.includes('*')) {
                await sendWebhook(webhook.url, 'contract.changed', payload, webhook.secret);
            }
        }
    }
    buildIncidentEmail(p) {
        return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #ef4444; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">🚨 API Guardian Alert</h2>
        </div>
        <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280;">Endpoint</td><td style="font-weight: bold;">${p.method} ${p.path}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Status Code</td><td style="font-weight: bold; color: #ef4444;">${p.statusCode ?? 'N/A'}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Severity</td><td style="font-weight: bold;">${p.severity}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Failures</td><td style="font-weight: bold;">${p.failureCount} consecutive failures</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Started</td><td>${p.startedAt}</td></tr>
            ${p.errorMessage ? `<tr><td style="padding: 8px 0; color: #6b7280;">Error</td><td>${p.errorMessage}</td></tr>` : ''}
          </table>
        </div>
      </div>
    `;
    }
    buildRecoveryEmail(p) {
        return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #22c55e; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">✅ API Recovered</h2>
        </div>
        <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <p>${p.method} ${p.path} has recovered and is now responding normally.</p>
          <p style="color: #6b7280;">Resolved at: ${p.resolvedAt}</p>
        </div>
      </div>
    `;
    }
}
exports.NotificationService = NotificationService;
exports.notificationService = new NotificationService();
//# sourceMappingURL=notification.service.js.map