import bcrypt from 'bcryptjs';

let pool = null;
let isConnected = false;

// In-Memory Fallback Store
export const memoryStore = {
  users: [
    {
      id: 'u1',
      name: 'Aarav Patient',
      email: 'patient@demo.com',
      password: bcrypt.hashSync('demo123', 10),
      role: 'patient',
      phone: '+91 98765 43210'
    },
    {
      id: 'u2',
      name: 'Dr. Sarah Mitchell',
      email: 'doctor@demo.com',
      password: bcrypt.hashSync('demo123', 10),
      role: 'doctor',
      phone: '+91 98765 12345',
      specialty: 'Cardiology',
      hospital: 'Apollo Heart Center',
      doctorId: 'd1'
    },
    {
      id: 'u3',
      name: 'Abhinav',
      email: 'abhinav1@gmail.com',
      password: bcrypt.hashSync('12345', 10),
      role: 'admin',
      phone: '+91 99000 00000'
    }
  ],
  doctors: [
    {
      id: 'd1',
      name: 'Dr. Sarah Mitchell',
      specialty: 'Cardiology',
      experience: 14,
      rating: 4.8,
      reviewsCount: 1,
      hospital: 'Apollo Heart Center',
      fee: 1200,
      education: 'MD Cardiology, AIIMS Delhi',
      about: 'Leading cardiologist with expertise in interventional cardiology and heart failure management.',
      languages: 'English, Hindi',
      location: 'Delhi',
      availableToday: 5,
      status: 'approved'
    },
    {
      id: 'd2',
      name: 'Dr. Rajiv Kapoor',
      specialty: 'Neurology',
      experience: 18,
      rating: 5.0,
      reviewsCount: 1,
      hospital: 'Fortis Neuro Sciences',
      fee: 1500,
      education: 'DM Neurology, PGI Chandigarh',
      about: 'Renowned neurologist specializing in stroke, epilepsy and neurodegenerative disorders.',
      languages: 'English, Hindi, Punjabi',
      location: 'Mumbai',
      availableToday: 3,
      status: 'approved'
    },
    {
      id: 'd3',
      name: 'Dr. Ananya Desai',
      specialty: 'Dermatology',
      experience: 9,
      rating: 0,
      reviewsCount: 0,
      hospital: 'SkinCraft Clinic',
      fee: 800,
      education: 'MD Dermatology, KEM Mumbai',
      about: 'Expert in cosmetic dermatology and clinical skin disorders with international fellowships.',
      languages: 'English, Marathi',
      location: 'Mumbai',
      availableToday: 7,
      status: 'approved'
    },
    {
      id: 'd4',
      name: 'Dr. Vikram Singh',
      specialty: 'Orthopedics',
      experience: 12,
      rating: 4.5,
      reviewsCount: 2,
      hospital: 'Max Bone & Joint',
      fee: 1000,
      education: 'MS Ortho, MAMC Delhi',
      about: 'Joint replacement specialist focused on minimally invasive knee and hip surgeries.',
      languages: 'English, Hindi',
      location: 'Delhi',
      availableToday: 4,
      status: 'approved'
    }
  ],
  appointments: [
    {
      id: 'ap-101',
      doctorId: 'd1',
      doctorName: 'Dr. Sarah Mitchell',
      patientEmail: 'patient@demo.com',
      patientName: 'Aarav Patient',
      patientPhone: '+91 98765 43210',
      date: new Date().toISOString().split('T')[0],
      time: '10:00 AM',
      status: 'completed',
      type: 'In-person',
      age: '28',
      gender: 'Male',
      problem: 'Routine cardiac checkup & ECG evaluation',
      fee: 1200,
      payment: 'Paid via Card',
      notes: 'Patient exhibits normal sinus rhythm. Advised low sodium diet and regular daily walking.',
      prescription: 'Tab Ecosprin 75mg OD x 30 days, Tab Atorvastatin 10mg HS x 30 days',
      medicines: [
        { name: 'Tab Ecosprin', dosage: '75mg (1-0-0)', duration: '30 Days', instruction: 'After breakfast' },
        { name: 'Tab Atorvastatin', dosage: '10mg (0-0-1)', duration: '30 Days', instruction: 'At bedtime' }
      ],
      reports: [
        { id: 'rep-1', title: 'Resting ECG & Lipid Profile', fileType: 'application/pdf', uploadedAt: new Date().toISOString(), uploadedBy: 'patient@demo.com' }
      ]
    }
  ],
  reviews: [
    {
      id: 'rev-1',
      appointmentId: 'ap-101',
      doctorId: 'd1',
      patientEmail: 'patient@demo.com',
      patientName: 'Aarav Patient',
      rating: 5,
      comment: 'Dr. Sarah was extremely attentive and explained my ECG report in detail. Highly recommend!',
      createdAt: new Date().toISOString()
    }
  ],
  notifications: [
    {
      id: 'notif-1',
      userEmail: 'patient@demo.com',
      title: 'Prescription Available',
      message: 'Dr. Sarah Mitchell uploaded your prescription and clinical advice for consultation #ap-101.',
      type: 'prescription',
      referenceId: 'ap-101',
      isRead: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 'notif-2',
      userEmail: 'doctor@demo.com',
      title: 'Consultation Completed',
      message: 'Appointment with Aarav Patient has been marked completed.',
      type: 'appointment',
      referenceId: 'ap-101',
      isRead: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'notif-3',
      userEmail: 'abhinav1@gmail.com',
      title: 'Hospital System Online',
      message: 'MedConnect Clinical Management System initialized successfully.',
      type: 'system',
      referenceId: '',
      isRead: false,
      createdAt: new Date().toISOString()
    }
  ]
};

