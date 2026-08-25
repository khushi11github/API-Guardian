import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderGit2,
  AlertTriangle,
  FileCode2,
  ScrollText,
  Settings,
  ShieldCheck,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects & APIs', icon: FolderGit2 },
  { to: '/incidents', label: 'Incidents', icon: AlertTriangle, badge: 'Live' },
  { to: '/contracts', label: 'Contract Drift', icon: FileCode2 },
  { to: '/logs', label: 'Live Logs', icon: ScrollText },
  { to: '/settings', label: 'Settings & Alerts', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-[#0a0f1d] border-r border-slate-800 flex flex-col shrink-0 h-screen sticky top-0">
      {/* Brand header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800/80">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 via-indigo-500 to-accent-cyan flex items-center justify-center shadow-glow-primary">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
            API Guardian
          </span>
          <span className="text-[10px] uppercase font-mono tracking-widest text-primary-400 font-semibold block">
            Reliability AI
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider uppercase text-slate-500 font-mono">
          Monitoring & Diagnostics
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-primary-600/15 text-primary-400 border border-primary-500/30 shadow-glow-primary'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                )
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Status footer card */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/30">
        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <div>
              <div className="text-xs font-semibold text-slate-200">Worker Node</div>
              <div className="text-[10px] text-emerald-400 font-mono">BullMQ Active</div>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-glow-emerald" />
        </div>
      </div>
    </aside>
  );
};
