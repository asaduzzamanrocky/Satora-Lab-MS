import React, { useState, useEffect, useRef } from 'react';
import { ChatChannel, ChatMessage, MessageRequest, User, Project } from '../../types';
import { api } from '../../services/api';
import { formatDhakaDate, formatDhakaTime, roleDisplay, getRoleBadgeClass } from '../../utils/formatters';
import {
  MessageSquare,
  Hash,
  Send,
  Plus,
  Users,
  Search,
  Lock,
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  X,
  MessageCircle,
  ShieldCheck,
  Building2,
  Paperclip,
} from 'lucide-react';

interface ChatPageProps {
  currentUser: User | null;
  projects?: Project[];
  allUsers: { id: string; name: string; email: string; role: string; avatarUrl?: string }[];
  initialChannelId?: string;
  initialProjectId?: string;
}

export const ChatPage: React.FC<ChatPageProps> = ({
  currentUser,
  projects = [],
  allUsers,
  initialChannelId,
  initialProjectId,
}) => {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>(initialChannelId || 'CHN-001');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageRequests, setMessageRequests] = useState<MessageRequest[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Sub-tabs: 'chat' | 'requests'
  const [viewTab, setViewTab] = useState<'chat' | 'requests'>('chat');

  // Modals
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // New Channel Form
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<ChatChannel['type']>('public_channel');
  const [newChannelDesc, setNewChannelDesc] = useState('');

  // New Message Request Form
  const [requestTargetUserId, setRequestTargetUserId] = useState(allUsers[0]?.id || 'USR-001');
  const [requestSubject, setRequestSubject] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChannelsAndRequests();
    const interval = setInterval(refreshMessages, 4000);
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    if (activeChannelId) {
      loadMessagesForChannel(activeChannelId);
    }
  }, [activeChannelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChannelsAndRequests = async () => {
    setLoadingChannels(true);
    try {
      const [chnList, reqList] = await Promise.all([
        api.getChannels().catch(() => []),
        api.getMessageRequests().catch(() => []),
      ]);
      setChannels(chnList);
      setMessageRequests(reqList);
      if (initialChannelId && chnList.some((c) => c.id === initialChannelId)) {
        setActiveChannelId(initialChannelId);
      } else if (initialProjectId) {
        const match = chnList.find((c) => c.projectId === initialProjectId);
        if (match) setActiveChannelId(match.id);
        else if (chnList.length > 0 && !activeChannelId) setActiveChannelId(chnList[0].id);
      } else if (chnList.length > 0 && !activeChannelId) {
        setActiveChannelId(chnList[0].id);
      }
    } catch (err) {
      console.error('Failed to load chat channels:', err);
    } finally {
      setLoadingChannels(false);
    }
  };

  const loadMessagesForChannel = async (channelId: string) => {
    setLoadingMessages(true);
    try {
      const msgs = await api.getMessages(channelId);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const refreshMessages = async () => {
    if (!activeChannelId || viewTab !== 'chat') return;
    try {
      const msgs = await api.getMessages(activeChannelId);
      setMessages(msgs);
    } catch {
      // ignore transient refresh errors
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChannelId) return;

    const textToSend = inputText;
    setInputText('');

    try {
      const newMsg = await api.sendMessage(activeChannelId, { text: textToSend });
      setMessages((prev) => [...prev, newMsg]);
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
      setInputText(textToSend);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    try {
      const created = await api.createChannel({
        name: newChannelName.startsWith('#') ? newChannelName.slice(1) : newChannelName,
        type: newChannelType,
        description: newChannelDesc,
        members: ['*'],
      });
      setChannels([...channels, created]);
      setActiveChannelId(created.id);
      setShowNewChannelModal(false);
      setNewChannelName('');
      setNewChannelDesc('');
    } catch (err: any) {
      alert(err.message || 'Failed to create channel');
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestSubject.trim() || !requestMessage.trim()) return;

    setRequestSubmitting(true);
    try {
      const created = await api.createMessageRequest({
        targetUserId: requestTargetUserId,
        subject: requestSubject,
        message: requestMessage,
      });
      setMessageRequests([created, ...messageRequests]);
      setRequestSuccess('Message request submitted successfully to administrator.');
      setTimeout(() => {
        setRequestSuccess('');
        setShowRequestModal(false);
        setRequestSubject('');
        setRequestMessage('');
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to send request');
    } finally {
      setRequestSubmitting(false);
    }
  };

  const handleRespondRequest = async (reqId: string, status: 'accepted' | 'declined') => {
    try {
      const updated = await api.respondMessageRequest(reqId, status);
      setMessageRequests(messageRequests.map((r) => (r.id === reqId ? updated : r)));
      if (status === 'accepted' && updated.channelId) {
        await loadChannelsAndRequests();
        setActiveChannelId(updated.channelId);
        setViewTab('chat');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to respond to request');
    }
  };

  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const pendingRequestsCount = messageRequests.filter((r) => r.status === 'pending').length;

  const publicChannels = channels.filter((c) => c.type === 'public_channel' || c.type === 'announcement');
  const projectChannels = channels.filter((c) => c.type === 'project');
  const directChannels = channels.filter((c) => c.type === 'direct');

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Top Banner: Hubspot + Slack workspace bar */}
      <div className="h-12 bg-slate-900 text-white px-4 flex items-center justify-between border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-400" />
          <span className="font-bold text-xs tracking-wide">SATORA TEAM CHAT & HUB</span>
          <span className="text-[10px] bg-slate-800 text-blue-300 px-2 py-0.5 rounded-full font-mono">
            Dhaka BST
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setViewTab('chat')}
            className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
              viewTab === 'chat' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Chat Rooms
          </button>
          <button
            onClick={() => setViewTab('requests')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
              viewTab === 'requests' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Message Requests</span>
            {pendingRequestsCount > 0 && (
              <span className="bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-full text-[10px]">
                {pendingRequestsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowRequestModal(true)}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>Request Chat</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      {viewTab === 'chat' ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar: Channels, Projects, DMs */}
          <div className="w-64 bg-slate-950 text-slate-300 flex flex-col border-r border-slate-800 flex-shrink-0">
            {/* Quick Actions */}
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Workspaces
              </span>
              {currentUser?.role === 'super_admin' && (
                <button
                  onClick={() => setShowNewChannelModal(true)}
                  className="p-1 text-slate-400 hover:text-white rounded"
                  title="Create Channel"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Channels Scroll Area */}
            <div className="flex-1 overflow-y-auto p-2 space-y-4 text-xs">
              {/* Public Channels */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase px-2 tracking-wider block">
                  Channels
                </span>
                {publicChannels.map((c) => {
                  const isActive = activeChannelId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveChannelId(c.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{c.name}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Project Rooms */}
              <div className="space-y-1">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                    Project Rooms
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">{projectChannels.length}</span>
                </div>
                {projectChannels.map((c) => {
                  const isActive = activeChannelId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveChannelId(c.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <FolderKanban className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                        <span className="truncate">{c.name.replace('Project: ', '')}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Direct Messages */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-emerald-400 uppercase px-2 tracking-wider block">
                  Direct Messages
                </span>
                {directChannels.map((c) => {
                  const isActive = activeChannelId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveChannelId(c.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span className="truncate">{c.name.replace('Direct: ', '')}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Message Area */}
          <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
            {/* Channel Top Header */}
            <div className="h-14 bg-white border-b border-slate-200 px-5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                {activeChannel?.type === 'project' ? (
                  <FolderKanban className="w-5 h-5 text-blue-600" />
                ) : activeChannel?.type === 'direct' ? (
                  <MessageCircle className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Hash className="w-5 h-5 text-slate-600" />
                )}
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{activeChannel?.name || 'Channel'}</h3>
                  <p className="text-[11px] text-slate-500">{activeChannel?.description || 'Active team thread'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Live Sync (4s)
                </span>
              </div>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {loadingMessages ? (
                <div className="text-center py-12 text-xs text-slate-400">Loading conversation...</div>
              ) : messages.length === 0 ? (
                <div className="text-center py-16 space-y-2">
                  <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">No messages yet in this room.</p>
                  <p className="text-[11px] text-slate-400">Say hello or share project updates below!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === currentUser?.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-3 ${isMine ? 'flex-row-reverse' : ''}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center font-bold text-xs flex-shrink-0 text-slate-700">
                        {msg.senderName.charAt(0)}
                      </div>

                      <div className={`max-w-[75%] space-y-1 ${isMine ? 'text-right' : ''}`}>
                        <div className={`flex items-center gap-2 text-[11px] ${isMine ? 'justify-end' : ''}`}>
                          <span className="font-bold text-slate-900">{msg.senderName}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] ${getRoleBadgeClass(msg.senderRole)}`}>
                            {roleDisplay(msg.senderRole)}
                          </span>
                          <span className="text-slate-400 text-[10px] font-mono">
                            {formatDhakaTime(msg.createdAt)}
                          </span>
                        </div>

                        <div
                          className={`p-3 rounded-2xl text-xs leading-relaxed text-left inline-block shadow-xs whitespace-pre-wrap ${
                            isMine
                              ? 'bg-blue-600 text-white rounded-tr-none'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Compose Input */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Message #${activeChannel?.name || 'channel'} (Press Enter to send)...`}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-blue-600 focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl transition cursor-pointer disabled:opacity-50 active:scale-95 shadow-md shadow-blue-500/20"
                title="Send Message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Message Requests Tab (HubSpot / Helpdesk Style) */
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Direct Message & Authorization Requests</h2>
              <p className="text-xs text-slate-500">
                Staff inquiries or permission requests submitted to Admin and Managers.
              </p>
            </div>
            <button
              onClick={() => setShowRequestModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Submit Request</span>
            </button>
          </div>

          {messageRequests.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">No message requests found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {messageRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-slate-400 font-bold">{req.id}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'accepted'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'declined'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800 animate-pulse'
                        }`}
                      >
                        {req.status.toUpperCase()}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm">{req.subject}</h4>
                    <p className="text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                      {req.message}
                    </p>

                    <div className="text-[11px] text-slate-500 pt-1">
                      From: <strong>{req.requesterName}</strong> ({req.requesterEmail}) • {formatDhakaDate(req.createdAt)}
                    </div>
                  </div>

                  {currentUser?.role === 'super_admin' && req.status === 'pending' && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                      <button
                        onClick={() => handleRespondRequest(req.id, 'declined')}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleRespondRequest(req.id, 'accepted')}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                      >
                        Accept & Open Direct Thread
                      </button>
                    </div>
                  )}

                  {req.status === 'accepted' && req.channelId && (
                    <button
                      onClick={() => {
                        setActiveChannelId(req.channelId!);
                        setViewTab('chat');
                      }}
                      className="text-xs font-bold text-blue-600 hover:underline pt-1 text-left"
                    >
                      Open Linked Direct Chat →
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Channel Modal */}
      {showNewChannelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create New Chat Room</h3>
              <button onClick={() => setShowNewChannelModal(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="mt-4 space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Channel Name *</label>
                <input
                  type="text"
                  required
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g. mobile-release-sync"
                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  placeholder="Channel purpose..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewChannelModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Message Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Submit Request for Message / Access</h3>
              <button onClick={() => setShowRequestModal(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {requestSuccess && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 text-emerald-800 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{requestSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateRequest} className="mt-4 space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Administrator / Lead *</label>
                <select
                  value={requestTargetUserId}
                  onChange={(e) => setRequestTargetUserId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden"
                >
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({roleDisplay(u.role)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Request Subject *</label>
                <input
                  type="text"
                  required
                  value={requestSubject}
                  onChange={(e) => setRequestSubject(e.target.value)}
                  placeholder="e.g. Permission request for ChatGPT Team Account"
                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Details & Context *</label>
                <textarea
                  rows={3}
                  required
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Please state why you need to initiate communication or require tool credentials..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestSubmitting}
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm disabled:opacity-50"
                >
                  {requestSubmitting ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
