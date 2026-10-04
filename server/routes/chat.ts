import { Router, Request, Response } from 'express';
import { dbManager } from '../db.js';
import { getActiveUser } from './auth.js';
import { ChatChannel, ChatMessage, MessageRequest } from '../types.js';

export const chatRouter = Router();

// Ensure all projects have an active project channel
function ensureProjectChannels() {
  const db = dbManager.get();
  let changed = false;

  for (const project of db.projects) {
    const existing = db.chatChannels.find((c) => c.projectId === project.id);
    if (!existing) {
      const newChannel: ChatChannel = {
        id: `CHN-PRJ-${project.id}`,
        name: `Project: ${project.name}`,
        type: 'project',
        projectId: project.id,
        members: ['*'], // accessible to project members and admin
        description: `Project collaboration, updates, and deliverables for ${project.name}`,
        createdBy: 'SYSTEM',
        createdAt: project.createdAt || new Date().toISOString(),
      };
      db.chatChannels.push(newChannel);
      changed = true;
    }
  }

  if (changed) {
    dbManager.save(db);
  }
}

// GET all channels accessible to user
chatRouter.get('/channels', (req: Request, res: Response) => {
  ensureProjectChannels();
  const user = getActiveUser(req);
  const db = dbManager.get();

  const accessible = db.chatChannels.filter((c) => {
    if (user.role === 'super_admin') return true;
    if (c.members.includes('*')) return true;
    if (c.members.includes(user.id)) return true;
    if (c.type === 'project' && c.projectId) {
      const proj = db.projects.find((p) => p.id === c.projectId);
      if (proj && user.employeeId) {
        return proj.managerId === user.employeeId || proj.assignedEmployeeIds.includes(user.employeeId);
      }
    }
    return false;
  });

  // Calculate unread counts / last message
  const channelsWithMeta = accessible.map((c) => {
    const channelMessages = db.chatMessages.filter((m) => m.channelId === c.id);
    const lastMessage = channelMessages[channelMessages.length - 1] || null;
    return {
      ...c,
      messageCount: channelMessages.length,
      lastMessage,
    };
  });

  res.json(channelsWithMeta);
});

// GET messages for channel
chatRouter.get('/channels/:id/messages', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  const db = dbManager.get();
  const { id } = req.params;

  const channel = db.chatChannels.find((c) => c.id === id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  const messages = db.chatMessages.filter((m) => m.channelId === id);
  res.json(messages);
});

// POST message to channel
chatRouter.post('/channels/:id/messages', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  const db = dbManager.get();
  const { id } = req.params;
  const { text, attachments, replyToId } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Message text cannot be empty' });
  }

  const channel = db.chatChannels.find((c) => c.id === id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  const newMsg: ChatMessage = {
    id: `MSG-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
    channelId: id,
    senderId: user.id,
    senderName: user.name,
    senderRole: user.role,
    senderAvatar: user.avatarUrl,
    text: text.trim(),
    attachments: Array.isArray(attachments) ? attachments : undefined,
    replyToId: replyToId || undefined,
    createdAt: new Date().toISOString(),
  };

  db.chatMessages.push(newMsg);
  dbManager.save(db);

  res.status(201).json(newMsg);
});

// POST create custom channel or direct message
chatRouter.post('/channels', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  const db = dbManager.get();
  const { name, type, members, description, projectId } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Channel name is required' });
  }

  const channelType = type || 'public_channel';
  const memberList = Array.isArray(members) && members.length > 0 ? members : ['*'];
  if (!memberList.includes(user.id) && !memberList.includes('*')) {
    memberList.push(user.id);
  }

  const newChannel: ChatChannel = {
    id: `CHN-${Date.now().toString(36).toUpperCase()}`,
    name,
    type: channelType,
    projectId: projectId || undefined,
    members: memberList,
    description: description || '',
    createdBy: user.id,
    createdAt: new Date().toISOString(),
  };

  db.chatChannels.push(newChannel);
  dbManager.save(db);

  dbManager.logAudit({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'CREATE',
    resource: 'Chat',
    details: `Created chat channel "${newChannel.name}" (${newChannel.type})`,
  });

  res.status(201).json(newChannel);
});

// Message Requests: GET all requests for active user or admin
chatRouter.get('/requests', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  const db = dbManager.get();

  if (user.role === 'super_admin' || user.role === 'management') {
    return res.json(db.messageRequests || []);
  }

  // Otherwise, user sees requests they created or targeted at them
  const relevant = (db.messageRequests || []).filter(
    (r) => r.requesterId === user.id || r.targetUserId === user.id
  );
  res.json(relevant);
});

// Message Requests: POST create a request
chatRouter.post('/requests', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  const db = dbManager.get();
  const { targetUserId, subject, message } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required' });
  }

  const targetId = targetUserId || db.users[0]?.id || 'USR-001';

  const newReq: MessageRequest = {
    id: `REQ-${Date.now().toString(36).toUpperCase()}`,
    requesterId: user.id,
    requesterName: user.name,
    requesterEmail: user.email,
    targetUserId: targetId,
    subject,
    message,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  if (!db.messageRequests) db.messageRequests = [];
  db.messageRequests.unshift(newReq);
  dbManager.save(db);

  res.status(201).json(newReq);
});

// Message Requests: PUT accept or decline
chatRouter.put('/requests/:id', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  const db = dbManager.get();
  const { id } = req.params;
  const { status } = req.body;

  if (!['accepted', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'Status must be accepted or declined' });
  }

  const reqItem = (db.messageRequests || []).find((r) => r.id === id);
  if (!reqItem) {
    return res.status(404).json({ error: 'Request not found' });
  }

  reqItem.status = status;

  // If accepted, automatically create a dedicated Direct channel and post initial message!
  if (status === 'accepted') {
    const channelId = `CHN-DM-${reqItem.id}`;
    reqItem.channelId = channelId;

    const dmChannel: ChatChannel = {
      id: channelId,
      name: `Direct: ${reqItem.requesterName} & ${user.name}`,
      type: 'direct',
      members: [reqItem.requesterId, user.id],
      description: `Inquiry discussion: ${reqItem.subject}`,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
    };

    db.chatChannels.push(dmChannel);

    // Initial message
    db.chatMessages.push({
      id: `MSG-REQ-${Date.now()}`,
      channelId,
      senderId: reqItem.requesterId,
      senderName: reqItem.requesterName,
      senderRole: 'team_member',
      text: `[Request: ${reqItem.subject}]\n${reqItem.message}`,
      createdAt: reqItem.createdAt,
    });
  }

  dbManager.save(db);
  res.json(reqItem);
});
