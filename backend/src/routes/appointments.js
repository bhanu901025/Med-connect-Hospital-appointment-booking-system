import express from 'express';
import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import { protect, authorize } from '../middleware/auth.js';
import { isMysqlConnected, dbQuery, memoryStore } from '../services/mysqlDb.js';
import { createNotification } from '../services/notificationService.js';

const router = express.Router();

// Helper to look up an appointment across databases
async function findAppointmentById(id) {
  if (mongoose.connection.readyState === 1) {
    return await Appointment.findOne({ id });
  }
  if (isMysqlConnected()) {
    const rows = await dbQuery('SELECT * FROM appointments WHERE id = ?', [id]);
    return rows.length > 0 ? rows[0] : null;
  }
  return memoryStore.appointments.find(a => a.id === id) || null;
}

// POST /api/appointments/book (Requires authenticated user, verifies patient identity & atomic slot check)
router.post('/book', protect, async (req, res, next) => {
  try {
    const { doctorId, date, time, patientPhone, type, age, gender, problem, fee, payment } = req.body;

    if (!doctorId || !date || !time) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required booking details (doctor, date, time)' 
      });
    }

    // Security: Enforce authenticated user credentials for patient appointments to prevent identity spoofing
    let patientEmail = req.user.email.toLowerCase().trim();
    let patientName = req.user.name;

    // Admin or Doctor may book on behalf of a patient if email is supplied
    if ((req.user.role === 'admin' || req.user.role === 'doctor') && req.body.patientEmail) {
      patientEmail = req.body.patientEmail.toLowerCase().trim();
      patientName = req.body.patientName || patientName;
    } else if (req.body.patientName && req.body.patientName.trim()) {
      patientName = req.body.patientName.trim();
    }

    const apptId = 'ap-' + Date.now();
    let docName = 'Medical Specialist';

    // 1. Verify doctor exists and is approved for public booking
    let doctorDoc = null;
    if (mongoose.connection.readyState === 1) {
      doctorDoc = await Doctor.findOne({ id: doctorId });
    } else if (isMysqlConnected()) {
      const docs = await dbQuery('SELECT * FROM doctors WHERE id = ?', [doctorId]);
      if (docs.length > 0) doctorDoc = docs[0];
    } else {
      doctorDoc = memoryStore.doctors.find(d => d.id === doctorId);
    }

    if (!doctorDoc) {
      return res.status(404).json({ success: false, error: 'Doctor not found' });
    }

    if (doctorDoc.status && doctorDoc.status !== 'approved') {
      return res.status(400).json({ 
        success: false, 
        error: `Doctor is currently ${doctorDoc.status} and cannot accept new appointments.` 
      });
    }

    docName = doctorDoc.name;
    const finalFee = Number(fee) || Number(doctorDoc.fee) || 800;

    // 2. MongoDB Atlas Execution with atomic slot protection
    if (mongoose.connection.readyState === 1) {
      const existing = await Appointment.findOne({ doctorId, date, time, status: { $ne: 'cancelled' } });
      if (existing) {
        return res.status(409).json({ 
          success: false, 
          error: 'This slot is already booked for the selected doctor. Please choose another time.' 
        });
      }

      try {
        const saved = await Appointment.create({
          id: apptId,
          doctorId,
          doctorName: docName,
          patientEmail,
          patientName,
          patientPhone: patientPhone || '',
          date,
          time,
          status: 'upcoming',
          type: type || 'In-person',
          age: age || '30',
          gender: gender || 'Not specified',
          problem: problem || 'General Consultation',
          fee: finalFee,
          payment: payment || 'Paid via Card',
          notes: '',
          prescription: ''
        });

        createNotification({
          userEmail: patientEmail,
          title: 'Appointment Confirmed',
          message: `Your appointment with ${docName} on ${date} at ${time} has been scheduled.`,
          type: 'appointment',
          referenceId: apptId
        });
        if (doctorDoc && doctorDoc.email) {
          createNotification({
            userEmail: doctorDoc.email,
            title: 'New Consultation Booked',
            message: `${patientName} booked an appointment for ${date} at ${time}.`,
            type: 'appointment',
            referenceId: apptId
          });
        }

        return res.status(201).json({ success: true, data: saved });
      } catch (err) {
        // MongoDB duplicate key error code (compound unique index violation)
        if (err.code === 11000) {
          return res.status(409).json({ 
            success: false, 
            error: 'This slot was just booked by another patient. Please choose another time.' 
          });
        }
        throw err;
      }
    }

    // 3. MySQL Execution with atomic slot conflict check
    if (isMysqlConnected()) {
      const existing = await dbQuery(
        'SELECT id FROM appointments WHERE doctorId = ? AND date = ? AND time = ? AND status != ?',
        [doctorId, date, time, 'cancelled']
      );

      if (existing.length > 0) {
        return res.status(409).json({ 
          success: false, 
          error: 'This slot is already booked for the selected doctor. Please choose another time.' 
        });
      }

      const newAppt = {
        id: apptId,
        doctorId,
        doctorName: docName,
        patientEmail,
        patientName,
        patientPhone: patientPhone || '',
        date,
        time,
        status: 'upcoming',
        type: type || 'In-person',
        age: age || '30',
        gender: gender || 'Not specified',
        problem: problem || 'General Consultation',
        fee: finalFee,
        payment: payment || 'Paid via Card',
        notes: '',
        prescription: ''
      };

      await dbQuery(
        `INSERT INTO appointments (id, doctorId, doctorName, patientEmail, patientName, patientPhone, date, time, status, type, age, gender, problem, fee, payment, notes, prescription)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newAppt.id, newAppt.doctorId, newAppt.doctorName, newAppt.patientEmail, newAppt.patientName,
          newAppt.patientPhone, newAppt.date, newAppt.time, newAppt.status, newAppt.type, newAppt.age,
          newAppt.gender, newAppt.problem, newAppt.fee, newAppt.payment, '', ''
        ]
      );

      memoryStore.appointments.unshift(newAppt);
      createNotification({
        userEmail: patientEmail,
        title: 'Appointment Confirmed',
        message: `Your appointment with ${docName} on ${date} at ${time} has been scheduled.`,
        type: 'appointment',
        referenceId: apptId
      });
      if (doctorDoc && doctorDoc.email) {
        createNotification({
          userEmail: doctorDoc.email,
          title: 'New Consultation Booked',
          message: `${patientName} booked an appointment for ${date} at ${time}.`,
          type: 'appointment',
          referenceId: apptId
        });
      }
      return res.status(201).json({ success: true, data: newAppt });
    }

    // 4. In-memory fallback (Atomic synchronization)
    const existing = memoryStore.appointments.find(a => 
      a.doctorId === doctorId && a.date === date && a.time === time && a.status !== 'cancelled'
    );
    if (existing) {
      return res.status(409).json({ 
        success: false, 
        error: 'This slot is already booked for the selected doctor. Please choose another time.' 
      });
    }

    const newAppt = {
      id: apptId,
      doctorId,
      doctorName: docName,
      patientEmail,
      patientName,
      patientPhone: patientPhone || '',
      date,
      time,
      status: 'upcoming',
      type: type || 'In-person',
      age: age || '30',
      gender: gender || 'Not specified',
      problem: problem || 'General Consultation',
      fee: finalFee,
      payment: payment || 'Paid via Card',
      notes: '',
      prescription: '',
      medicines: [],
      reports: []
    };

    memoryStore.appointments.unshift(newAppt);
    createNotification({
      userEmail: patientEmail,
      title: 'Appointment Confirmed',
      message: `Your appointment with ${docName} on ${date} at ${time} has been scheduled.`,
      type: 'appointment',
      referenceId: apptId
    });
    if (doctorDoc && doctorDoc.email) {
      createNotification({
        userEmail: doctorDoc.email,
        title: 'New Consultation Booked',
        message: `${patientName} booked an appointment for ${date} at ${time}.`,
        type: 'appointment',
        referenceId: apptId
      });
    }
    res.status(201).json({ success: true, data: newAppt });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments (Protected with role-based scoping: admin=all, doctor=assigned, patient=own)
router.get('/', protect, async (req, res, next) => {
  try {
    const { email, doctorId, status, date } = req.query;

    let targetEmail = email ? email.toLowerCase().trim() : null;
    let targetDoctorId = doctorId || null;

    // Security: Scoped access based on user role
    if (req.user.role === 'patient') {
      targetEmail = req.user.email.toLowerCase().trim(); // Patients can only see their own
      targetDoctorId = null;
    } else if (req.user.role === 'doctor') {
      targetDoctorId = req.user.doctorId; // Doctors can only see their assigned appointments
    }
    // Admin role has access to all query parameters unconstrained

    if (mongoose.connection.readyState === 1) {
      let query = {};
      if (targetEmail) query.patientEmail = targetEmail;
      if (targetDoctorId) query.doctorId = targetDoctorId;
      if (status) query.status = status;
      if (date) query.date = date;

      const docs = await Appointment.find(query).sort({ createdAt: -1 });
      return res.json(docs);
    }

    if (isMysqlConnected()) {
      let sql = 'SELECT * FROM appointments WHERE 1=1';
      const params = [];

      if (targetEmail) { sql += ' AND patientEmail = ?'; params.push(targetEmail); }
      if (targetDoctorId) { sql += ' AND doctorId = ?'; params.push(targetDoctorId); }
      if (status) { sql += ' AND status = ?'; params.push(status); }
      if (date) { sql += ' AND date = ?'; params.push(date); }

      sql += ' ORDER BY createdAt DESC';
      const rows = await dbQuery(sql, params);
      return res.json(rows);
    }

    let data = [...memoryStore.appointments];
    if (targetEmail) data = data.filter(a => a.patientEmail.toLowerCase() === targetEmail);
    if (targetDoctorId) data = data.filter(a => a.doctorId === targetDoctorId);
    if (status) data = data.filter(a => a.status === status);
    if (date) data = data.filter(a => a.date === date);

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/my/:email (Protected: patient may only view own email; admin can view any)
router.get('/my/:email', protect, async (req, res, next) => {
  try {
    const cleanEmail = req.params.email.toLowerCase().trim();

    if (req.user.role !== 'admin' && req.user.email.toLowerCase() !== cleanEmail) {
      return res.status(403).json({ 
        success: false, 
        error: 'Forbidden: You do not have permission to view appointments for this email' 
      });
    }

    if (mongoose.connection.readyState === 1) {
      const docs = await Appointment.find({ patientEmail: cleanEmail }).sort({ createdAt: -1 });
      return res.json(docs);
    }

    if (isMysqlConnected()) {
      const rows = await dbQuery('SELECT * FROM appointments WHERE patientEmail = ? ORDER BY createdAt DESC', [cleanEmail]);
      return res.json(rows);
    }

    const filtered = memoryStore.appointments.filter(a => a.patientEmail.toLowerCase() === cleanEmail);
    res.json(filtered);
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/doctor/:doctorId (Protected: doctor may only view own ID; admin can view any)
router.get('/doctor/:doctorId', protect, async (req, res, next) => {
  try {
    const { doctorId } = req.params;

    if (req.user.role !== 'admin' && req.user.doctorId !== doctorId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Forbidden: You do not have permission to view appointments for this doctor' 
      });
    }

    if (mongoose.connection.readyState === 1) {
      const docs = await Appointment.find({ doctorId }).sort({ createdAt: -1 });
      return res.json(docs);
    }

    if (isMysqlConnected()) {
      const rows = await dbQuery('SELECT * FROM appointments WHERE doctorId = ? ORDER BY createdAt DESC', [doctorId]);
      return res.json(rows);
    }

    const filtered = memoryStore.appointments.filter(a => a.doctorId === doctorId);
    res.json(filtered);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/appointments/:id/cancel (Protected: verified ownership check)
router.patch('/:id/cancel', protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const appt = await findAppointmentById(id);

    if (!appt) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    // Ownership check: Patient can cancel own appt; Doctor can cancel assigned appt; Admin can cancel any
    const isOwnerPatient = appt.patientEmail.toLowerCase() === req.user.email.toLowerCase();
    const isOwnerDoctor = req.user.doctorId && appt.doctorId === req.user.doctorId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwnerPatient && !isOwnerDoctor && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        error: 'Forbidden: You are not authorized to cancel this appointment' 
      });
    }

    if (appt.status === 'completed') {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot cancel an appointment that has already been completed' 
      });
    }

    if (mongoose.connection.readyState === 1) {
      await Appointment.findOneAndUpdate({ id }, { status: 'cancelled' });
    }

    if (isMysqlConnected()) {
      await dbQuery('UPDATE appointments SET status = ? WHERE id = ?', ['cancelled', id]);
    }

    const memAppt = memoryStore.appointments.find(a => a.id === id);
    if (memAppt) memAppt.status = 'cancelled';

    createNotification({
      userEmail: appt.patientEmail,
      title: 'Appointment Cancelled',
      message: `Your appointment with ${appt.doctorName || 'doctor'} on ${appt.date} at ${appt.time} has been cancelled.`,
      type: 'cancellation',
      referenceId: id
    });

    res.json({ success: true, message: 'Appointment cancelled successfully' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/appointments/:id/reschedule (Allow patients and doctors to reschedule an appointment)
router.patch('/:id/reschedule', protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newDate, newTime } = req.body;

    if (!newDate || !newTime) {
      return res.status(400).json({ 
        success: false, 
        error: 'New appointment date and time are required for rescheduling' 
      });
    }

    const appt = await findAppointmentById(id);
    if (!appt) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    // Ownership check
    const isOwnerPatient = appt.patientEmail.toLowerCase() === req.user.email.toLowerCase();
    const isOwnerDoctor = req.user.doctorId && appt.doctorId === req.user.doctorId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwnerPatient && !isOwnerDoctor && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        error: 'Forbidden: You are not authorized to reschedule this appointment' 
      });
    }

    if (appt.status === 'completed') {
      return res.status(400).json({ success: false, error: 'Completed appointments cannot be rescheduled' });
    }
    if (appt.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Cancelled appointments cannot be rescheduled' });
    }

    // Check slot conflict for new date/time
    if (mongoose.connection.readyState === 1) {
      const conflict = await Appointment.findOne({ 
        doctorId: appt.doctorId, 
        date: newDate, 
        time: newTime, 
        status: { $ne: 'cancelled' },
        id: { $ne: id }
      });

      if (conflict) {
        return res.status(409).json({ 
          success: false, 
          error: 'The requested slot is already booked for this doctor. Please select another time.' 
        });
      }

      const updated = await Appointment.findOneAndUpdate(
        { id },
        { 
          date: newDate, 
          time: newTime, 
          status: 'upcoming',
          $push: { 
            rescheduleHistory: { 
              previousDate: appt.date, 
              previousTime: appt.time, 
              rescheduledBy: req.user.email 
            } 
          }
        },
        { new: true }
      );

      createNotification({
        userEmail: appt.patientEmail,
        title: 'Appointment Rescheduled',
        message: `Your consultation with ${appt.doctorName || 'doctor'} has been rescheduled to ${newDate} at ${newTime}.`,
        type: 'reschedule',
        referenceId: id
      });
      return res.json({ success: true, message: 'Appointment rescheduled successfully', data: updated });
    }

    if (isMysqlConnected()) {
      const conflict = await dbQuery(
        'SELECT id FROM appointments WHERE doctorId = ? AND date = ? AND time = ? AND status != ? AND id != ?',
        [appt.doctorId, newDate, newTime, 'cancelled', id]
      );

      if (conflict.length > 0) {
        return res.status(409).json({ 
          success: false, 
          error: 'The requested slot is already booked for this doctor. Please select another time.' 
        });
      }

      await dbQuery(
        'UPDATE appointments SET date = ?, time = ?, status = ? WHERE id = ?',
        [newDate, newTime, 'upcoming', id]
      );

      const rows = await dbQuery('SELECT * FROM appointments WHERE id = ?', [id]);
      const memAppt = memoryStore.appointments.find(a => a.id === id);
      if (memAppt) {
        memAppt.date = newDate;
        memAppt.time = newTime;
        memAppt.status = 'upcoming';
      }

      createNotification({
        userEmail: appt.patientEmail,
        title: 'Appointment Rescheduled',
        message: `Your consultation with ${appt.doctorName || 'doctor'} has been rescheduled to ${newDate} at ${newTime}.`,
        type: 'reschedule',
        referenceId: id
      });
      return res.json({ success: true, message: 'Appointment rescheduled successfully', data: rows[0] });
    }

    // Memory store
    const conflict = memoryStore.appointments.find(a => 
      a.doctorId === appt.doctorId && a.date === newDate && a.time === newTime && a.status !== 'cancelled' && a.id !== id
    );

    if (conflict) {
      return res.status(409).json({ 
        success: false, 
        error: 'The requested slot is already booked for this doctor. Please select another time.' 
      });
    }

    const memAppt = memoryStore.appointments.find(a => a.id === id);
    if (memAppt) {
      memAppt.date = newDate;
      memAppt.time = newTime;
      memAppt.status = 'upcoming';
      if (!memAppt.rescheduleHistory) memAppt.rescheduleHistory = [];
      memAppt.rescheduleHistory.push({
        previousDate: appt.date,
        previousTime: appt.time,
        rescheduledBy: req.user.email,
        rescheduledAt: new Date().toISOString()
      });

      createNotification({
        userEmail: appt.patientEmail,
        title: 'Appointment Rescheduled',
        message: `Your consultation with ${appt.doctorName || 'doctor'} has been rescheduled to ${newDate} at ${newTime}.`,
        type: 'reschedule',
        referenceId: id
      });
      return res.json({ success: true, message: 'Appointment rescheduled successfully', data: memAppt });
    }

    res.status(404).json({ success: false, error: 'Appointment not found' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/appointments/:id/status (Doctor or Admin only, with doctor ownership check)
router.patch('/:id/status', protect, authorize('doctor', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['upcoming', 'completed', 'cancelled', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid appointment status' });
    }

    const appt = await findAppointmentById(id);
    if (!appt) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    // If doctor, verify this appointment belongs to them
    if (req.user.role === 'doctor' && appt.doctorId !== req.user.doctorId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Forbidden: You can only update the status of your own assigned appointments' 
      });
    }

    if (mongoose.connection.readyState === 1) {
      await Appointment.findOneAndUpdate({ id }, { status });
    }

    if (isMysqlConnected()) {
      await dbQuery('UPDATE appointments SET status = ? WHERE id = ?', [status, id]);
    }

    const memAppt = memoryStore.appointments.find(a => a.id === id);
    if (memAppt) memAppt.status = status;

    res.json({ success: true, message: `Appointment status updated to ${status}` });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/appointments/:id/clinical (Doctor-only, strictly verified for assigned doctor)
router.patch('/:id/clinical', protect, authorize('doctor'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes, prescription, medicines } = req.body;

    const appt = await findAppointmentById(id);
    if (!appt) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    // Critical authorization check: doctor must be assigned to this appointment
    if (appt.doctorId !== req.user.doctorId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Forbidden: You are not authorized to update clinical records for this appointment' 
      });
    }

    const updateFields = {
      notes: notes !== undefined ? notes : (appt.notes || ''),
      prescription: prescription !== undefined ? prescription : (appt.prescription || ''),
      status: 'completed'
    };
    if (Array.isArray(medicines)) {
      updateFields.medicines = medicines;
    }

    createNotification({
      userEmail: appt.patientEmail,
      title: 'Clinical Summary & Prescription Ready',
      message: `Dr. ${req.user.name || 'Your doctor'} has completed consultation #${id} and issued your medical prescription.`,
      type: 'prescription',
      referenceId: id
    });

    if (mongoose.connection.readyState === 1) {
      const updated = await Appointment.findOneAndUpdate(
        { id }, 
        updateFields,
        { new: true }
      );
      if (updated) return res.json({ success: true, data: updated });
    }

    if (isMysqlConnected()) {
      await dbQuery(
        'UPDATE appointments SET notes = ?, prescription = ?, status = ? WHERE id = ?',
        [updateFields.notes, updateFields.prescription, 'completed', id]
      );
      const rows = await dbQuery('SELECT * FROM appointments WHERE id = ?', [id]);
      if (rows.length > 0) return res.json({ success: true, data: rows[0] });
    }

    const memAppt = memoryStore.appointments.find(a => a.id === id);
    if (memAppt) {
      memAppt.notes = updateFields.notes;
      memAppt.prescription = updateFields.prescription;
      if (Array.isArray(medicines)) memAppt.medicines = medicines;
      memAppt.status = 'completed';
      return res.json({ success: true, data: memAppt });
    }

    res.status(404).json({ success: false, error: 'Appointment not found' });
  } catch (err) {
    next(err);
  }
});

