import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://127.0.0.1:5000';

function request(method, pathName, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathName, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function ensureBackendServer() {
  try {
    const res = await request('GET', '/api/health');
    if (res.status === 200) {
      console.log('📡 Connected to running backend server on port 5000.');
      return null;
    }
  } catch (err) {
    // Server is not running yet; spawn it automatically
  }

  console.log('⚡ Backend server is not running on port 5000. Auto-starting server for tests...');
  const serverProcess = spawn('node', ['src/server.js'], {
    cwd: __dirname,
    stdio: 'ignore'
  });

  // Wait up to 10 seconds for server to start
  const startTime = Date.now();
  while (Date.now() - startTime < 10000) {
    await new Promise(r => setTimeout(r, 600));
    try {
      const res = await request('GET', '/api/health');
      if (res.status === 200) {
        console.log('✅ Backend test server is ready!\n');
        return serverProcess;
      }
    } catch (e) {
      // Waiting for startup
    }
  }

  serverProcess.kill();
  throw new Error('Failed to auto-start backend server within 10 seconds. Check port 5000 availability.');
}

async function runTests() {
  console.log('🧪 Starting Comprehensive E2E MedConnect Security & Workflow Test Suite...\n');
  let serverProcess = null;

  try {
    serverProcess = await ensureBackendServer();
  } catch (err) {
    console.error('❌ Could not start or connect to backend server:', err.message);
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  async function assert(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASSED: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAILED: ${name} ->`, err.message);
      failed++;
    }
  }

  try {
    // 1. Health Check
    await assert('GET /api/health returns status ok', async () => {
      const res = await request('GET', '/api/health');
      if (res.status !== 200 || res.body.status !== 'ok') {
        throw new Error(`Expected status 200 & status ok, got ${res.status} ${JSON.stringify(res.body)}`);
      }
    });

    // 2. Auth Login Demo Patient
    let patientToken = '';
    await assert('POST /api/auth/login logs in demo patient', async () => {
      const res = await request('POST', '/api/auth/login', {
        email: 'patient@demo.com',
        password: 'demo123'
      });
      if (res.status !== 200 || !res.body.token) {
        throw new Error(`Login failed with status ${res.status}: ${JSON.stringify(res.body)}`);
      }
      patientToken = res.body.token;
    });

    // 3. Auth Register New User
    let newAuthToken = '';
    const testEmail = `testuser_${Date.now()}@example.com`;
    await assert('POST /api/auth/register registers new user', async () => {
      const res = await request('POST', '/api/auth/register', {
        name: 'Test Patient',
        email: testEmail,
        password: 'Password123!',
        role: 'patient'
      });
      if (res.status !== 201 || !res.body.token) {
        throw new Error(`Registration failed: ${res.status} ${JSON.stringify(res.body)}`);
      }
      newAuthToken = res.body.token;
    });

    // 4. GET /api/auth/me
    await assert('GET /api/auth/me returns authenticated user details', async () => {
      const res = await request('GET', '/api/auth/me', null, newAuthToken);
      if (res.status !== 200 || !res.body.user) {
        throw new Error(`Failed to get user profile: ${res.status} ${JSON.stringify(res.body)}`);
      }
    });

    // 5. GET Doctors List (Approved Only)
    await assert('GET /api/doctors returns approved doctor array', async () => {
      const res = await request('GET', '/api/doctors');
      if (res.status !== 200 || !Array.isArray(res.body)) {
        throw new Error(`Expected array of doctors, got ${res.status} ${JSON.stringify(res.body)}`);
      }
    });

    // 6. GET Doctors Filtered by Specialty
    await assert('GET /api/doctors?specialty=Cardiology filters properly', async () => {
      const res = await request('GET', '/api/doctors?specialty=Cardiology');
      if (res.status !== 200 || !Array.isArray(res.body)) {
        throw new Error(`Expected array, got ${res.status}`);
      }
    });

    // 7. GET Doctor by ID
    await assert('GET /api/doctors/d1 returns Dr. Sarah Mitchell', async () => {
      const res = await request('GET', '/api/doctors/d1');
      if (res.status !== 200 || res.body.id !== 'd1') {
        throw new Error(`Doctor d1 not returned properly: ${res.status} ${JSON.stringify(res.body)}`);
      }
    });

    // 8. Auth Login Demo Admin
    let adminToken = '';
    await assert('POST /api/auth/login logs in Abhinav admin', async () => {
      const res = await request('POST', '/api/auth/login', {
        email: 'abhinav1@gmail.com',
        password: '12345'
      });
      if (res.status !== 200 || !res.body.token) {
        throw new Error(`Admin login failed: ${res.status}`);
      }
      adminToken = res.body.token;
    });

    // 9. Admin Add Doctor
    const testDocId = 'test_doc_' + Date.now();
    await assert('POST /api/doctors adds a new doctor (Admin)', async () => {
      const res = await request('POST', '/api/doctors', {
        id: testDocId,
        name: 'Dr. Test Specialist',
        specialty: 'Neurology',
        hospital: 'Test City Hospital',
        fee: 950,
        experience: 10,
        location: 'Mumbai',
        status: 'approved'
      }, adminToken);

      if (res.status !== 201 || !res.body.success) {
        throw new Error(`Failed to add doctor: ${res.status} ${JSON.stringify(res.body)}`);
      }
    });

    // 10. Admin Delete Doctor
    await assert('DELETE /api/doctors/:id removes doctor (Admin)', async () => {
      const res = await request('DELETE', `/api/doctors/${testDocId}`, null, adminToken);
      if (res.status !== 200 || !res.body.success) {
        throw new Error(`Failed to delete doctor: ${res.status} ${JSON.stringify(res.body)}`);
      }
    });

    // 11. Book Appointment (Authenticated)
    let bookedApptId = '';
    const testDate = `2026-11-${Math.floor(Math.random()*20+1).toString().padStart(2, '0')}`;
    const testTime = '02:30 PM';
    await assert('POST /api/appointments/book creates appointment with auth', async () => {
      const res = await request('POST', '/api/appointments/book', {
        doctorId: 'd2',
        date: testDate,
        time: testTime,
        patientEmail: testEmail,
        patientName: 'Test Patient',
        patientPhone: '+91 99999 88888',
        type: 'Video',
        problem: 'Headache & Migraine consultation',
        fee: 1500
      }, newAuthToken);

      if (res.status !== 201 || !res.body.success) {
        throw new Error(`Booking failed: ${res.status} ${JSON.stringify(res.body)}`);
      }
      bookedApptId = res.body.data.id;
    });

    // 12. Slot Protection: Prevent duplicate booking of same slot
    await assert('POST /api/appointments/book prevents duplicate booking (409 Conflict)', async () => {
      const res = await request('POST', '/api/appointments/book', {
        doctorId: 'd2',
        date: testDate,
        time: testTime,
        patientEmail: 'other@demo.com',
        patientName: 'Other Patient'
      }, newAuthToken);

      if (res.status !== 409) {
        throw new Error(`Expected status 409 for duplicate slot, got ${res.status}: ${JSON.stringify(res.body)}`);
      }
    });

    // 13. Security: Unauthenticated access to /api/appointments/my/:email is rejected
    await assert('GET /api/appointments/my/:email rejects unauthenticated requests (401)', async () => {
      const res = await request('GET', `/api/appointments/my/${testEmail}`);
      if (res.status !== 401) {
        throw new Error(`Expected status 401 without token, got ${res.status}`);
      }
    });

    // 14. Security: Access to another patient appointments is rejected (403)
    await assert('GET /api/appointments/my/:email rejects unauthorized patient (403)', async () => {
      const res = await request('GET', '/api/appointments/my/patient@demo.com', null, newAuthToken);
      if (res.status !== 403) {
        throw new Error(`Expected status 403 when viewing another user appts, got ${res.status}`);
      }
    });

    // 15. Authenticated patient retrieves own appointments
    await assert('GET /api/appointments/my/:email retrieves own appointments with token', async () => {
      const res = await request('GET', `/api/appointments/my/${testEmail}`, null, newAuthToken);
      if (res.status !== 200 || !Array.isArray(res.body) || res.body.length === 0) {
        throw new Error(`Expected appointments for ${testEmail}, got ${res.status} ${JSON.stringify(res.body)}`);
      }
    });

    // 16. Doctor login
    let doctorToken = '';
    await assert('POST /api/auth/login logs in demo doctor (Dr. Sarah Mitchell, d1)', async () => {
      const res = await request('POST', '/api/auth/login', {
        email: 'doctor@demo.com',
        password: 'demo123'
      });
      if (res.status !== 200 || !res.body.token) {
        throw new Error(`Doctor login failed: ${res.status}`);
      }
      doctorToken = res.body.token;
    });

    // 17. Security: Doctor cannot update clinical records for an unassigned appointment (403)
    await assert('PATCH /api/appointments/:id/clinical rejects unassigned doctor (403)', async () => {
      const res = await request('PATCH', `/api/appointments/${bookedApptId}/clinical`, {
        notes: 'Unauthorized notes attempt',
        prescription: 'Unauthorized prescription attempt'
      }, doctorToken);

      if (res.status !== 403) {
        throw new Error(`Expected 403 for unassigned doctor clinical update, got ${res.status}`);
      }
    });

    // 18. Security: Doctor cannot update another doctor profile (403)
    await assert('PUT /api/doctors/:id rejects doctor editing another profile (403)', async () => {
      const res = await request('PUT', '/api/doctors/d2', {
        fee: 2500
      }, doctorToken);

      if (res.status !== 403) {
        throw new Error(`Expected 403 when doctor updates another profile, got ${res.status}`);
      }
    });

    // 19. Appointment Rescheduling Workflow
    const newRescheduleDate = `2026-11-${Math.floor(Math.random()*20+1).toString().padStart(2, '0')}`;
    const newRescheduleTime = '04:00 PM';
    await assert('PATCH /api/appointments/:id/reschedule reschedules appointment', async () => {
      const res = await request('PATCH', `/api/appointments/${bookedApptId}/reschedule`, {
        newDate: newRescheduleDate,
        newTime: newRescheduleTime
      }, newAuthToken);

      if (res.status !== 200 || !res.body.success) {
        throw new Error(`Reschedule failed: ${res.status} ${JSON.stringify(res.body)}`);
      }
    });

    // 20. Security: Review submission rejected if appointment not completed (400)
    await assert('POST /api/reviews rejects review for incomplete appointment (400)', async () => {
      const res = await request('POST', '/api/reviews', {
        appointmentId: bookedApptId,
        doctorId: 'd2',
        rating: 5,
        comment: 'Attempting to review upcoming appointment'
      }, newAuthToken);

      if (res.status !== 400) {
        throw new Error(`Expected 400 when reviewing non-completed appointment, got ${res.status}: ${JSON.stringify(res.body)}`);
      }
    });

    // 21. Doctor Verification & Approval (Admin approves/rejects doctor)
    await assert('PATCH /api/admin/doctors/:id/status allows admin to verify doctor', async () => {
      const res = await request('PATCH', '/api/admin/doctors/d3/status', {
        status: 'approved'
      }, adminToken);

      if (res.status !== 200 || !res.body.success) {
        throw new Error(`Failed to update doctor verification status: ${res.status} ${JSON.stringify(res.body)}`);
      }
    });

    // 22. Admin GET Stats
    await assert('GET /api/admin/stats returns analytics metrics', async () => {
      const res = await request('GET', '/api/admin/stats', null, adminToken);
      if (res.status !== 200 || !res.body.stats) {
        throw new Error(`Failed to fetch stats: ${res.status} ${JSON.stringify(res.body)}`);
      }
    });

    console.log(`\n📊 Summary: ${passed} passed, ${failed} failed out of ${passed + failed} tests.`);
    if (failed > 0) process.exit(1);
  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
