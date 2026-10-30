import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  createNotification
} from '../services/notificationService.js';

const router = express.Router();

// GET /api/notifications (Protected: Get notifications for the authenticated user)
router.get('/', protect, async (req, res, next) => {
  try {
    const list = await getUserNotifications(req.user.email);
    const unreadCount = list.filter(n => !n.isRead).length;
    res.json({
      success: true,
      data: list,
      unreadCount
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read (Protected: Mark notification as read)
router.patch('/:id/read', protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await markAsRead(id, req.user.email);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    res.json({ success: true, message: 'Notification marked as read', data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/read-all (Protected: Mark all notifications as read for current user)
router.patch('/read-all', protect, async (req, res, next) => {
  try {
    await markAllAsRead(req.user.email);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

export default router;
