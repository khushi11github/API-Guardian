import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  Play,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Code2,
  Check,
  Plus,
  Trash2,
  RefreshCw,
  FileJson,
  Layers,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const EndpointDetail: React.FC = () => {
  const { id: endpointId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'run' | 'ai' | 'assertions' | 'history' | 'contracts'>('run');
  const [isAddAssertionOpen, setIsAddAssertionOpen] = useState(false);

  // Assertion form
  const [assertionType, setAssertionType] = useState('STATUS_CODE');
  const [assertionField, setAssertionField] = useState('');
  const [assertionOperator, setAssertionOperator] = useState('EQUALS');
  const [assertionExpected, setAssertionExpected] = useState('200');

  // Fetch Endpoint details
  const { data: endpoint, isLoading: isEndpointLoading } = useQuery({
    queryKey: ['endpoint', endpointId],
    queryFn: async () => {
      const { data } = await api.get(`/endpoints/${endpointId}`);
      return data.data;
    },
    enabled: !!endpointId,
  });

  // Fetch Results History
  const { data: resultsData, isLoading: isResultsLoading } = useQuery({
    queryKey: ['endpoint-results', endpointId],
    queryFn: async () => {
      const { data } = await api.get(`/endpoints/${endpointId}/results?pageSize=20`);
      return data.data;
    },
    enabled: !!endpointId,
    refetchInterval: 10000,
  });

  // Fetch Response Time Trend
  const { data: responseTimeData } = useQuery({
    queryKey: ['endpoint-response-time', endpointId],
    queryFn: async () => {
      const { data } = await api.get(`/endpoints/${endpointId}/analytics/response-time`);
      return data.data;
    },
    enabled: !!endpointId,
  });

  // Fetch Contract Changes
  const { data: contractChanges } = useQuery({
    queryKey: ['endpoint-contracts', endpointId],
    queryFn: async () => {
      const { data } = await api.get(`/endpoints/${endpointId}/contracts/changes`);
      return data.data;
    },
    enabled: !!endpointId,
  });

  const latestRun = resultsData?.data?.[0];

  // AI Root Cause Analysis Query & Mutation
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const triggerAiAnalysis = async (runId: string) => {
    setIsAiLoading(true);
    setActiveTab('ai');
    try {
      const { data } = await api.post(`/incidents/test-runs/${runId}/analyze`);
      setAiAnalysis(data.data);
    } catch (err) {
      console.error('AI RCA failed', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Run Test Mutation
  const runTestMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/endpoints/${endpointId}/test`);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['endpoint-results', endpointId] });
      queryClient.invalidateQueries({ queryKey: ['endpoint-response-time', endpointId] });
      // If failed, auto-trigger AI analysis
      if (data.data?.status !== 'PASSED') {
        triggerAiAnalysis(data.data.id);
      }
    },
  });

  // Add Assertion Mutation
  const addAssertionMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/endpoints/${endpointId}/assertions`, {
        type: assertionType,
        field: assertionField || undefined,
        operator: assertionOperator,
        expected: assertionExpected,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoint', endpointId] });
      setIsAddAssertionOpen(false);
      setAssertionField('');
    },
  });

  // Delete Assertion Mutation
  const deleteAssertionMutation = useMutation({
    mutationFn: async (assertionId: string) => {
      await api.delete(`/endpoints/${endpointId}/assertions/${assertionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoint', endpointId] });
    },
  });

  const isPassing = latestRun?.status === 'PASSED';
  const fullUrl = endpoint ? `${endpoint.project?.baseUrl || ''}${endpoint.path}` : '';

  // Format chart data
  const chartData = responseTimeData?.map((pt: any) => ({
    time: new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ms: pt.value,
    status: pt.status,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#0f172a]/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Link to="/projects" className="hover:text-white">Projects</Link>
              <span>/</span>
              <span className="text-slate-200">{endpoint?.project?.name || 'Project'}</span>
              <span>/</span>
              <span className="text-slate-400 font-mono">{endpoint?.name}</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-primary-600/20 text-primary-300 border border-primary-500/30">
                {endpoint?.method}
              </span>
              <h1 className="text-xl font-bold font-mono text-white tracking-tight break-all">
                {fullUrl}
              </h1>
              <Badge variant={isPassing ? 'success' : latestRun ? 'danger' : 'neutral'} pulse={!isPassing && !!latestRun}>
                {latestRun?.status || 'NOT RUN YET'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {latestRun && latestRun.status !== 'PASSED' && (
              <Button
                variant="gradient"
                size="md"
                leftIcon={<Sparkles className="w-4 h-4" />}
                isLoading={isAiLoading}
                onClick={() => triggerAiAnalysis(latestRun.id)}
              >
                Analyze with AI
              </Button>
            )}

            <Button
              variant="primary"
              size="md"
              leftIcon={<Play className="w-4 h-4 text-emerald-400" />}
              isLoading={runTestMutation.isPending}
              onClick={() => runTestMutation.mutate()}
            >
              Run Test Now
            </Button>
          </div>
        </div>

        {/* Quick summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-500">Latest Status Code</span>
            <div className={`text-lg font-mono font-bold mt-0.5 ${latestRun?.statusCode === 200 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {latestRun?.statusCode ?? '—'}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Latest Response Time</span>
            <div className="text-lg font-mono font-bold text-slate-200 mt-0.5">
              {latestRun?.responseTimeMs ? `${latestRun.responseTimeMs} ms` : '—'}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Schedule</span>
            <div className="text-lg font-bold text-white mt-0.5">
              {endpoint?.schedule?.replace('EVERY_', '').replace('_', ' ').toLowerCase() || 'Manual'}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Assertions Configured</span>
            <div className="text-lg font-bold text-primary-400 mt-0.5">
              {endpoint?.assertions?.length || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Latency History Chart */}
      {chartData.length > 0 && (
        <Card className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-white">
            <span>Response Latency Trend (ms)</span>
            <span className="text-slate-400 font-normal font-mono">Last 20 executions</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="epGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} unit="ms" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="ms" stroke="#06b6d4" strokeWidth={2} fill="url(#epGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('run')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'run' ? 'bg-primary-600/15 text-primary-400 border border-primary-500/30' : 'text-slate-400 hover:text-white'
          }`}
        >
          Latest Response
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
            activeTab === 'ai' ? 'bg-primary-600/15 text-primary-400 border border-primary-500/30 shadow-glow-primary' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-primary-400" />
          AI Root Cause
        </button>

        <button
          onClick={() => setActiveTab('assertions')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'assertions' ? 'bg-primary-600/15 text-primary-400 border border-primary-500/30' : 'text-slate-400 hover:text-white'
          }`}
        >
          Assertions ({endpoint?.assertions?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'history' ? 'bg-primary-600/15 text-primary-400 border border-primary-500/30' : 'text-slate-400 hover:text-white'
          }`}
        >
          Execution History
        </button>

        <button
          onClick={() => setActiveTab('contracts')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'contracts' ? 'bg-primary-600/15 text-primary-400 border border-primary-500/30' : 'text-slate-400 hover:text-white'
          }`}
        >
          Schema Drift
        </button>
      </div>

      {/* Tab 1: Latest Test Run Inspector */}
      {activeTab === 'run' && (
        <div className="space-y-4">
          {!latestRun ? (
            <Card className="text-center py-10 text-slate-400 text-sm">
              No test run recorded yet. Click "Run Test Now" above to execute.
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column: Assertion status & errors */}
              <div className="space-y-4">
                <Card className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                    Assertion Results
                  </h3>
                  <div className="space-y-2">
                    {(latestRun.assertionResults as any[])?.map((res, i) => (
                      <div
                        key={i}
                        className={`p-2.5 rounded-lg border text-xs font-mono flex items-start gap-2 ${
                          res.passed
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        {res.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div>{res.message}</div>
                          {!res.passed && (
                            <div className="text-[11px] text-slate-400 mt-1">
                              Expected: {res.expected} | Actual: {res.actual}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {latestRun.errorMessage && (
                  <Card className="bg-rose-950/30 border-rose-500/40 space-y-2">
                    <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold font-mono">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Failure Diagnostic</span>
                    </div>
                    <p className="text-xs text-rose-200 font-mono break-all">{latestRun.errorMessage}</p>
                  </Card>
                )}
              </div>

              {/* Right column: Response Body Viewer */}
              <Card className="lg:col-span-2 space-y-3 font-mono">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5">
                    <FileJson className="w-3.5 h-3.5 text-primary-400" /> Response Body
                  </span>
                  <span>HTTP {latestRun.statusCode}</span>
                </div>

                <div className="bg-slate-950/80 p-4 rounded-lg overflow-x-auto max-h-96 text-xs text-slate-300">
                  {latestRun.responseBody ? (
                    <pre className="font-mono">{JSON.stringify(JSON.parse(latestRun.responseBody), null, 2)}</pre>
                  ) : (
                    <span className="text-slate-600 italic">No response body returned</span>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: AI Root Cause Analysis Panel */}
      {activeTab === 'ai' && (
        <Card glow className="space-y-6 border-primary-500/30 bg-gradient-to-b from-[#0f172a] to-slate-900/90">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-600/20 border border-primary-500/40 flex items-center justify-center text-primary-400 shadow-glow-primary">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">AI Root Cause Analysis</h3>
                <p className="text-xs text-slate-400">
                  Structured diagnostic reasoning generated by {aiAnalysis?.provider || 'API Guardian AI Engine'}
                </p>
              </div>
            </div>

            {latestRun && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                isLoading={isAiLoading}
                onClick={() => triggerAiAnalysis(latestRun.id)}
              >
                Re-Analyze Failure
              </Button>
            )}
          </div>

          {isAiLoading ? (
            <div className="py-12 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-primary-400 animate-spin mx-auto" />
              <div className="text-sm font-semibold text-white">Analyzing failure telemetry...</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Comparing headers, status code, latency spikes, and historical regressions.
              </p>
            </div>
          ) : !aiAnalysis ? (
            <div className="py-10 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-sm text-slate-300 font-semibold">No AI analysis generated for this run yet</div>
              <p className="text-xs text-slate-500">
                Click "Re-Analyze Failure" or run a test to trigger real-time AI root-cause synthesis.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary & Probable Cause */}
              <div className="p-4 rounded-xl bg-primary-950/40 border border-primary-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary-300">
                    Probable Root Cause
                  </span>
                  <Badge variant="purple" size="sm">
                    {Math.round(aiAnalysis.confidence * 100)}% Confidence
                  </Badge>
                </div>
                <div className="text-sm font-semibold text-white">{aiAnalysis.summary}</div>
                <p className="text-xs text-slate-300 leading-relaxed">{aiAnalysis.probableCause}</p>
              </div>

              {/* Evidence & Suggested Actions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Evidence */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 uppercase font-mono">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Evidence & Indicators
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {aiAnalysis.evidence?.map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-cyan-400 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Suggested Fix Actions */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 uppercase font-mono">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" /> Recommended Action Items
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {aiAnalysis.suggestedActions?.map((act: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 italic text-center">
                Note: AI-generated conclusions are diagnostic suggestions based on telemetry patterns, not verified facts.
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: Assertions Builder */}
      {activeTab === 'assertions' && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Configured Assertions</h3>
              <p className="text-xs text-slate-400">Validate status code, latency, headers, JSON paths, and schemas</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsAddAssertionOpen(true)}
            >
              Add Assertion
            </Button>
          </div>

          <div className="space-y-2">
            {endpoint?.assertions?.map((ass: any) => (
              <div
                key={ass.id}
                className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 text-xs font-mono"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="info" size="sm">{ass.type}</Badge>
                  {ass.field && <span className="text-primary-300">{ass.field}</span>}
                  <span className="text-slate-400">{ass.operator.toLowerCase()}</span>
                  <span className="text-white font-bold bg-slate-800 px-2 py-0.5 rounded">{ass.expected}</span>
                </div>

                <button
                  onClick={() => deleteAssertionMutation.mutate(ass.id)}
                  className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 4: Execution History */}
      {activeTab === 'history' && (
        <Card className="space-y-4">
          <h3 className="text-sm font-semibold text-white">Historical Test Runs</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-slate-800 text-slate-500">
                <tr>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Status Code</th>
                  <th className="py-2 px-3">Response Time</th>
                  <th className="py-2 px-3">Trigger</th>
                  <th className="py-2 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {resultsData?.data?.map((run: any) => (
                  <tr key={run.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3">
                      <Badge variant={run.status === 'PASSED' ? 'success' : 'danger'} size="sm">
                        {run.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">{run.statusCode ?? '—'}</td>
                    <td className="py-2.5 px-3 text-slate-200">{run.responseTimeMs} ms</td>
                    <td className="py-2.5 px-3 text-slate-400">{run.triggeredBy}</td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {new Date(run.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 5: Schema Drift / Contract Changes */}
      {activeTab === 'contracts' && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">API Contract & Schema Changes</h3>
              <p className="text-xs text-slate-400">
                Automated detection of removed fields, renamed properties, and type shifts
              </p>
            </div>
            <Link to="/contracts">
              <Button variant="outline" size="sm">View Global Drift</Button>
            </Link>
          </div>

          {contractChanges?.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No schema changes detected. Response structures are stable against baseline.
            </div>
          ) : (
            <div className="space-y-2">
              {contractChanges?.map((ch: any) => (
                <div key={ch.id} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs font-mono">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="warning" size="sm">{ch.changeType}</Badge>
                      <span className="font-bold text-white">{ch.field}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Previous: <span className="text-slate-300">{ch.previousValue || 'none'}</span> → Current: <span className="text-slate-300">{ch.currentValue || 'none'}</span>
                    </div>
                  </div>
                  <Badge variant="danger" size="sm">{ch.severity}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Add Assertion Modal */}
      <Modal
        isOpen={isAddAssertionOpen}
        onClose={() => setIsAddAssertionOpen(false)}
        title="Add Test Assertion"
        description="Define rule condition to validate against the HTTP response"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addAssertionMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Assertion Type</label>
            <select
              value={assertionType}
              onChange={(e) => setAssertionType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-primary-500"
            >
              <option value="STATUS_CODE">Status Code</option>
              <option value="RESPONSE_TIME">Response Time (ms)</option>
              <option value="JSON_FIELD">JSON Field Value</option>
              <option value="HEADER">HTTP Header</option>
              <option value="BODY_CONTAINS">Body Contains String</option>
            </select>
          </div>

          {['JSON_FIELD', 'HEADER'].includes(assertionType) && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Field / Header Path</label>
              <input
                type="text"
                required
                value={assertionField}
                onChange={(e) => setAssertionField(e.target.value)}
                placeholder="e.g. data.user.id or Content-Type"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-primary-500"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Operator</label>
              <select
                value={assertionOperator}
                onChange={(e) => setAssertionOperator(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-primary-500"
              >
                <option value="EQUALS">EQUALS</option>
                <option value="NOT_EQUALS">NOT EQUALS</option>
                <option value="LESS_THAN">LESS THAN</option>
                <option value="GREATER_THAN">GREATER THAN</option>
                <option value="CONTAINS">CONTAINS</option>
                <option value="EXISTS">EXISTS</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Expected Value</label>
              <input
                type="text"
                required
                value={assertionExpected}
                onChange={(e) => setAssertionExpected(e.target.value)}
                placeholder="200 or 800 or true"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsAddAssertionOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={addAssertionMutation.isPending}>
              Save Assertion
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
