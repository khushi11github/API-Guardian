import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { LogOut, User, Sparkles, Bell, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-[#0a0f1d]/80 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left status / breadcrumb context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-full">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>System Latency: <strong className="text-slate-200">142ms avg</strong></span>
          <span className="text-slate-600">|</span>
          <span>Uptime: <strong className="text-emerald-400">98.7%</strong></span>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <Link to="/incidents">
          <Button variant="ghost" size="sm" className="relative text-slate-400 hover:text-white">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0a0f1d]" />
          </Button>
        </Link>

        {/* User profile dropdown info */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-600/30 border border-primary-500/50 flex items-center justify-center text-primary-300 font-semibold text-xs">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-medium text-slate-200">{user?.name}</div>
              <div className="text-[10px] text-slate-500 font-mono">{user?.email}</div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            title="Sign out"
            className="text-slate-400 hover:text-rose-400"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
