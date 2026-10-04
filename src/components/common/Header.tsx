import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { PWAInstallButton } from './PWAInstallButton';
import { roleDisplay, getRoleBadgeClass } from '../../utils/formatters';
import {
  Clock,
  ShieldCheck,
  ChevronDown,
  Menu,
  Bell,
  Coins,
  MapPin,
  ExternalLink,
} from 'lucide-react';

interface HeaderProps {
  currentUser: User | null;
  allUsers: { id: string; name: string; email: string; role: string; avatarUrl?: string }[];
  onSwitchUser: (userId: string) => void;
  onOpenMobileMenu: () => void;
  onOpenNotifications: () => void;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  allUsers,
  onSwitchUser,
  onOpenMobileMenu,
  onOpenNotifications,
  unreadCount = 2,
}) => {
  const [dhakaTime, setDhakaTime] = useState('');
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const formatted = now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Dhaka',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
        setDhakaTime(formatted);
      } catch {
        setDhakaTime('');
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 md:px-6 backdrop-blur-md">
      {/* Left: Mobile trigger & Company Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="Satora Lab" className="w-8 h-8 rounded-xl shadow-xs" />
          <div className="flex flex-col">
            <span className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
              Satora Lab
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                HQ Ops
              </span>
            </span>
            <span className="hidden sm:inline-block text-[11px] text-slate-500 font-medium">
              Banani C/A, Dhaka-1213
            </span>
          </div>
        </div>
      </div>

      {/* Center: System Pills (Time, Currency, Location) */}
      <div className="hidden xl:flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1.5 bg-slate-100/90 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200/60 font-medium">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>{dhakaTime || 'Dhaka BST'} (UTC+6)</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-100/90 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200/60 font-medium">
          <Coins className="w-3.5 h-3.5 text-emerald-600" />
          <span>Currency: <strong>BDT (৳)</strong></span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-100/90 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200/60 font-medium">
          <MapPin className="w-3.5 h-3.5 text-rose-500" />
          <span>Asia/Dhaka</span>
        </div>
      </div>

      {/* Right: Actions, Notifications, Role Switcher */}
      <div className="flex items-center gap-2 sm:gap-3">
        <PWAInstallButton />

        {/* Notifications Icon */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          title="Notifications & Alerts"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
          )}
        </button>

        {/* Role Quick Switcher & Active User */}
        <div className="relative">
          <button
            onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
              {currentUser?.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  {currentUser?.name?.charAt(0) || 'U'}
                </div>
              )}
            </div>

            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {currentUser?.name || 'Evaluating User'}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {currentUser ? roleDisplay(currentUser.role) : 'Select Persona'}
              </span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Persona Switcher Dropdown */}
          {showRoleSwitcher && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowRoleSwitcher(false)}
              />
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white p-3 shadow-2xl border border-slate-100 z-50 animate-in fade-in">
                <div className="px-2 pb-2 mb-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    Role-Based Access Persona
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                    Test Mode
                  </span>
                </div>

                <p className="px-2 text-[11px] text-slate-500 mb-2 leading-relaxed">
                  Switch personas to verify strict server-enforced role restrictions (salaries, finance tabs, and project visibility).
                </p>

                <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                  {allUsers.map((u) => {
                    const isSelected = currentUser?.id === u.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          onSwitchUser(u.id);
                          setShowRoleSwitcher(false);
                        }}
                        className={`w-full text-left p-2 rounded-xl transition flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 text-blue-900 border border-blue-200'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-slate-200 overflow-hidden flex-shrink-0">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-slate-400 text-white flex items-center justify-center text-[10px]">
                                {u.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-semibold leading-none">{u.name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{u.email}</p>
                          </div>
                        </div>

                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${getRoleBadgeClass(u.role)}`}>
                          {roleDisplay(u.role)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
