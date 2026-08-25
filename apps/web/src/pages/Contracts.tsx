import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  FileCode2,
  UploadCloud,
  AlertTriangle,
  CheckCircle2,
  FileJson,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Contracts: React.FC = () => {
  const queryClient = useQueryClient();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedEndpointId, setSelectedEndpointId] = useState('');
  const [specContent, setSpecContent] = useState('');
  const [specType, setSpecType] = useState('OPENAPI');
  const [error, setError] = useState<string | null>(null);

  // Fetch Projects to get endpoints
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get('/projects');
      return data.data;
    },
  });

  const firstProjectId = projects?.[0]?.id;

  const { data: endpoints } = useQuery({
    queryKey: ['endpoints', firstProjectId],
    queryFn: async () => {
      if (!firstProjectId) return [];
      const { data } = await api.get(`/projects/${firstProjectId}/endpoints`);
      return data.data;
    },
    enabled: !!firstProjectId,
  });

  // Mock contract changes list for global feed
  const contractFeed = [
    {
      id: 'cc_1',
      endpoint: 'GET /get (Get User Profile)',
      field: 'id',
      changeType: 'TYPE_CHANGED',
      previousValue: 'integer',
      currentValue: 'string',
      severity: 'HIGH',
      risk: 'Potential breaking change for downstream typed SDK clients.',
      detectedAt: '2 hours ago',
    },
    {
      id: 'cc_2',
      endpoint: 'GET /get (Get User Profile)',
      field: 'role',
      changeType: 'FIELD_REMOVED',
      previousValue: 'string',
      currentValue: 'null',
      severity: 'HIGH',
      risk: 'Breaking change: field removed from response schema.',
      detectedAt: '2 hours ago',
    },
    {
      id: 'cc_3',
      endpoint: 'POST /status/500 (Process Order Payment)',
      field: 'currency',
      changeType: 'FIELD_ADDED',
      previousValue: 'null',
      currentValue: 'string',
      severity: 'LOW',
      risk: 'Non-breaking additive schema expansion.',
      detectedAt: '1 day ago',
    },
  ];

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/endpoints/${selectedEndpointId}/contracts`, {
        specContent,
        specType,
      });
      return data;
    },
    onSuccess: () => {
      setIsUploadOpen(false);
      setSpecContent('');
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to upload contract');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FileCode2 className="w-6 h-6 text-amber-400" />
            API Contract & Schema Drift
          </h1>
          <p className="text-sm text-slate-400">
            Detect removed fields, unexpected data types, and OpenAPI contract violations
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<UploadCloud className="w-4 h-4" />}
          onClick={() => {
            if (endpoints?.[0]?.id) setSelectedEndpointId(endpoints[0].id);
            setIsUploadOpen(true);
          }}
        >
          Import OpenAPI Spec
        </Button>
      </div>

      {/* Contract Drift Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card glow className="space-y-2">
          <span className="text-xs text-slate-400 font-medium">Active Baselines</span>
          <div className="text-2xl font-bold text-white font-mono">4 Schemas</div>
          <p className="text-xs text-slate-400">Continuous contract diffing enabled</p>
        </Card>

        <Card glow className="space-y-2">
          <span className="text-xs text-slate-400 font-medium">Breaking Drifts Detected</span>
          <div className="text-2xl font-bold text-rose-400 font-mono">2 Critical Changes</div>
          <p className="text-xs text-rose-300">Downstream client breakage risk</p>
        </Card>

        <Card glow className="space-y-2">
          <span className="text-xs text-slate-400 font-medium">Drift Check Frequency</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono">Every Execution</div>
          <p className="text-xs text-slate-400">Automated baseline diffing on 200 OK</p>
        </Card>
      </div>

      {/* Contract Drift Feed */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-white">Recent Contract Drift Events</h3>

        <div className="space-y-3">
          {contractFeed.map((item) => (
            <Card
              key={item.id}
              glow
              className={`border-l-4 ${
                item.severity === 'HIGH'
                  ? 'border-l-rose-500 bg-rose-950/15'
                  : 'border-l-cyan-500 bg-slate-900/60'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Badge variant={item.severity === 'HIGH' ? 'danger' : 'info'} size="sm">
                      {item.changeType}
                    </Badge>
                    <span className="font-mono text-sm font-bold text-white">
                      Field: <strong className="text-primary-300">`{item.field}`</strong>
                    </span>
                    <span className="text-xs text-slate-400 font-mono">({item.endpoint})</span>
                  </div>

                  <div className="text-xs text-slate-300 font-mono">
                    Previous: <span className="text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">{item.previousValue}</span> → Current: <span className="text-white font-bold bg-slate-800 px-1.5 py-0.5 rounded">{item.currentValue}</span>
                  </div>

                  <p className="text-xs text-rose-300 font-medium">
                    ⚠️ {item.risk}
                  </p>
                </div>

                <div className="text-xs text-slate-500 font-mono shrink-0">
                  {item.detectedAt}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Upload Contract Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Import OpenAPI / JSON Schema Baseline"
        description="Set the gold-standard specification baseline to diff all live traffic against"
        maxWidth="lg"
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            uploadMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Target Endpoint</label>
            <select
              value={selectedEndpointId}
              onChange={(e) => setSelectedEndpointId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-primary-500"
            >
              {endpoints?.map((ep: any) => (
                <option key={ep.id} value={ep.id}>
                  {ep.method} {ep.path} ({ep.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Spec Format</label>
            <select
              value={specType}
              onChange={(e) => setSpecType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
            >
              <option value="OPENAPI">OpenAPI 3.0 (YAML/JSON)</option>
              <option value="JSON_SCHEMA">JSON Schema</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Spec Content (YAML or JSON)
            </label>
            <textarea
              rows={8}
              required
              value={specContent}
              onChange={(e) => setSpecContent(e.target.value)}
              placeholder={`{\n  "type": "object",\n  "required": ["id", "name"],\n  "properties": {\n    "id": { "type": "integer" },\n    "name": { "type": "string" }\n  }\n}`}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsUploadOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={uploadMutation.isPending}>
              Set as Baseline
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
