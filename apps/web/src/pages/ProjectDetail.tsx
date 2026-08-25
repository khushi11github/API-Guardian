import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  FolderGit2,
  Plus,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Radio,
  ArrowRight,
  Globe,
  Settings,
  Bell,
  Code2,
  Trash2,
  Sparkles,
} from 'lucide-react';

export const ProjectDetail: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [isAddEndpointOpen, setIsAddEndpointOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'endpoints' | 'alerts' | 'analytics'>('endpoints');

  // Form states for new endpoint
  const [name, setName] = useState('');
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>('GET');
  const [path, setPath] = useState('/');
  const [description, setDescription] = useState('');
  const [expectedStatusCode, setExpectedStatusCode] = useState(200);
  const [schedule, setSchedule] = useState('EVERY_5_MIN');
  const [timeoutMs, setTimeoutMs] = useState(5000);
  const [body, setBody] = useState('');
  const [authType, setAuthType] = useState('NONE');
  const [authConfig, setAuthConfig] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch Project
  const { data: project, isLoading: isProjectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${projectId}`);
      return data.data;
    },
    enabled: !!projectId,
  });

  // Fetch Endpoints
  const { data: endpoints, isLoading: isEndpointsLoading } = useQuery({
    queryKey: ['endpoints', projectId],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${projectId}/endpoints`);
      return data.data;
    },
    enabled: !!projectId,
    refetchInterval: 10000,
  });

  // Fetch Project Stats
  const { data: stats } = useQuery({
    queryKey: ['project-stats', projectId],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${projectId}/analytics`);
      return data.data;
    },
    enabled: !!projectId,
  });

  // Add Endpoint Mutation
  const addEndpointMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/projects/${projectId}/endpoints`, {
        name,
        method,
        path,
        description,
        expectedStatusCode,
        schedule,
        timeoutMs,
        body: body ? body : null,
        authType,
        authConfig: authConfig ? authConfig : null,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints', projectId] });
      setIsAddEndpointOpen(false);
      setName('');
      setPath('/');
      setBody('');
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to create endpoint');
    },
  });

  // Manual Test Trigger Mutation
  const triggerTestMutation = useMutation({
    mutationFn: async (endpointId: string) => {
      const { data } = await api.post(`/endpoints/${endpointId}/test`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-stats', projectId] });
    },
  });

  // Delete Endpoint Mutation
  const deleteEndpointMutation = useMutation({
    mutationFn: async (endpointId: string) => {
      await api.delete(`/endpoints/${endpointId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints', projectId] });
    },
  });

  const methodColors: Record<string, string> = {
    GET: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    POST: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    PUT: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    PATCH: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    DELETE: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  };

  return (
    <div className="space-y-6">
      {/* Project Header Card */}
      <div className="bg-[#0f172a]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Link to="/projects" className="text-slate-400 hover:text-slate-200 text-xs">
                Projects
              </Link>
              <span className="text-slate-600">/</span>
              <h1 className="text-xl font-bold text-white tracking-tight">{project?.name}</h1>
              <Badge variant={project?.environment === 'PRODUCTION' ? 'danger' : 'info'} size="sm">
                {project?.environment}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>{project?.baseUrl}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsAddEndpointOpen(true)}
            >
              Add Endpoint
            </Button>
          </div>
        </div>

        {/* Quick project stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80 text-xs">
          <div>
            <div className="text-slate-500">Monitored Endpoints</div>
            <div className="text-lg font-bold text-white mt-0.5">{endpoints?.length || 0}</div>
          </div>
          <div>
            <div className="text-slate-500">Uptime (24h)</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">{stats?.uptimePercentage ?? 99.4}%</div>
          </div>
          <div>
            <div className="text-slate-500">Avg Latency</div>
            <div className="text-lg font-bold text-slate-200 mt-0.5">{stats?.averageResponseTimeMs ?? 142} ms</div>
          </div>
          <div>
            <div className="text-slate-500">Active Incidents</div>
            <div className="text-lg font-bold text-rose-400 mt-0.5">{stats?.activeIncidents ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('endpoints')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'endpoints'
              ? 'bg-primary-600/15 text-primary-400 border border-primary-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Endpoints ({endpoints?.length || 0})
        </button>
      </div>

      {/* Endpoints Table / Cards */}
      {isEndpointsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-20 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : endpoints?.length === 0 ? (
        <Card className="text-center py-12 space-y-3">
          <Code2 className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-white">No endpoints configured yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Define HTTP methods, paths, schedules, and assertions to start monitoring.
          </p>
          <Button variant="primary" size="sm" onClick={() => setIsAddEndpointOpen(true)}>
            Add Endpoint
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {endpoints?.map((ep: any) => (
            <Card
              key={ep.id}
              glow
              className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4"
            >
              <div className="flex items-start md:items-center gap-3 min-w-0">
                <span
                  className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md border shrink-0 ${
                    methodColors[ep.method] || 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {ep.method}
                </span>

                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/endpoints/${ep.id}`}
                      className="font-mono text-sm font-semibold text-white hover:text-primary-400 transition-colors truncate"
                    >
                      {ep.path}
                    </Link>
                    <span className="text-xs text-slate-400 truncate">({ep.name})</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                    <span>Expected: {ep.expectedStatusCode}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {ep.schedule.replace('EVERY_', '').replace('_', ' ').toLowerCase()}
                    </span>
                    <span>•</span>
                    <span>{ep.assertions?.length || 0} assertions</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Play className="w-3.5 h-3.5 text-emerald-400" />}
                  isLoading={triggerTestMutation.isPending && triggerTestMutation.variables === ep.id}
                  onClick={() => triggerTestMutation.mutate(ep.id)}
                >
                  Run Test
                </Button>

                <Link to={`/endpoints/${ep.id}`}>
                  <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                    Details & RCA
                  </Button>
                </Link>

                <button
                  onClick={() => {
                    if (confirm('Delete this endpoint?')) deleteEndpointMutation.mutate(ep.id);
                  }}
                  className="text-slate-500 hover:text-rose-400 p-2 rounded-lg hover:bg-slate-800 transition-colors"
                  title="Delete endpoint"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Endpoint Modal */}
      <Modal
        isOpen={isAddEndpointOpen}
        onClose={() => setIsAddEndpointOpen(false)}
        title="Add Monitored Endpoint"
        description="Configure HTTP method, route path, test schedule, and assertions"
        maxWidth="xl"
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addEndpointMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">HTTP Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-primary-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Route Path</label>
              <input
                type="text"
                required
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/api/v1/resource"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Endpoint Name / Label</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Get User Profile"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Expected Status</label>
              <input
                type="number"
                required
                value={expectedStatusCode}
                onChange={(e) => setExpectedStatusCode(parseInt(e.target.value, 10))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Schedule Frequency</label>
              <select
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
              >
                <option value="MANUAL">Manual Only</option>
                <option value="EVERY_1_MIN">Every 1 min</option>
                <option value="EVERY_5_MIN">Every 5 min</option>
                <option value="EVERY_15_MIN">Every 15 min</option>
                <option value="EVERY_30_MIN">Every 30 min</option>
                <option value="EVERY_1_HOUR">Every 1 hour</option>
                <option value="DAILY">Daily</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Timeout (ms)</label>
              <input
                type="number"
                step={500}
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(parseInt(e.target.value, 10))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          {['POST', 'PUT', 'PATCH'].includes(method) && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">JSON Request Body</label>
              <textarea
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder='{ "key": "value" }'
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsAddEndpointOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={addEndpointMutation.isPending}>
              Create & Monitor
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
