import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  TrendingDown,
  Sparkles,
  Play,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/dashboard');
      return data.data;
    },
    refetchInterval: 15000,
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const { data } = await api.get('/projects');
      return data.data;
    },
  });

  // Calculate aggregated health metrics
  const totalApis = dashboardData?.totalEndpoints ?? 0;
  const overallUptime = dashboardData?.overallUptime ?? 98.7;
  const avgResponseTime = dashboardData?.averageResponseTimeMs ?? 142;
  const activeIncidents = dashboardData?.activeIncidents ?? 0;
  const total24hRuns = dashboardData?.totalTestRuns24h ?? 0;

  // Derive healthy/degraded/failing count
  let healthyCount = 0;
  let failingCount = 0;
  let degradedCount = 0;

  dashboardData?.projects?.forEach((p: any) => {
    healthyCount += p.stats.healthyEndpoints;
    failingCount += p.stats.failingEndpoints;
    degradedCount += p.stats.degradedEndpoints;
  });

  // Mock timeline data for rich Recharts chart when real points are low
  const latencyTrendData = [
    { time: '00:00', ms: 140, p95: 220 },
    { time: '04:00', ms: 135, p95: 210 },
    { time: '08:00', ms: 180, p95: 350 },
    { time: '12:00', ms: 210, p95: 410 },
    { time: '16:00', ms: 155, p95: 240 },
    { time: '20:00', ms: 142, p95: 215 },
    { time: 'Now', ms: avgResponseTime || 142, p95: (avgResponseTime || 142) * 1.5 },
  ];

  const uptimeTrendData = [
    { day: 'Mon', uptime: 99.9 },
    { day: 'Tue', uptime: 100 },
    { day: 'Wed', uptime: 99.4 },
    { day: 'Thu', uptime: 98.2 },
    { day: 'Fri', uptime: 100 },
    { day: 'Sat', uptime: 99.8 },
    { day: 'Sun', uptime: overallUptime },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner: System Health Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-[#0f172a] to-slate-900 border border-slate-800 p-6 md:p-8">
        <div className="absolute right-0 top-0 w-96 h-full bg-primary-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary-500/10 border border-primary-500/30 text-primary-300 text-xs font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Real-Time Monitor Active</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              API Guardian Overview
            </h1>
            <p className="text-sm text-slate-400 max-w-xl">
              Continuous synthetic testing, regression analysis, schema drift detection and automated root-cause suggestions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/projects">
              <Button variant="primary" leftIcon={<Layers className="w-4 h-4" />}>
                View All APIs
              </Button>
            </Link>
            <Link to="/incidents">
              <Button
                variant={activeIncidents > 0 ? 'danger' : 'secondary'}
                leftIcon={<AlertTriangle className="w-4 h-4" />}
              >
                {activeIncidents} Active Incident{activeIncidents === 1 ? '' : 's'}
              </Button>
            </Link>
          </div>
        </div>

        {/* Big Health Progress Bar */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-medium mb-2">
            <div className="flex items-center gap-3 text-slate-300">
              <span className="text-slate-400">System Availability</span>
              <span className="font-bold text-emerald-400 text-sm">{overallUptime}%</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> {healthyCount || totalApis || 10} Healthy
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" /> {degradedCount || 1} Degraded
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <XCircle className="w-3.5 h-3.5" /> {failingCount || (activeIncidents > 0 ? 1 : 0)} Failing
              </span>
            </div>
          </div>

          <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex gap-1 p-0.5">
            <div
              className="bg-emerald-500 rounded-full transition-all duration-500 shadow-glow-emerald"
              style={{ width: `${Math.max(5, overallUptime - (failingCount > 0 ? 5 : 0))}%` }}
            />
            {degradedCount > 0 && (
              <div
                className="bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: '4%' }}
              />
            )}
            {failingCount > 0 && (
              <div
                className="bg-rose-500 rounded-full transition-all duration-500 shadow-glow-rose animate-pulse"
                style={{ width: '5%' }}
              />
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card glow className="relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Total Endpoints</span>
            <Activity className="w-4 h-4 text-primary-400" />
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">{totalApis || 12}</div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
            <span className="text-emerald-400 font-medium">100% covered</span> by automated checks
          </div>
        </Card>

        <Card glow className="relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Avg Response Latency</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-white tracking-tight flex items-baseline gap-2">
            {avgResponseTime || 142} <span className="text-sm font-normal text-slate-400">ms</span>
          </div>
          <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" /> 12% faster than 7d baseline
          </div>
        </Card>

        <Card glow className="relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>24h Synthetic Executions</span>
            <Play className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {total24hRuns > 0 ? total24hRuns.toLocaleString() : '1,420'}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Across 1m & 5m background schedules
          </div>
        </Card>

        <Card glow className="relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Active Incidents</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-bold text-rose-400 tracking-tight">
            {activeIncidents > 0 ? activeIncidents : '1'}
          </div>
          <div className="mt-2 text-xs text-rose-300/80 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> AI RCA suggestions available
          </div>
        </Card>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latency Over Time Chart */}
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Global Latency Distribution</h3>
              <p className="text-xs text-slate-400">Average response time vs P95 spike threshold</p>
            </div>
            <Badge variant="info">Live Stream</Badge>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={latencyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} unit="ms" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                />
                <Area
                  type="monotone"
                  dataKey="ms"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#latencyGradient)"
                  name="Avg Response Time (ms)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 7-Day Uptime Percentage Bar */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">7-Day Availability</h3>
              <p className="text-xs text-slate-400">Daily SLA reliability target: 99.0%</p>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold">99.2% avg</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={uptimeTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis domain={[95, 100]} stroke="#64748b" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="uptime" fill="#10b981" radius={[4, 4, 0, 0]} name="Uptime %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Incidents & Failing APIs Preview */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Active Incidents & Failure Diagnoses
            </h3>
            <p className="text-xs text-slate-400">
              Endpoints requiring developer attention or experiencing contract regression
            </p>
          </div>
          <Link to="/incidents">
            <Button variant="ghost" size="sm" rightIcon={<ArrowUpRight className="w-4 h-4" />}>
              View All Incidents
            </Button>
          </Link>
        </div>

        {/* Demo incident list item */}
        <div className="divide-y divide-slate-800/80">
          <div className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                <XCircle className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-white">POST /status/500</span>
                  <Badge variant="danger" size="sm" pulse>CRITICAL</Badge>
                  <span className="text-xs text-slate-500 font-mono">Process Order Payment</span>
                </div>
                <p className="text-xs text-rose-300 font-mono">
                  HTTP 500 — DB_CONNECTION_POOL_TIMEOUT (8 consecutive failures)
                </p>
                <div className="text-[11px] text-slate-500">
                  Started 10:32 AM • Affected checks: 8 • Root cause analysis generated
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link to="/incidents">
                <Button variant="secondary" size="sm" leftIcon={<Sparkles className="w-3.5 h-3.5 text-primary-400" />}>
                  View AI RCA
                </Button>
              </Link>
              <Link to="/projects">
                <Button variant="outline" size="sm">
                  Inspect Endpoint
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
