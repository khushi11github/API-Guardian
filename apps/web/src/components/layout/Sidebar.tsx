import React, { useState } from 'react';
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
  Zap,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Health overview' },
  { to: '/projects', label: 'Projects & APIs', icon: FolderGit2, desc: 'Manage endpoints' },
  { to: '/incidents', label: 'Incidents', icon: AlertTriangle, badge: 'Live', desc: 'Active alerts' },
  { to: '/contracts', label: 'Contract Drift', icon: FileCode2, desc: 'Schema changes' },
  { to: '/logs', label: 'Live Logs', icon: ScrollText, desc: 'Request stream' },
  { to: '/settings', label: 'Settings & Alerts', icon: Settings, desc: 'Configuration' },
];

export const Sidebar: React.FC = () => {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <aside className="w-64 bg-[#0a0f1d] border-r border-slate-800 flex flex-col shrink-0 h-screen sticky top-0">
      {/* Brand header */}
      <div className="h-16 flex items-center px-5 gap-3 border-b border-slate-800/80 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600/5 to-transparent pointer-events-none" />
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 via-indigo-500 to-accent-cyan flex items-center justify-center shadow-glow-primary shrink-0 relative">
          <ShieldCheck className="w-5 h-5 text-white" />
          {/* Animated ring */}
          <span className="absolute inset-0 rounded-xl border border-primary-400/40 animate-ping opacity-30" />
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
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="px-3 pb-3 text-[10px] font-bold tracking-widest uppercase text-slate-600 font-mono flex items-center gap-2">
          <span>Monitoring</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {navItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onMouseEnter={() => setHovered(item.to)}
              onMouseLeave={() => setHovered(null)}
              style={{ animationDelay: `${index * 50}ms` }}
              className={({ isActive }) =>
                clsx(
                  'flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative overflow-hidden animate-fade-in',
                  isActive
                    ? 'bg-primary-600/15 text-primary-300 border border-primary-500/25 shadow-glow-primary'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active left bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary-400 rounded-r-full" />
                  )}

                  <div className="flex items-center gap-3 min-w-0">
                    <div className={clsx(
                      'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-150',
                      isActive
                        ? 'bg-primary-500/20 text-primary-400'
                        : 'bg-slate-800/60 text-slate-500 group-hover:bg-slate-700/60 group-hover:text-slate-300'
                    )}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate leading-tight">{item.label}</div>
                      {hovered === item.to && !isActive && (
                        <div className="text-[10px] text-slate-500 leading-tight animate-fade-in truncate">
                          {item.desc}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse uppercase tracking-wide">
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <ChevronRight className="w-3 h-3 text-primary-400/60" />
                    )}
                  </div>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Quota / usage card */}
      <div className="px-3 pb-2">
        <div className="p-3 rounded-xl bg-gradient-to-br from-primary-950/60 to-slate-900/80 border border-primary-500/20 space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-amber-400" /> Check Quota
            </span>
            <span className="text-primary-300 font-mono font-bold">1,420 / 5,000</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-indigo-400 transition-all duration-700"
              style={{ width: '28%' }}
            />
          </div>
          <div className="text-[9px] text-slate-600 font-mono">Resets in 18h 42m</div>
        </div>
      </div>

      {/* Status footer card */}
      <div className="p-3 border-t border-slate-800/80">
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Radio className="w-4 h-4 text-emerald-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 status-dot-live" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">Worker Node</div>
              <div className="text-[10px] text-emerald-400 font-mono">BullMQ Active</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-emerald-400"
                style={{
                  height: `${8 + i * 4}px`,
                  animation: `pulse-subtle ${0.6 + i * 0.2}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