export async function initMySQL(retries = 5, delayMs = 3000) {
  const connectionUrl = process.env.MYSQL_URL || process.env.DATABASE_URL || process.env.MYSQLPRIVATEURL || process.env.MYSQL_PRIVATE_URL;
  const host = process.env.MYSQLHOST || process.env.MYSQL_HOST || process.env.DB_HOST;
  const user = process.env.MYSQLUSER || process.env.MYSQL_USER || process.env.DB_USER || 'root';
  const password = process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || process.env.MYSQL_ROOT_PASSWORD || process.env.DB_PASSWORD || '';
  const database = process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || process.env.DB_NAME || 'medconnect';
  const port = Number(process.env.MYSQLPORT || process.env.MYSQL_PORT || process.env.DB_PORT || 3306);

  console.log('🔍 Database Environment Inspection:', {
    has_MYSQL_URL: !!process.env.MYSQL_URL,
    has_DATABASE_URL: !!process.env.DATABASE_URL,
    has_MYSQLPRIVATEURL: !!process.env.MYSQLPRIVATEURL,
    MYSQLHOST: host || 'NOT_SET',
    MYSQLPORT: port,
    MYSQLUSER: user,
    MYSQLDATABASE: database
  });

  if (!connectionUrl && !host) {
    console.log('⚡ No MySQL host or connection URL configured. Operating with high-performance DB fallback store.');
    isConnected = false;
    return false;
  }

  const mysql = (await import('mysql2/promise')).default;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (connectionUrl) {
        console.log(`🔄 Attempt ${attempt}/${retries}: Connecting to MySQL via URL...`);
        pool = mysql.createPool({
          uri: connectionUrl,
          waitForConnections: true,
          connectionLimit: 10,
          connectTimeout: 10000,
          ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined
        });
      } else {
        console.log(`🔄 Attempt ${attempt}/${retries}: Connecting to MySQL host ${host}:${port}, database ${database}...`);
        pool = mysql.createPool({
          host,
          user,
          password,
          database,
          port,
          waitForConnections: true,
          connectionLimit: 10,
          connectTimeout: 10000,
          ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined
        });
      }

      const conn = await pool.getConnection();
      conn.release();

      console.log('✅ CONNECTED TO MYSQL DATABASE SUCCESSFULLY!');
      isConnected = true;

      await createTables();
      return true;
    } catch (err) {
      console.warn(`⚠️ MySQL Connection Attempt ${attempt} Failed:`, err.code || err.message || err);
      if (attempt < retries) {
        console.log(`⏳ Waiting ${delayMs / 1000}s before retrying MySQL connection...`);
        await new Promise(res => setTimeout(res, delayMs));
      } else {
        console.log('⚡ All MySQL connection attempts exhausted. Operating with high-performance DB fallback store.');
        isConnected = false;
        return false;
      }
    }
  }

  return false;
}

async function createTables() {
  if (!pool || !isConnected) return;

  try {
    await pool.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
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
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
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
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id VARCHAR(50) PRIMARY KEY,
        appointmentId VARCHAR(50) NOT NULL,
        doctorId VARCHAR(50) NOT NULL,
        patientEmail VARCHAR(150) NOT NULL,
        patientName VARCHAR(100) NOT NULL,
        rating INT NOT NULL,
        comment TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Seed initial doctors into MySQL if empty
    const [docRows] = await pool.query('SELECT COUNT(*) as count FROM doctors');
    if (docRows[0].count === 0) {
      for (const doc of memoryStore.doctors) {
        await pool.query(
          `INSERT INTO doctors (id, name, specialty, experience, rating, reviewsCount, hospital, fee, education, about, languages, location, availableToday)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [doc.id, doc.name, doc.specialty, doc.experience, doc.rating, doc.reviewsCount, doc.hospital, doc.fee, doc.education, doc.about, doc.languages, doc.location, doc.availableToday]
        );
      }
      console.log('✅ Initial doctors seeded into MySQL database');
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', ['abhinav1@gmail.com']);
    if (rows.length === 0) {
      const passHash = await bcrypt.hash('12345', 10);
      await pool.query(
        'INSERT INTO users (id, name, email, password, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
        ['u3', 'Abhinav', 'abhinav1@gmail.com', passHash, 'admin', '+91 99000 00000']
      );
      console.log('✅ Default Abhinav Admin created in MySQL database');
    }

  } catch (err) {
    console.error('❌ Error initializing MySQL tables:', err.message);
  }
}

export function isMysqlConnected() {
  return isConnected;
}

export async function dbQuery(sql, params = []) {
  if (isConnected && pool) {
    const [rows] = await pool.query(sql, params);
    return rows;
  }
  return null;
}
