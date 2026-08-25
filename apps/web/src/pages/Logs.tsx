import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  ScrollText,
  Search,
  RefreshCw,
  Filter,
  Terminal,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

export const Logs: React.FC = () => {
  const [level, setLevel] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: logsData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['logs', level, search],
    queryFn: async () => {
      let url = '/logs?pageSize=50';
      if (level !== 'ALL') url += `&level=${level}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
      const { data } = await api.get(url);
      return data.data;
    },
    refetchInterval: 10000,
  });

  const levelBadges: Record<string, 'info' | 'warning' | 'danger' | 'purple'> = {
    INFO: 'info',
    WARN: 'warning',
    ERROR: 'danger',
    CRITICAL: 'danger',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ScrollText className="w-6 h-6 text-primary-400" />
            Live Telemetry Logs
          </h1>
          <p className="text-sm text-slate-400">
            Structured logs from background monitoring workers, schedulers, and incident analyzers
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />}
          onClick={() => refetch()}
        >
          Refresh Stream
        </Button>
      </div>

      {/* Filter Controls */}
      <Card className="p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search log messages, error codes, endpoint routes..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500 shrink-0" />
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
          >
            <option value="ALL">All Levels</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>
      </Card>

      {/* Terminal / Log Viewer */}
      <Card className="p-0 overflow-hidden bg-[#0a0f1d] border-slate-800">
        <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-primary-400" /> Log Telemetry Feed
          </span>
          <span>{logsData?.total || 0} entries</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs font-mono text-slate-500 animate-pulse">
            Streaming logs...
          </div>
        ) : logsData?.data?.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No log entries found matching criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60 font-mono text-xs max-h-[600px] overflow-y-auto">
            {logsData?.data?.map((log: any) => {
              const isExpanded = expandedId === log.id;
              const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

              return (
                <div key={log.id} className="hover:bg-slate-900/40 transition-colors">
                  <div
                    className="p-3 flex items-start gap-3 cursor-pointer select-none"
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  >
                    <span className="text-slate-600 shrink-0 mt-0.5">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </span>

                    <span className="text-slate-500 text-[11px] shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                    </span>

                    <Badge variant={levelBadges[log.level] || 'info'} size="sm" className="shrink-0 font-mono text-[10px]">
                      {log.level}
                    </Badge>

                    <span className="text-slate-400 text-[11px] px-1.5 py-0.5 rounded bg-slate-800 shrink-0">
                      {log.service}
                    </span>

                    <span className="text-slate-200 break-all flex-1">
                      {log.message}
                    </span>
                  </div>

                  {/* Expandable Metadata JSON */}
                  {isExpanded && hasMetadata && (
                    <div className="px-9 pb-3 pt-1">
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] text-cyan-300 overflow-x-auto">
                        <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
