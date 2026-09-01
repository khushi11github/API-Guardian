import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Link } from 'react-router-dom';
import {
  FolderGit2,
  Plus,
  Globe,
  Activity,
  Layers,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Server,
  Trash2,
} from 'lucide-react';

export const Projects: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [environment, setEnvironment] = useState('PRODUCTION');
  const [description, setDescription] = useState('');
  const [threshold, setThreshold] = useState(3);
  const [error, setError] = useState<string | null>(null);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get('/projects');
      return data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/projects', {
        name,
        baseUrl,
        environment,
        description,
        consecutiveFailureThreshold: threshold,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsCreateOpen(false);
      setName('');
      setBaseUrl('');
      setDescription('');
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to create project');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await api.delete(`/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const envVariants: Record<string, 'success' | 'warning' | 'info' | 'purple' | 'danger'> = {
    PRODUCTION: 'danger',
    STAGING: 'warning',
    DEVELOPMENT: 'info',
    TESTING: 'purple',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">API Projects</h1>
          <p className="text-sm text-slate-400">
            Manage your monitored APIs, microservices, and environment targets
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateOpen(true)}
        >
          Add API Project
        </Button>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-48 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : projects?.length === 0 ? (
        <Card className="text-center py-12 space-y-3">
          <FolderGit2 className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-white">No projects found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Get started by adding your first base API project URL to monitor.
          </p>
          <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
            Create Project
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects?.map((project: any) => (
            <Card key={project.id} glow className="flex flex-col justify-between group">
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white text-base group-hover:text-primary-400 transition-colors">
                        {project.name}
                      </h3>
                      {project.isDemo && (
                        <span className="text-[10px] bg-primary-500/20 text-primary-300 px-1.5 py-0.5 rounded font-mono border border-primary-500/30">
                          DEMO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {project.description || 'No description provided.'}
                    </p>
                  </div>
                  <Badge variant={project.environment === 'PRODUCTION' ? 'danger' : 'info'} size="sm">
                    {project.environment}
                  </Badge>
                </div>

                <div className="space-y-2 py-3 border-y border-slate-800/80 my-3 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-slate-500" /> Base URL
                    </span>
                    <span className="font-mono text-slate-200 text-[11px] truncate max-w-[180px]">
                      {project.baseUrl}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-slate-500" /> Incident Threshold
                    </span>
                    <span className="text-slate-300 font-mono">
                      {project.consecutiveFailureThreshold} failures
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this project?')) {
                      deleteMutation.mutate(project.id);
                    }
                  }}
                  className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-xs"
                  title="Delete Project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <Link to={`/projects/${project.id}`}>
                  <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                    Open Endpoints
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Monitored API Project"
        description="Configure target base URL, environment tier, and alerting thresholds"
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Project Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. E-Commerce Core API"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Base Target URL</label>
            <input
              type="url"
              required
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.yourdomain.com"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Protected by automatic SSRF DNS-resolution guard.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Environment</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
              >
                <option value="PRODUCTION">Production</option>
                <option value="STAGING">Staging</option>
                <option value="DEVELOPMENT">Development</option>
                <option value="TESTING">Testing</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Incident Trigger (fails)
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Description (optional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of microservice responsibility..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createMutation.isPending}>
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
