import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Bell,
  Sparkles,
  Lock,
  Key,
  Webhook,
  Mail,
  CheckCircle2,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const [webhookUrl, setWebhookUrl] = useState('https://webhook.site/api-guardian-demo-events');
  const [webhookSecret, setWebhookSecret] = useState('whsec_demo_secret_key_84920491');
  const [emailAlerts, setEmailAlerts] = useState('devops@example.com, oncall@example.com');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <SettingsIcon className="w-6 h-6 text-slate-400" />
          Settings & Integrations
        </h1>
        <p className="text-sm text-slate-400">
          Manage alert channels, AI diagnosis provider, and security parameters
        </p>
      </div>

      {isSaved && (
        <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Configuration saved successfully</span>
        </div>
      )}

      {/* 1. Profile & Account */}
      <Card className="space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary-400" /> Developer Profile
        </h3>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                defaultValue={user?.name || 'Alex Rivera'}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Work Email</label>
              <input
                type="email"
                disabled
                defaultValue={user?.email || 'demo@apiguardian.dev'}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 cursor-not-allowed font-mono"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" variant="primary" size="sm">
              Update Profile
            </Button>
          </div>
        </form>
      </Card>

      {/* 2. Webhooks & Alerts */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Webhook className="w-4 h-4 text-cyan-400" /> Webhook Alert Integrations
          </h3>
          <Badge variant="success" size="sm">Active</Badge>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Webhook Endpoint URL</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-primary-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Events dispatched: <code>incident.created</code>, <code>incident.resolved</code>, <code>contract.changed</code>
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">HMAC SHA-256 Signing Secret</label>
            <input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Alert Recipients (comma-separated)</label>
            <input
              type="text"
              value={emailAlerts}
              onChange={(e) => setEmailAlerts(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>
      </Card>

      {/* 3. AI Diagnostics Provider Configuration */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-400" /> AI Root-Cause Engine Provider
          </h3>
          <Badge variant="purple" size="sm">Provider Abstraction Active</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-primary-950/30 border border-primary-500/40 space-y-1.5">
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Built-in Mock AI</span>
              <span className="text-[10px] text-emerald-400 font-mono">DEFAULT</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Fast, zero-API-key realistic heuristics for offline testing & demos.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 opacity-90">
            <div className="font-semibold text-white flex items-center justify-between">
              <span>OpenAI GPT-4o</span>
              <span className="text-[10px] text-slate-500 font-mono">ENV KEY</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Set <code>OPENAI_API_KEY</code> to enable GPT-4o root cause synthesis.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 opacity-90">
            <div className="font-semibold text-white flex items-center justify-between">
              <span>Anthropic Claude 3.5</span>
              <span className="text-[10px] text-slate-500 font-mono">ENV KEY</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Set <code>ANTHROPIC_API_KEY</code> for Claude Sonnet diagnostic reports.
            </p>
          </div>
        </div>
      </Card>

      {/* 4. Security & SSRF Protection Status */}
      <Card className="space-y-4 border-emerald-500/20 bg-emerald-950/10">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Security & SSRF Protection Status
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Private CIDRs (10.x, 172.16-31.x, 192.168.x) blocked</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Loopback & metadata addresses (169.254.x.x) blocked</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>DNS Resolution & Rebinding validation active</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Argon2id password hashing + JWT token rotation</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
