import React from 'react';
import { User } from '../../types';
import { roleDisplay } from '../../utils/formatters';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  BadgePercent,
  FileSpreadsheet,
  Users,
  Building2,
  Settings,
  Lock,
  X,
  Sparkles,
  MessageSquare,
  Key,
} from 'lucide-react';

export type NavPage =
  | 'dashboard'
  | 'projects'
  | 'tasks'
  | 'chat'
  | 'vault'
  | 'finance'
  | 'reports'
  | 'employees'
  | 'clients'
  | 'settings';

interface SidebarProps {
  activePage: NavPage;
  onSelectPage: (page: NavPage) => void;
  currentUser: User | null;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onSelectPage,
  currentUser,
  isOpenMobile,
  onCloseMobile,
}) => {
  const permissions = currentUser?.permissions;

  const navItems: {
    id: NavPage;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    allowed: boolean;
    tag?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      allowed: true,
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: FolderKanban,
      allowed: !!permissions?.projects.view,
    },
    {
      id: 'tasks',
      label: 'Tasks & Timeline',
      icon: CheckSquare,
      allowed: !!permissions?.tasks.view,
    },
    {
      id: 'chat',
      label: 'Chat & Discussions',
      icon: MessageSquare,
      allowed: true,
      tag: 'Hub',
    },
    {
      id: 'vault',
      label: 'Credential Vault',
      icon: Key,
      allowed: true,
      tag: 'Secrets',
    },
    {
      id: 'finance',
      label: 'Finance & Accounts',
      icon: BadgePercent,
      allowed: !!permissions?.finance.view,
      tag: 'BDT',
    },
    {
      id: 'reports',
      label: 'Monthly Reports',
      icon: FileSpreadsheet,
      allowed: !!permissions?.reports.view && !!permissions?.canViewFinancials,
    },
    {
      id: 'employees',
      label: 'Team & HR',
      icon: Users,
      allowed: !!permissions?.employees.view,
    },
    {
      id: 'clients',
      label: 'Clients & CRM',
      icon: Building2,
      allowed: !!permissions?.clients.view,
    },
    {
      id: 'settings',
      label: 'Settings & RBAC',
      icon: Settings,
      allowed: !!permissions?.settings.view || currentUser?.role === 'super_admin',
    },
  ];

  const handleNavClick = (page: NavPage, allowed: boolean) => {
    if (!allowed) return;
    onSelectPage(page);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-slate-200 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center p-1 text-white shadow-md shadow-blue-500/30">
              <img src="/logo.svg" alt="Satora Lab" className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-white text-sm tracking-wide">SATORA LAB</span>
              <span className="block text-[10px] text-blue-400 font-medium">Project & Office System</span>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Scope Info Banner */}
        <div className="px-4 py-3 mx-3 my-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium text-[11px]">Active Session</span>
            <span className="text-[10px] font-semibold text-blue-400 px-1.5 py-0.2 rounded bg-blue-950/70 border border-blue-800/50">
              {currentUser ? roleDisplay(currentUser.role) : 'Viewer'}
            </span>
          </div>
          <p className="text-xs font-bold text-white truncate mt-1">{currentUser?.name || 'Anonymous'}</p>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                currentUser?.permissions.projectScope === 'all' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span>
              Scope: {currentUser?.permissions.projectScope === 'all' ? 'All Company Projects' : 'Assigned Only'}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 px-3 overflow-y-auto py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            const isAllowed = item.allowed;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id, isAllowed)}
                disabled={!isAllowed}
                className={`group flex w-full items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : isAllowed
                    ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    : 'text-slate-500 hover:bg-slate-900/60 cursor-not-allowed opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : isAllowed ? 'text-slate-400 group-hover:text-blue-400' : 'text-slate-600'}`} />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.tag && (
                    <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                      {item.tag}
                    </span>
                  )}
                  {!isAllowed && (
                    <span title="Restricted by Role-Based Access Control">
                      <Lock className="w-3 h-3 text-slate-500" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer Info */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-slate-300 font-semibold">
              <Sparkles className="w-3 h-3 text-blue-400" />
              Satora Lab v2.4
            </span>
            <span className="text-emerald-400 text-[10px] font-mono">DHAKA BST</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">Google Sheets Sync Engine</p>
        </div>
      </aside>
    </>
  );
};
