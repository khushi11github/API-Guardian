import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Incidents: React.FC = () => {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'INVESTIGATING' | 'RESOLVED'>('ALL');
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [aiRca, setAiRca] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Fetch Projects to get IDs for incident queries
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get('/projects');
      return data.data;
    },
  });

  const firstProjectId = projects?.[0]?.id;

  // Fetch Incidents
  const { data: incidents, isLoading } = useQuery({
    queryKey: ['incidents', firstProjectId, filterStatus],
    queryFn: async () => {
      if (!firstProjectId) return [];
      const url = filterStatus === 'ALL'
        ? `/projects/${firstProjectId}/incidents`
        : `/projects/${firstProjectId}/incidents?status=${filterStatus}`;
      const { data } = await api.get(url);
      return data.data;
    },
    enabled: !!firstProjectId,
    refetchInterval: 10000,
  });

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.put(`/incidents/${id}`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });

  // Run AI RCA
  const runAiRcaForIncident = async (incident: any) => {
    setSelectedIncident(incident);
    setIsAiLoading(true);
    try {
      // Find latest test run for this endpoint
      const { data: results } = await api.get(`/endpoints/${incident.endpointId}/results?pageSize=1`);
      const latestRun = results.data?.[0];
      if (latestRun) {
        const { data: aiRes } = await api.post(`/incidents/test-runs/${latestRun.id}/analyze`);
        setAiRca(aiRes.data);
      }
    } catch (err) {
      console.error('RCA failed', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const severityColors: Record<string, 'danger' | 'warning' | 'info' | 'purple'> = {
    CRITICAL: 'danger',
    HIGH: 'danger',
    MEDIUM: 'warning',
    LOW: 'info',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <AlertTriangle className="w-6 h-6 text-rose-400" />
            Reliability Incidents
          </h1>
          <p className="text-sm text-slate-400">
            Automatically created on repeated check failures with auto-resolution upon recovery
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
          {(['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filterStatus === st
                  ? 'bg-primary-600 text-white shadow-glow-primary'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Incidents List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : incidents?.length === 0 ? (
        <Card className="text-center py-16 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-base font-semibold text-white">All Systems Operational</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No active incidents matching status filter "{filterStatus}".
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {incidents?.map((incident: any) => (
            <Card
              key={incident.id}
              glow={incident.status !== 'RESOLVED'}
              className={`border-l-4 ${
                incident.status === 'RESOLVED'
                  ? 'border-l-emerald-500 bg-slate-900/40'
                  : incident.severity === 'CRITICAL'
                  ? 'border-l-rose-500 bg-rose-950/20'
                  : 'border-l-amber-500 bg-amber-950/20'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      #{incident.id.slice(0, 8)}
                    </span>
                    <Badge variant={severityColors[incident.severity] || 'warning'} size="sm" pulse={incident.status !== 'RESOLVED'}>
                      {incident.severity}
                    </Badge>
                    <Badge variant={incident.status === 'RESOLVED' ? 'success' : 'outline'} size="sm">
                      {incident.status}
                    </Badge>
                    <span className="font-mono text-xs font-bold text-primary-400 px-2 py-0.5 rounded bg-primary-950/60 border border-primary-500/30">
                      {incident.endpoint?.method} {incident.endpoint?.path}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-white">
                    {incident.title}
                  </h3>

                  <p className="text-xs text-slate-300 font-mono">
                    {incident.errorMessage || 'Consecutive assertion/timeout failure detected.'}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono">
                    <span>Started: {new Date(incident.startedAt).toLocaleTimeString()}</span>
                    <span>•</span>
                    <span>Failures: <strong>{incident.failureCount}</strong> consecutive checks</span>
                    {incident.resolvedAt && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-400">Resolved at: {new Date(incident.resolvedAt).toLocaleTimeString()}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                  <Button
                    variant="gradient"
                    size="sm"
                    leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                    onClick={() => runAiRcaForIncident(incident)}
                  >
                    AI Root Cause
                  </Button>

                  {incident.status !== 'RESOLVED' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ id: incident.id, status: 'RESOLVED' })}
                    >
                      Resolve
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ id: incident.id, status: 'OPEN' })}
                    >
                      Reopen
                    </Button>
                  )}

                  <Link to={`/endpoints/${incident.endpointId}`}>
                    <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Endpoint
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* AI RCA Modal */}
      <Modal
        isOpen={!!selectedIncident}
        onClose={() => {
          setSelectedIncident(null);
          setAiRca(null);
        }}
        title="AI Root Cause Analysis"
        description={`Diagnostic analysis for Incident #${selectedIncident?.id?.slice(0, 8)}`}
        maxWidth="xl"
      >
        {isAiLoading ? (
          <div className="py-12 text-center space-y-3">
            <Sparkles className="w-8 h-8 text-primary-400 animate-spin mx-auto" />
            <div className="text-sm font-semibold text-white">Synthesizing RCA diagnostics...</div>
          </div>
        ) : !aiRca ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No telemetry available to generate root cause analysis.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-primary-950/40 border border-primary-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary-300">
                  Probable Root Cause
                </span>
                <Badge variant="purple" size="sm">
                  {Math.round(aiRca.confidence * 100)}% Confidence
                </Badge>
              </div>
              <div className="text-sm font-semibold text-white">{aiRca.summary}</div>
              <p className="text-xs text-slate-300 leading-relaxed">{aiRca.probableCause}</p>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase font-mono">
                Suggested Actions
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {aiRca.suggestedActions?.map((act: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