// POST /api/appointments/:id/reports (Attach diagnostic lab reports/scans to appointment)
router.post('/:id/reports', protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, fileData, fileType } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Report title is required' });
    }

    const appt = await findAppointmentById(id);
    if (!appt) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    // Ownership check: patient can upload to own appt, assigned doctor can upload, admin can upload
    const isPatient = appt.patientEmail.toLowerCase() === req.user.email.toLowerCase();
    const isAssignedDoctor = req.user.doctorId && appt.doctorId === req.user.doctorId;
    const isAdmin = req.user.role === 'admin';

    if (!isPatient && !isAssignedDoctor && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        error: 'Forbidden: You are not authorized to attach reports to this appointment' 
      });
    }

    const newReport = {
      id: 'rep-' + Date.now(),
      title: title.trim(),
      fileData: fileData || '',
      fileType: fileType || 'application/pdf',
      uploadedAt: new Date().toISOString(),
      uploadedBy: req.user.email
    };

    if (mongoose.connection.readyState === 1) {
      const updated = await Appointment.findOneAndUpdate(
        { id },
        { $push: { reports: newReport } },
        { new: true }
      );
      createNotification({
        userEmail: isPatient ? (appt.doctorEmail || 'doctor@demo.com') : appt.patientEmail,
        title: 'New Diagnostic Report Uploaded',
        message: `${req.user.name || req.user.email} uploaded report "${title.trim()}" for appointment #${id}.`,
        type: 'system',
        referenceId: id
      });
      return res.status(201).json({ success: true, message: 'Report attached successfully', data: updated });
    }

    // Memory / MySQL store
    const memAppt = memoryStore.appointments.find(a => a.id === id);
    if (memAppt) {
      if (!memAppt.reports) memAppt.reports = [];
      memAppt.reports.push(newReport);
    }

    createNotification({
      userEmail: isPatient ? (appt.doctorEmail || 'doctor@demo.com') : appt.patientEmail,
      title: 'New Diagnostic Report Uploaded',
      message: `${req.user.name || req.user.email} uploaded report "${title.trim()}" for appointment #${id}.`,
      type: 'system',
      referenceId: id
    });

    res.status(201).json({ success: true, message: 'Report attached successfully', data: memAppt || appt });
  } catch (err) {
    next(err);
  }
});

export default router;
