import express from 'express';
import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import { protect } from '../middleware/auth.js';
import { isMysqlConnected, dbQuery, memoryStore } from '../services/mysqlDb.js';

const router = express.Router();

// POST /api/reviews - Patient submits a real review for a completed appointment
router.post('/', protect, async (req, res, next) => {
  try {
    const { appointmentId, doctorId, rating, comment } = req.body;

    if (!appointmentId || !doctorId || !rating) {
      return res.status(400).json({ success: false, error: 'Appointment, Doctor ID and Rating (1-5) are required' });
    }

    const numRating = Math.max(1, Math.min(5, Number(rating)));
    const reviewId = 'rev-' + Date.now();
    const patientEmail = req.user.email.toLowerCase().trim();
    const patientName = req.user.name;

    // 1. Verify that appointment exists, is completed, and belongs to the patient
    let appt = null;

    if (mongoose.connection.readyState === 1) {
      appt = await Appointment.findOne({ id: appointmentId });
    } else if (isMysqlConnected()) {
      const rows = await dbQuery('SELECT * FROM appointments WHERE id = ?', [appointmentId]);
      if (rows.length > 0) appt = rows[0];
    } else {
      appt = memoryStore.appointments.find(a => a.id === appointmentId);
    }

    if (!appt) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    if (appt.patientEmail.toLowerCase() !== patientEmail && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Forbidden: You can only review appointments that you attended' 
      });
    }

    if (appt.status !== 'completed') {
      return res.status(400).json({ 
        success: false, 
        error: 'Reviews can only be submitted for completed appointments' 
      });
    }

    if (appt.doctorId !== doctorId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Doctor ID does not match the assigned appointment' 
      });
    }

    // MongoDB Atlas
    if (mongoose.connection.readyState === 1) {
      let existing = await Review.findOne({ appointmentId });
      if (existing) {
        existing.rating = numRating;
        existing.comment = comment || '';
        await existing.save();
      } else {
        await Review.create({
          id: reviewId,
          appointmentId,
          doctorId,
          patientEmail,
          patientName,
          rating: numRating,
          comment: comment || ''
        });
      }

      // Recalculate doctor rating
      const docReviews = await Review.find({ doctorId });
      if (docReviews.length > 0) {
        const total = docReviews.reduce((sum, r) => sum + Number(r.rating), 0);
        const avg = parseFloat((total / docReviews.length).toFixed(1));
        await Doctor.findOneAndUpdate(
          { id: doctorId },
          { rating: avg, reviews: docReviews.length, reviewsCount: docReviews.length }
        );
      }

      return res.status(201).json({ success: true, message: 'Thank you for your review!' });
    }

    if (isMysqlConnected()) {
      await dbQuery(
        'INSERT INTO reviews (id, appointmentId, doctorId, patientEmail, patientName, rating, comment) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [reviewId, appointmentId, doctorId, patientEmail, patientName, numRating, comment || '']
      );

      // Recalculate doctor rating
      const doctorReviews = await dbQuery('SELECT rating FROM reviews WHERE doctorId = ?', [doctorId]);
      if (doctorReviews.length > 0) {
        const total = doctorReviews.reduce((sum, r) => sum + Number(r.rating), 0);
        const avg = parseFloat((total / doctorReviews.length).toFixed(1));
        await dbQuery('UPDATE doctors SET rating = ?, reviewsCount = ? WHERE id = ?', [avg, doctorReviews.length, doctorId]);
      }

      return res.status(201).json({ success: true, message: 'Thank you for your feedback!' });
    }

    // In-Memory Fallback
    const existing = memoryStore.reviews.find(r => r.appointmentId === appointmentId);
    if (existing) {
      existing.rating = numRating;
      existing.comment = comment || '';
    } else {
      memoryStore.reviews.unshift({
        id: reviewId,
        appointmentId,
        doctorId,
        patientEmail,
        patientName,
        rating: numRating,
        comment: comment || '',
        createdAt: new Date().toISOString()
      });
    }

    // Update doctor rating in memory
    const docReviews = memoryStore.reviews.filter(r => r.doctorId === doctorId);
    if (docReviews.length > 0) {
      const total = docReviews.reduce((sum, r) => sum + Number(r.rating), 0);
      const avg = parseFloat((total / docReviews.length).toFixed(1));
      const doc = memoryStore.doctors.find(d => d.id === doctorId);
      if (doc) {
        doc.rating = avg;
        doc.reviewsCount = docReviews.length;
      }
    }

    res.status(201).json({ success: true, message: 'Thank you for your review!' });
  } catch (err) {
    next(err);
  }
});

// GET /api/reviews/doctor/:doctorId - Get all reviews for a doctor
router.get('/doctor/:doctorId', async (req, res, next) => {
  try {
    const { doctorId } = req.params;

    if (mongoose.connection.readyState === 1) {
      const reviews = await Review.find({ doctorId }).sort({ createdAt: -1 });
      return res.json({ success: true, reviews });
    }

    if (isMysqlConnected()) {
      const reviews = await dbQuery('SELECT * FROM reviews WHERE doctorId = ? ORDER BY createdAt DESC', [doctorId]);
      return res.json({ success: true, reviews });
    }

    const reviews = memoryStore.reviews.filter(r => r.doctorId === doctorId);
    res.json({ success: true, reviews });
  } catch (err) {
    next(err);
  }
});

export default router;
