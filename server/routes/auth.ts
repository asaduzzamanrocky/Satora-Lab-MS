import { Router, Request, Response } from 'express';
import { dbManager, defaultPermissionsByRole } from '../db.js';
import { User, UserRole } from '../types.js';

export const authRouter = Router();

// Middleware to resolve active user from headers
export function getActiveUser(req: Request): User {
  const db = dbManager.get();
  const userId = req.headers['x-user-id'] as string;
  if (userId) {
    const found = db.users.find((u) => u.id === userId);
    if (found) return found;
  }
  // Default to super admin (Asaduzzaman Rocky) for first-time evaluation
  return db.users[0];
}

// Get current user profile and permission sets
authRouter.get('/me', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  res.json({
    user,
    allUsers: dbManager.get().users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      employeeId: u.employeeId,
      avatarUrl: u.avatarUrl,
    })),
  });
});

// Switch active role/user (for demo and multi-user preview)
authRouter.post('/switch', (req: Request, res: Response) => {
  const { userId } = req.body;
  const db = dbManager.get();
  const targetUser = db.users.find((u) => u.id === userId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  dbManager.logAudit({
    userId: targetUser.id,
    userName: targetUser.name,
    userRole: targetUser.role,
    action: 'LOGIN',
    resource: 'Auth',
    details: `Session switched to ${targetUser.name} (${targetUser.role})`,
  });

  res.json({ user: targetUser });
});

// List all users with permissions (Admins only or sanitized for others)
authRouter.get('/users', (req: Request, res: Response) => {
  const currentUser = getActiveUser(req);
  const db = dbManager.get();

  if (currentUser.role !== 'super_admin' && currentUser.role !== 'management') {
    return res.json(
      db.users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        avatarUrl: u.avatarUrl,
      }))
    );
  }

  res.json(db.users);
});

// Invite / Create user (Super Admin only)
authRouter.post('/users', (req: Request, res: Response) => {
  const currentUser = getActiveUser(req);
  if (currentUser.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only Super Admin can invite and configure users' });
  }

  const { name, email, role, employeeId, customPermissions } = req.body;
  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Name, email, and role are required' });
  }

  const db = dbManager.get();
  if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'User with this email already exists' });
  }

  const roleKey = role as UserRole;
  const permissions = customPermissions || defaultPermissionsByRole[roleKey] || defaultPermissionsByRole.viewer;

  const newUser: User = {
    id: `USR-${(db.users.length + 1).toString().padStart(3, '0')}`,
    name,
    email,
    role: roleKey,
    employeeId: employeeId || undefined,
    permissions,
    avatarUrl: `https://images.unsplash.com/photo-${1534528741775 + db.users.length}?w=150&auto=format&fit=crop&q=80`,
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  dbManager.save(db);

  dbManager.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'CREATE',
    resource: 'Users',
    details: `Invited new user ${name} (${email}) with role ${roleKey}`,
  });

  res.status(201).json(newUser);
});

// Update user permissions / role (Super Admin only)
authRouter.put('/users/:id', (req: Request, res: Response) => {
  const currentUser = getActiveUser(req);
  if (currentUser.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only Super Admin can modify user roles or permissions' });
  }

  const { id } = req.params;
  const { name, role, permissions, employeeId } = req.body;
  const db = dbManager.get();

  const userIdx = db.users.findIndex((u) => u.id === id);
  if (userIdx === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const existing = db.users[userIdx];
  const oldRole = existing.role;

  const updated: User = {
    ...existing,
    name: name || existing.name,
    role: (role as UserRole) || existing.role,
    employeeId: employeeId !== undefined ? employeeId : existing.employeeId,
    permissions: permissions || (role && role !== oldRole ? defaultPermissionsByRole[role as UserRole] : existing.permissions),
  };

  db.users[userIdx] = updated;
  dbManager.save(db);

  dbManager.logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action: 'ROLE_CHANGE',
    resource: 'Users',
    details: `Updated user ${updated.name}: role ${oldRole} -> ${updated.role}`,
  });

  res.json(updated);
});
