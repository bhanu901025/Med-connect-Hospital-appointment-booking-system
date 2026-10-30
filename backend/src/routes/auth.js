import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import { protect, getJwtSecret } from '../middleware/auth.js';
import { isMysqlConnected, dbQuery, memoryStore } from '../services/mysqlDb.js';

const router = express.Router();
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id || user._id, 
      email: user.email, 
      role: user.role, 
      name: user.name,
      doctorId: user.doctorId || ''
    },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES }
  );
};

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { 
      name, email, password, role = 'patient', phone = '', specialty = '', hospital = '',
      experience = 5, fee = 800, location = 'Delhi', education = 'MD / MBBS', about = ''
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email and password are required' });
    }

    if (role === 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Public registration for admin role is prohibited. Please sign in with your admin credentials.' 
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const targetRole = role === 'doctor' ? 'doctor' : 'patient';
    const userId = 'u_' + Date.now();

    let createdDoctorId = '';
    let doctorProfile = null;

    if (targetRole === 'doctor') {
      createdDoctorId = 'd_' + Date.now();
      doctorProfile = {
        id: createdDoctorId,
        name: name.startsWith('Dr.') ? name : `Dr. ${name}`,
        specialty: specialty || 'General Medicine',
        experience: Number(experience) || 5,
        rating: 0.0,
        reviewsCount: 0,
        hospital: hospital || 'MedConnect Healthcare Center',
        fee: Number(fee) || 800,
        education: education || 'MD / MBBS',
        about: about || `${name} is a dedicated healthcare specialist.`,
        languages: ['English', 'Hindi'],
        location: location || 'Delhi',
        availableToday: 6,
        status: 'pending' // Doctor profiles start in pending status until admin approves
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // MongoDB Atlas execution
    if (mongoose.connection.readyState === 1) {
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'An account with this email already exists' });
      }

      if (doctorProfile) {
        await Doctor.create(doctorProfile);
        memoryStore.doctors.push(doctorProfile);
      }

      const user = await User.create({
        name,
        email: cleanEmail,
        password: hashedPassword,
        role: targetRole,
        phone,
        specialty,
        hospital,
        doctorId: createdDoctorId
      });

      const token = generateToken(user);
      const userRes = user.toJSON();

      return res.status(201).json({ 
        success: true, 
        token, 
        user: userRes,
        message: targetRole === 'doctor' 
          ? 'Doctor registered successfully. Account is pending admin verification before appearing in public searches.' 
          : 'Registration successful'
      });
    }

    // MySQL Storage
    if (isMysqlConnected()) {
      const existing = await dbQuery('SELECT id FROM users WHERE email = ?', [cleanEmail]);
      if (existing.length > 0) {
        return res.status(400).json({ success: false, error: 'An account with this email already exists' });
      }

      if (doctorProfile) {
        await dbQuery(
          `INSERT INTO doctors (id, name, specialty, experience, rating, reviewsCount, hospital, fee, education, about, languages, location, availableToday, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            doctorProfile.id, doctorProfile.name, doctorProfile.specialty, doctorProfile.experience,
            0.0, 0, doctorProfile.hospital, doctorProfile.fee, doctorProfile.education,
            doctorProfile.about, Array.isArray(doctorProfile.languages) ? doctorProfile.languages.join(', ') : doctorProfile.languages, 
            doctorProfile.location, doctorProfile.availableToday, doctorProfile.status
          ]
        );
        memoryStore.doctors.push(doctorProfile);
      }

      await dbQuery(
        `INSERT INTO users (id, name, email, password, role, phone, specialty, hospital, doctorId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, name, cleanEmail, hashedPassword, targetRole, phone, specialty, hospital, createdDoctorId]
      );

      const userObj = { id: userId, name, email: cleanEmail, role: targetRole, phone, specialty, hospital, doctorId: createdDoctorId };
      const token = generateToken(userObj);

      return res.status(201).json({ 
        success: true, 
        token, 
        user: userObj,
        message: targetRole === 'doctor' 
          ? 'Doctor registered successfully. Account is pending admin verification before appearing in public searches.' 
          : 'Registration successful'
      });
    }

    // In-Memory Fallback
    const exists = memoryStore.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (exists) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists' });
    }

    if (doctorProfile) {
      memoryStore.doctors.push(doctorProfile);
    }

    const newUser = {
      id: userId,
      name,
      email: cleanEmail,
      password: hashedPassword,
      role: targetRole,
      phone,
      specialty,
      hospital,
      doctorId: createdDoctorId
    };

    memoryStore.users.push(newUser);
    const token = generateToken(newUser);
    const { password: _, ...userNoPass } = newUser;

    res.status(201).json({ 
      success: true, 
      token, 
      user: userNoPass,
      message: targetRole === 'doctor' 
        ? 'Doctor registered successfully. Account is pending admin verification before appearing in public searches.' 
        : 'Registration successful'
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide email and password' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Mongo execution
    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email: cleanEmail }).select('+password');
      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      const token = generateToken(user);
      const userRes = user.toJSON();

      return res.json({ success: true, token, user: userRes });
    }

    // MySQL Storage
    if (isMysqlConnected()) {
      const rows = await dbQuery('SELECT * FROM users WHERE email = ?', [cleanEmail]);
      if (rows.length === 0) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      const user = rows[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      const token = generateToken(user);
      const { password: _, ...userNoPass } = user;

      return res.json({ success: true, token, user: userNoPass });
    }

    // In-Memory Fallback
    const user = memoryStore.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = generateToken(user);
    const { password: _, ...userNoPass } = user;

    res.json({ success: true, token, user: userNoPass });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(req.user.id);
      if (user) return res.json({ success: true, user });
    }

    if (isMysqlConnected()) {
      const rows = await dbQuery('SELECT id, name, email, role, phone, specialty, hospital, doctorId, createdAt FROM users WHERE id = ?', [req.user.id]);
      if (rows.length > 0) return res.json({ success: true, user: rows[0] });
    }

    const user = memoryStore.users.find(u => u.id === req.user.id || u.email === req.user.email);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const { password: _, ...userNoPass } = user;
    res.json({ success: true, user: userNoPass });
  } catch (err) {
    next(err);
  }
});

export default router;
