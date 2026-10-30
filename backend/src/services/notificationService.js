import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import { isMysqlConnected, dbQuery, memoryStore } from './mysqlDb.js';

export async function createNotification({ userEmail, title, message, type = 'system', referenceId = '' }) {
  if (!userEmail) return null;
  const cleanEmail = userEmail.toLowerCase().trim();
  const notifId = 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);

  try {
    // 1. MongoDB
    if (mongoose.connection.readyState === 1) {
      return await Notification.create({
        id: notifId,
        userEmail: cleanEmail,
        title,
        message,
        type,
        referenceId,
        isRead: false,
        createdAt: new Date()
      });
    }

    // 2. MySQL
    if (isMysqlConnected()) {
      await dbQuery(
        `INSERT INTO notifications (id, userEmail, title, message, type, referenceId, isRead, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [notifId, cleanEmail, title, message, type, referenceId, 0]
      );
      const rows = await dbQuery('SELECT * FROM notifications WHERE id = ?', [notifId]);
      return rows[0] || null;
    }

    // 3. In-memory fallback
    if (!memoryStore.notifications) {
      memoryStore.notifications = [];
    }
    const notif = {
      id: notifId,
      userEmail: cleanEmail,
      title,
      message,
      type,
      referenceId,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    memoryStore.notifications.unshift(notif);
    return notif;
  } catch (err) {
    console.warn(`[Notification] Warning: Failed to persist notification for ${cleanEmail}:`, err.message);
    return null;
  }
}

export async function getUserNotifications(userEmail) {
  if (!userEmail) return [];
  const cleanEmail = userEmail.toLowerCase().trim();

  if (mongoose.connection.readyState === 1) {
    return await Notification.find({ userEmail: cleanEmail }).sort({ createdAt: -1 }).limit(50);
  }

  if (isMysqlConnected()) {
    return await dbQuery(
      'SELECT * FROM notifications WHERE userEmail = ? ORDER BY createdAt DESC LIMIT 50',
      [cleanEmail]
    );
  }

  if (!memoryStore.notifications) memoryStore.notifications = [];
  return memoryStore.notifications
    .filter(n => n.userEmail.toLowerCase() === cleanEmail)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function markAsRead(id, userEmail) {
  const cleanEmail = userEmail.toLowerCase().trim();

  if (mongoose.connection.readyState === 1) {
    return await Notification.findOneAndUpdate(
      { id, userEmail: cleanEmail },
      { isRead: true },
      { new: true }
    );
  }

  if (isMysqlConnected()) {
    await dbQuery('UPDATE notifications SET isRead = 1 WHERE id = ? AND userEmail = ?', [id, cleanEmail]);
    const rows = await dbQuery('SELECT * FROM notifications WHERE id = ?', [id]);
    return rows[0] || null;
  }

  if (!memoryStore.notifications) memoryStore.notifications = [];
  const notif = memoryStore.notifications.find(n => n.id === id && n.userEmail.toLowerCase() === cleanEmail);
  if (notif) {
    notif.isRead = true;
    return notif;
  }
  return null;
}

export async function markAllAsRead(userEmail) {
  const cleanEmail = userEmail.toLowerCase().trim();

  if (mongoose.connection.readyState === 1) {
    await Notification.updateMany({ userEmail: cleanEmail, isRead: false }, { isRead: true });
    return true;
  }

  if (isMysqlConnected()) {
    await dbQuery('UPDATE notifications SET isRead = 1 WHERE userEmail = ?', [cleanEmail]);
    return true;
  }

  if (!memoryStore.notifications) memoryStore.notifications = [];
  memoryStore.notifications.forEach(n => {
    if (n.userEmail.toLowerCase() === cleanEmail) {
      n.isRead = true;
    }
  });
  return true;
}
