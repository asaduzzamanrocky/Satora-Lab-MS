import React, { useState, useEffect } from 'react';
import { User } from './types';
import { api, setCurrentUserId } from './services/api';
import { Header } from './components/common/Header';
import { Sidebar, NavPage } from './components/common/Sidebar';
import { OfflineBanner } from './components/common/OfflineBanner';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { ProjectsPage } from './components/projects/ProjectsPage';
import { TasksPage } from './components/tasks/TasksPage';
import { FinancePage } from './components/finance/FinancePage';
import { MonthlyReportsPage } from './components/reports/MonthlyReportsPage';
import { EmployeesPage } from './components/employees/EmployeesPage';
import { ClientsPage } from './components/clients/ClientsPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { ChatPage } from './components/chat/ChatPage';
import { VaultPage } from './components/vault/VaultPage';
import { Project } from './types';
import { roleDisplay } from './utils/formatters';
import { Bell, X, ShieldAlert, Sparkles } from 'lucide-react';

export default function App() {
  const [activePage, setActivePage] = useState<NavPage>('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; email: string; role: string; avatarUrl?: string }[]>([]);
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [roleSwitchToast, setRoleSwitchToast] = useState('');
  const [initialTaskProjectId, setInitialTaskProjectId] = useState<string | undefined>(undefined);
  const [initialChatProjectId, setInitialChatProjectId] = useState<string | undefined>(undefined);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Register service worker on mount for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'test') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => console.log('[PWA] ServiceWorker registered with scope:', reg.scope))
          .catch((err) => console.log('[PWA] ServiceWorker registration skipped:', err));
      });
    }
  }, []);

  // Fetch initial profile & projects
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const [profileData, projs] = await Promise.all([
        api.getMe(),
        api.getProjects().catch(() => []),
      ]);
      setCurrentUser(profileData.user);
      setAllUsers(profileData.allUsers || []);
      setProjects(projs);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleSwitchUser = async (userId: string) => {
    try {
      const res = await api.switchUser(userId);
      setCurrentUser(res.user);
      setRoleSwitchToast(`Switched active persona to ${res.user.name} (${roleDisplay(res.user.role)})`);
      setTimeout(() => setRoleSwitchToast(''), 4000);

      // If user switched to an unauthorized tab, redirect to dashboard
      if (activePage === 'finance' && !res.user.permissions.finance.view) {
        setActivePage('dashboard');
      }
      if (activePage === 'reports' && !res.user.permissions.reports.view) {
        setActivePage('dashboard');
      }
    } catch (err) {
      console.error('Failed to switch user:', err);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.svg" alt="Satora Lab" className="w-12 h-12 animate-pulse" />
          <p className="text-xs font-bold tracking-widest uppercase text-blue-400">Loading Satora Lab...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Offline banner and queued sync alert */}
      <OfflineBanner />

      {/* Role Switch Notification Banner */}
      {roleSwitchToast && (
        <div className="bg-slate-900 text-white px-4 py-2 text-xs font-medium flex items-center justify-between border-b border-blue-500 shadow-md animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>
              <strong>Persona Switched:</strong> {roleSwitchToast}
            </span>
          </div>
          <button
            onClick={() => setRoleSwitchToast('')}
            className="text-slate-400 hover:text-white p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Shell Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activePage={activePage}
          onSelectPage={setActivePage}
          currentUser={currentUser}
          isOpenMobile={isOpenMobile}
          onCloseMobile={() => setIsOpenMobile(false)}
        />

        {/* Content Area */}
        <div className="flex flex-1 flex-col overflow-y-auto min-w-0">
          {/* Header */}
          <Header
            currentUser={currentUser}
            allUsers={allUsers}
            onSwitchUser={handleSwitchUser}
            onOpenMobileMenu={() => setIsOpenMobile(true)}
            onOpenNotifications={() => setNotificationsOpen(true)}
            unreadCount={2}
          />

          {/* Main page content container */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {activePage === 'dashboard' && (
              <DashboardPage
                currentUser={currentUser}
                onNavigateToProjects={() => setActivePage('projects')}
                onNavigateToTasks={() => setActivePage('tasks')}
                onNavigateToFinance={() => setActivePage('finance')}
                onNavigateToReports={() => setActivePage('reports')}
              />
            )}

            {activePage === 'projects' && (
              <ProjectsPage
                currentUser={currentUser}
                onOpenTaskModalWithProject={(projId) => {
                  setInitialTaskProjectId(projId);
                  setActivePage('tasks');
                }}
                onOpenProjectChat={(projId) => {
                  setInitialChatProjectId(projId);
                  setActivePage('chat');
                }}
              />
            )}

            {activePage === 'tasks' && (
              <TasksPage
                currentUser={currentUser}
                initialProjectId={initialTaskProjectId}
              />
            )}

            {activePage === 'chat' && (
              <ChatPage
                currentUser={currentUser}
                projects={projects}
                allUsers={allUsers}
                initialProjectId={initialChatProjectId}
              />
            )}

            {activePage === 'vault' && (
              <VaultPage
                currentUser={currentUser}
                allUsers={allUsers}
              />
            )}

            {activePage === 'finance' && (
              <FinancePage currentUser={currentUser} />
            )}

            {activePage === 'reports' && (
              <MonthlyReportsPage currentUser={currentUser} />
            )}

            {activePage === 'employees' && (
              <EmployeesPage currentUser={currentUser} />
            )}

            {activePage === 'clients' && (
              <ClientsPage currentUser={currentUser} />
            )}

            {activePage === 'settings' && (
              <SettingsPage
                currentUser={currentUser}
                onRefreshAllData={loadUserProfile}
              />
            )}
          </main>
        </div>
      </div>

      {/* Notifications Drawer */}
      {notificationsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white h-full shadow-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Notifications & Alerts</h3>
                </div>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="font-bold text-rose-800 block">Overdue Task Escalation</span>
                  <p className="text-rose-600 mt-0.5">
                    "Aarong Mobile Cart Checkout Speed Optimization" is overdue past Oct 3 deadline.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <span className="font-bold text-blue-800 block">Milestone Payment Logged</span>
                  <p className="text-blue-600 mt-0.5">
                    Received ৳1,200,000 from Square Pharma for Cold-Chain dispatch system.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-800 block">PWA & Offline Sync Active</span>
                  <p className="text-slate-500 mt-0.5">
                    Your offline mutations will synchronize with the Dhaka API when connected.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setNotificationsOpen(false)}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
            >
              Close Alerts
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
