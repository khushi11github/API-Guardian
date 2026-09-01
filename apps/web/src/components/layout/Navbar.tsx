import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { LogOut, Bell, Activity, Clock, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [time, setTime] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const formattedTime = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const formattedDate = time.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="h-16 bg-[#0a0f1d]/80 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: live metrics */}
      <div className="flex items-center gap-3">
        {/* Live clock */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/70 border border-slate-800 px-3 py-1.5 rounded-full">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-200 tabular-nums">{formattedTime}</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-500">{formattedDate}</span>
        </div>

        {/* System health pill */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 status-dot-live" />
          </span>
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            <strong className="text-slate-200">142ms</strong> avg
          </span>
          <span className="text-slate-600">|</span>
          <span>
            Uptime <strong className="text-emerald-400">98.7%</strong>
          </span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2.5">
        {/* Notification bell */}
        <Link to="/incidents">
          <button className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition-all group">
            <Bell className="w-4 h-4 group-hover:animate-pulse-subtle" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0a0f1d]" />
          </button>
        </Link>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-800" />

        {/* User profile */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-800/60 transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600/50 to-indigo-600/50 border border-primary-500/50 flex items-center justify-center text-primary-300 font-bold text-xs ring-2 ring-primary-500/20">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-200 leading-tight">{user?.name}</div>
              <div className="text-[10px] text-slate-500 font-mono leading-tight">{user?.email}</div>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-[#0f172a] border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-fade-in z-50">
              <div className="px-4 py-3 border-b border-slate-800">
                <div className="text-xs font-semibold text-white">{user?.name}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{user?.email}</div>
              </div>
              <div className="p-1.5">
                <Link to="/settings" onClick={() => setShowUserMenu(false)}>
                  <button className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/70 rounded-lg transition-colors">
                    ⚙️ Settings & Alerts
                  </button>
                </Link>
                <button
                  onClick={() => { setShowUserMenu(false); logout(); }}
                  className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
