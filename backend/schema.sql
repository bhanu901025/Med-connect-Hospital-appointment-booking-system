-- Med connect - Hospital appointment booking system
-- MySQL Database Schema Definition

CREATE DATABASE IF NOT EXISTS medconnect;
USE medconnect;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('patient', 'doctor', 'admin') DEFAULT 'patient',
  phone VARCHAR(30) DEFAULT '',
  specialty VARCHAR(100) DEFAULT '',
  hospital VARCHAR(150) DEFAULT '',
  doctorId VARCHAR(50) DEFAULT '',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Doctors Table (With Verification Status)
CREATE TABLE IF NOT EXISTS doctors (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  specialty VARCHAR(100) NOT NULL,
  experience INT DEFAULT 5,
  rating FLOAT DEFAULT 0.0,
  reviewsCount INT DEFAULT 0,
  hospital VARCHAR(150) DEFAULT 'MedConnect Care Center',
  fee INT DEFAULT 800,
  education VARCHAR(200) DEFAULT 'MD / MBBS',
  about TEXT,
  languages VARCHAR(255) DEFAULT 'English, Hindi',
  location VARCHAR(100) DEFAULT 'Delhi',
  availableToday INT DEFAULT 6,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Appointments Table (With Slot Protection)
CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(50) PRIMARY KEY,
  doctorId VARCHAR(50) NOT NULL,
  doctorName VARCHAR(100) NOT NULL,
  patientEmail VARCHAR(150) NOT NULL,
  patientName VARCHAR(100) NOT NULL,
  patientPhone VARCHAR(30) DEFAULT '',
  date VARCHAR(20) NOT NULL,
  time VARCHAR(20) NOT NULL,
  status ENUM('upcoming', 'completed', 'cancelled', 'pending') DEFAULT 'upcoming',
  type ENUM('New', 'Follow-up', 'Video', 'In-person') DEFAULT 'In-person',
  age VARCHAR(10) DEFAULT '30',
  gender VARCHAR(20) DEFAULT 'Not specified',
  problem TEXT,
  fee INT DEFAULT 800,
  payment VARCHAR(50) DEFAULT 'Paid via Card',
  notes TEXT,
  prescription TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_doc_date_time (doctorId, date, time),
  INDEX idx_patient_email (patientEmail)
);

-- 4. Reviews Table (Real Patient Reviews)
CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(50) PRIMARY KEY,
  appointmentId VARCHAR(50) NOT NULL,
  doctorId VARCHAR(50) NOT NULL,
  patientEmail VARCHAR(150) NOT NULL,
  patientName VARCHAR(100) NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_doctor (doctorId)
);
