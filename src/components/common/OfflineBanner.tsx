import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api, getOfflineQueue } from '../../services/api';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState('');

  const checkQueue = () => {
    const q = getOfflineQueue();
    setQueueCount(q.length);
  };

  useEffect(() => {
    checkQueue();
    const handleOnline = () => {
      setIsOnline(true);
      triggerAutoSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      checkQueue();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const interval = setInterval(checkQueue, 4000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const triggerAutoSync = async () => {
    const q = getOfflineQueue();
    if (q.length > 0) {
      setIsSyncing(true);
      try {
        const res = await api.syncOfflineQueue();
        setQueueCount(0);
        setSyncSuccessMsg(`Synced ${res.syncedCount} changes`);
        setTimeout(() => setSyncSuccessMsg(''), 4000);
      } catch (err) {
        console.error('Failed auto sync:', err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await api.syncOfflineQueue();
      setQueueCount(0);
      setSyncSuccessMsg(`Successfully synced ${res.syncedCount} offline items!`);
      setTimeout(() => setSyncSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Manual sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 animate-pulse" />
            <span>
              <strong>Offline Mode (Dhaka Engine):</strong> You are currently disconnected. All project updates and tasks are cached locally and will auto-sync when connection is restored.
            </span>
          </div>
          {queueCount > 0 && (
            <span className="bg-amber-600 px-2 py-0.5 rounded text-[11px] font-bold">
              {queueCount} pending
            </span>
          )}
        </div>
      )}

      {isOnline && queueCount > 0 && (
        <div className="bg-blue-600 text-white px-4 py-1.5 text-xs font-medium flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5 text-blue-200" />
            <span>Connection restored! You have <strong>{queueCount}</strong> pending changes ready to sync.</span>
          </div>
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1 bg-white text-blue-700 px-2.5 py-1 rounded text-xs font-semibold hover:bg-blue-50 transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      )}

      {syncSuccessMsg && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-emerald-600 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-lg animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{syncSuccessMsg}</span>
        </div>
      )}
    </>
  );
};
