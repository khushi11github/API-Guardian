import crypto from 'crypto';
import nodemailer from 'nodemailer';
import prisma from '../prisma/client.js';
import { logger } from '../lib/logger.js';

interface IncidentPayload {
  incidentId: string;
  endpointId: string;
  endpointName: string;
  method: string;
  path: string;
  statusCode: number | null;
  failureCount: number;
  severity: string;
  startedAt: string;
  errorMessage: string | null;
}

interface RecoveryPayload {
  incidentId: string;
  endpointId: string;
  endpointName: string;
  method: string;
  path: string;
  resolvedAt: string;
}

// ─── Email ────────────────────────────────────────────────────
function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function sendEmail(to: string[], subject: string, html: string): Promise<void> {
  const transporter = createTransport();
  if (!transporter) {
    logger.info('[NOTIFICATION] Email not configured. Would have sent:', { to, subject });
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
function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

async function sendWebhook(
  url: string,
  event: string,
  payload: Record<string, unknown>,
  secret?: string | null,
): Promise<void> {
  const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
  const headers: Record<string, string> = {
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
      logger.warn(`Webhook delivery failed: ${res.status} ${url}`);
    } else {
      logger.info(`Webhook delivered: ${event} → ${url}`);
    }
  } catch (err) {
    logger.error(`Webhook error: ${(err as Error).message}`, { url, event });
  }
}

// ─── Main service ─────────────────────────────────────────────
export class NotificationService {
  async notifyIncident(
    projectId: string,
    incidentId: string,
    payload: IncidentPayload,
  ): Promise<void> {
    const [notifications, webhooks] = await Promise.all([
      prisma.notification.findMany({
        where: { projectId, enabled: true },
      }),
      prisma.webhook.findMany({
        where: { projectId, enabled: true },
      }),
    ]);

    const emailBody = this.buildIncidentEmail(payload);

    for (const notif of notifications) {
      if (notif.type === 'EMAIL') {
        const config = notif.config as { to: string[] };
        await sendEmail(config.to, `🚨 API Guardian Alert: ${payload.method} ${payload.path}`, emailBody);
      }
    }

    for (const webhook of webhooks) {
      const events = webhook.events as string[];
      if (events.includes('incident.created') || events.includes('*')) {
        await sendWebhook(webhook.url, 'incident.created', payload as unknown as Record<string, unknown>, webhook.secret);
      }
    }
  }

  async notifyRecovery(projectId: string, payload: RecoveryPayload): Promise<void> {
    const [notifications, webhooks] = await Promise.all([
      prisma.notification.findMany({
        where: { projectId, enabled: true },
      }),
      prisma.webhook.findMany({
        where: { projectId, enabled: true },
      }),
    ]);

    const emailBody = this.buildRecoveryEmail(payload);

    for (const notif of notifications) {
      if (notif.type === 'EMAIL') {
        const config = notif.config as { to: string[] };
        await sendEmail(config.to, `✅ API Guardian: ${payload.method} ${payload.path} Recovered`, emailBody);
      }
    }

    for (const webhook of webhooks) {
      const events = webhook.events as string[];
      if (events.includes('incident.resolved') || events.includes('*')) {
        await sendWebhook(webhook.url, 'incident.resolved', payload as unknown as Record<string, unknown>, webhook.secret);
      }
    }
  }

  async notifyContractChange(
    projectId: string,
    payload: {
      endpointId: string;
      endpointName: string;
      changes: Array<{ field: string; changeType: string; previousValue: string | null; currentValue: string | null }>;
    },
  ): Promise<void> {
    const webhooks = await prisma.webhook.findMany({
      where: { projectId, enabled: true },
    });
    for (const webhook of webhooks) {
      const events = webhook.events as string[];
      if (events.includes('contract.changed') || events.includes('*')) {
        await sendWebhook(webhook.url, 'contract.changed', payload as unknown as Record<string, unknown>, webhook.secret);
      }
    }
  }

  private buildIncidentEmail(p: IncidentPayload): string {
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

  private buildRecoveryEmail(p: RecoveryPayload): string {
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

export const notificationService = new NotificationService();
