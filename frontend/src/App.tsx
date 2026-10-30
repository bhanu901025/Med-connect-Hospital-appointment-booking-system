import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE, apiGet, apiPost, apiPut, apiPatch, apiDelete } from './api.js';

import { 
  Search, Star, MapPin, Clock, Calendar, User as UserIcon, Phone, 
  Stethoscope, Heart, Brain, Bone, Baby, Eye, Ear, 
  Activity, ChevronRight, ChevronLeft, X, Check, 
  CreditCard, Wallet, Banknote, LogOut, Menu, 
  LayoutDashboard, Users, FileText, DollarSign, TrendingUp,
  Video, Building2, ShieldCheck, Award, Timer, Sparkles,
  AlertCircle, Upload, File, CheckCircle2, XCircle, Clock3,
  Plus, Trash2, Edit3, Pill, ClipboardList, RefreshCw, Printer, Shield, UserCheck, MessageSquare, Briefcase, GraduationCap, Globe, Mail, Lock
} from 'lucide-react';

// Types
type Specialty = 'Cardiology' | 'Neurology' | 'Orthopedics' | 'Pediatrics' | 'Dermatology' | 'ENT' | 'General Medicine';
type AppointmentType = 'New' | 'Follow-up' | 'Video' | 'In-person';
type AppointmentStatus = 'upcoming' | 'completed' | 'cancelled' | 'pending';
type UserRole = 'patient' | 'doctor' | 'admin';

interface Doctor {
  id: string;
  name: string;
  specialty: Specialty;
  experience: number;
  rating: number;
  reviewsCount: number;
  hospital: string;
  fee: number;
  education: string;
  about: string;
  languages: string;
  location: string;
  availableToday: number;
  status?: 'pending' | 'approved' | 'rejected';
}

interface Appointment {
  id: string;
  doctorId: string;
  doctorName?: string;
  patientEmail: string;
  patientName: string;
  patientPhone?: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  type: AppointmentType;
  age: string;
  gender: string;
  problem: string;
  payment: string;
  fee: number;
  notes?: string;
  prescription?: string;
  rescheduleHistory?: any[];
}

interface Review {
  id: string;
  appointmentId: string;
  doctorId: string;
  patientEmail: string;
  patientName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface User {
  id?: string;
  _id?: string;
  email: string;
  role: UserRole;
  name: string;
  phone?: string;
  specialty?: string;
  hospital?: string;
  doctorId?: string;
  createdAt?: string;
}

interface AdminStats {
  totalPatients: number;
  totalDoctors: number;
  totalAppointments: number;
  appointmentsToday: number;
  totalRevenue: number;
  statusBreakdown: { upcoming: number; completed: number; cancelled: number; pending: number };
  specialtyDistribution: { name: string; count: number }[];
}

const DEFAULT_DOCTORS: Doctor[] = [
  { id: 'd1', name: 'Dr. Sarah Mitchell', specialty: 'Cardiology', experience: 14, rating: 4.8, reviewsCount: 1, hospital: 'Apollo Heart Center', fee: 1200, education: 'MD Cardiology, AIIMS Delhi', about: 'Leading cardiologist with expertise in interventional cardiology and heart failure management.', languages: 'English, Hindi', location: 'Delhi', availableToday: 5 },
  { id: 'd2', name: 'Dr. Rajiv Kapoor', specialty: 'Neurology', experience: 18, rating: 5.0, reviewsCount: 1, hospital: 'Fortis Neuro Sciences', fee: 1500, education: 'DM Neurology, PGI Chandigarh', about: 'Renowned neurologist specializing in stroke, epilepsy and neurodegenerative disorders.', languages: 'English, Hindi, Punjabi', location: 'Mumbai', availableToday: 3 },
  { id: 'd3', name: 'Dr. Ananya Desai', specialty: 'Dermatology', experience: 9, rating: 0, reviewsCount: 0, hospital: 'SkinCraft Clinic', fee: 800, education: 'MD Dermatology, KEM Mumbai', about: 'Expert in cosmetic dermatology and clinical skin disorders with international fellowships.', languages: 'English, Marathi', location: 'Mumbai', availableToday: 7 },
  { id: 'd4', name: 'Dr. Vikram Singh', specialty: 'Orthopedics', experience: 12, rating: 4.5, reviewsCount: 2, hospital: 'Max Bone & Joint', fee: 1000, education: 'MS Ortho, MAMC Delhi', about: 'Joint replacement specialist focused on minimally invasive knee and hip surgeries.', languages: 'English, Hindi', location: 'Delhi', availableToday: 4 },
  { id: 'd5', name: 'Dr. Priya Nair', specialty: 'Pediatrics', experience: 11, rating: 0, reviewsCount: 0, hospital: 'Rainbow Children Hospital', fee: 700, education: 'MD Pediatrics, CMC Vellore', about: 'Compassionate pediatrician dedicated to newborn care and child development.', languages: 'English, Malayalam, Hindi', location: 'Bangalore', availableToday: 8 },
  { id: 'd6', name: 'Dr. Arjun Mehta', specialty: 'ENT', experience: 10, rating: 0, reviewsCount: 0, hospital: 'ENT Care Plus', fee: 900, education: 'MS ENT, JIPMER', about: 'ENT surgeon with expertise in endoscopic sinus surgery and voice disorders.', languages: 'English, Hindi', location: 'Hyderabad', availableToday: 2 },
  { id: 'd7', name: 'Dr. Kavita Reddy', specialty: 'General Medicine', experience: 8, rating: 0, reviewsCount: 0, hospital: 'Apollo Clinics', fee: 600, education: 'MD Medicine, Osmania', about: 'Primary care physician with holistic approach to chronic disease management.', languages: 'English, Telugu', location: 'Hyderabad', availableToday: 10 }
];

const SPECIALTIES = [
  { name: 'Cardiology', icon: Heart, count: 124, color: 'bg-rose-50 text-rose-600' },
  { name: 'Neurology', icon: Brain, count: 89, color: 'bg-violet-50 text-violet-600' },
  { name: 'Orthopedics', icon: Bone, count: 112, color: 'bg-amber-50 text-amber-600' },
  { name: 'Pediatrics', icon: Baby, count: 156, color: 'bg-sky-50 text-sky-600' },
  { name: 'Dermatology', icon: Eye, count: 98, color: 'bg-emerald-50 text-emerald-600' },
  { name: 'ENT', icon: Ear, count: 67, color: 'bg-orange-50 text-orange-600' },
  { name: 'General Medicine', icon: Stethoscope, count: 203, color: 'bg-teal-50 text-teal-700' },
  { name: 'All Specialties', icon: Activity, count: 849, color: 'bg-slate-50 text-slate-700' },
];

const TIME_SLOTS = {
  morning: ['08:00 AM','08:30 AM','09:00 AM','09:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM'],
  afternoon: ['12:00 PM','12:30 PM','01:00 PM','01:30 PM','02:00 PM','02:30 PM','03:00 PM','03:30 PM'],
  evening: ['04:00 PM','04:30 PM','05:00 PM','05:30 PM','06:00 PM','06:30 PM','07:00 PM','07:30 PM']
};

function generateDates() {
  const dates = [];
  const today = new Date();
  for(let i=0;i<7;i++){
    const d = new Date(today);
    d.setDate(today.getDate()+i);
    dates.push({
      iso: d.toISOString().split('T')[0],
      day: d.toLocaleDateString('en-US',{weekday:'short'}),
      date: d.getDate(),
      month: d.toLocaleDateString('en-US',{month:'short'}),
      isToday: i===0,
      isTomorrow: i===1
    });
  }
  return dates;
}

function DoctorAvatar({name, size=52}:{name:string,size?:number}){
  const initials = name.split(' ').filter(w=>w.startsWith('Dr.')===false).slice(0,2).map(w=>w[0]).join('').toUpperCase() || name.slice(0,2).toUpperCase();
  let hash=0; for(let i=0;i<name.length;i++) hash = name.charCodeAt(i)+((hash<<5)-hash);
  const colors = [
    'from-[#0E7C8C] to-teal-700',
    'from-indigo-600 to-blue-700',
    'from-emerald-600 to-teal-700',
    'from-sky-600 to-cyan-700',
    'from-violet-600 to-purple-700',
    'from-slate-700 to-slate-900'
  ];
  const color = colors[Math.abs(hash)%colors.length];
  return (
    <div style={{width:size, height:size}} className={`rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold shrink-0 shadow-md`}>{initials}</div>
  );
}

export default function App(){
  const [page, setPage] = useState('landing');
  const [adminTab, setAdminTab] = useState<'assignments' | 'patients' | 'doctors' | 'stats'>('assignments');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string|null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login'|'signup'>('login');
  const [authRole, setAuthRole] = useState<UserRole>('patient');
  
  // Clean Auth Form State (NO HARDCODED DEMO HINTS OR PRE-FILLED CREDS)
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authSpecialty, setAuthSpecialty] = useState<Specialty>('General Medicine');
  const [authHospital, setAuthHospital] = useState('');
  const [authFee, setAuthFee] = useState('800');
  const [authExperience, setAuthExperience] = useState('5');
  const [authEducation, setAuthEducation] = useState('MBBS / MD');
  const [authLocation, setAuthLocation] = useState('Delhi');
  const [authAbout, setAuthAbout] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [user, setUser] = useState<User|null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>(DEFAULT_DOCTORS);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<User[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats|null>(null);
  const [toast, setToast] = useState<{msg:string,type:'success'|'error'|'info'}|null>(null);
  
  // Doctor Availability Modal
  const [updateAvailabilityModal, setUpdateAvailabilityModal] = useState(false);
  const [doctorSlotsForm, setDoctorSlotsForm] = useState({ availableToday: 5, fee: 800, hospital: '', about: '' });

  // Patient Review Modal
  const [reviewModal, setReviewModal] = useState<{ open: boolean; appt: Appointment | null; rating: number; comment: string }>({
    open: false,
    appt: null,
    rating: 5,
    comment: ''
  });
  const [fetchedReviews, setFetchedReviews] = useState<Review[]>([]);

  // Filters
  const [filters, setFilters] = useState({
    specialty: 'All',
    location: 'All',
    availability: 'All',
    rating: 0,
    feeMax: 3000
  });

  // Booking State
  const [bookingDate, setBookingDate] = useState(generateDates()[0].iso);
  const [bookingTime, setBookingTime] = useState<string|null>(null);
  const [patientForm, setPatientForm] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'In-person' as AppointmentType,
    age: '28',
    gender: 'Male',
    problem: '',
    payment: 'Paid via Card'
  });
  const [bookingSuccessModal, setBookingSuccessModal] = useState<any|null>(null);

  // Admin Add Doctor Form
  const [addDoctorModal, setAddDoctorModal] = useState(false);
  const [newDoctorForm, setNewDoctorForm] = useState({
    name: '',
    specialty: 'General Medicine' as Specialty,
    experience: 5,
    hospital: 'MedConnect Care Center',
    fee: 800,
    education: 'MBBS / MD',
    about: 'Experienced medical consultant.',
    location: 'Delhi',
    availableToday: 5
  });

  // Clinical Prescription Modal (Doctor Role)
  const [clinicalModal, setClinicalModal] = useState<{ open: boolean; appt: Appointment|null; notes: string; prescription: string }>({
    open: false,
    appt: null,
    notes: '',
    prescription: ''
  });

  // Reschedule Appointment Modal
  const [rescheduleModal, setRescheduleModal] = useState<{ open: boolean; appt: Appointment|null; newDate: string; newTime: string|null }>({
    open: false,
    appt: null,
    newDate: generateDates()[0].iso,
    newTime: null
  });

  // Patient appointments filter
  const [apptFilterStatus, setApptFilterStatus] = useState<'all'|'upcoming'|'completed'|'cancelled'>('all');

  const showToast = (msg: string, type: 'success'|'error'|'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Check stored user on load
  useEffect(() => {
    const savedToken = localStorage.getItem('medconnect_token');
    const savedUser = localStorage.getItem('medconnect_user');
    if (savedToken && savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setUser(u);
        setPatientForm(prev => ({ ...prev, name: u.name || '', email: u.email || '', phone: u.phone || '' }));
      } catch (e) {}
    }
    loadDoctors();
  }, []);

  // Sync user state to patient form & load role data
  useEffect(() => {
    if (user) {
      setPatientForm(prev => ({ ...prev, name: user.name || prev.name, email: user.email || prev.email, phone: user.phone || prev.phone }));
      loadAppointments(user);
      if (user.role === 'admin') {
        loadAdminData();
      }
    }
  }, [user]);

  // Load reviews when doctor modal opens
  useEffect(() => {
    if (selectedDoctorId) {
      apiGet(`/reviews/doctor/${selectedDoctorId}`).then(res => {
        if (res && res.reviews) setFetchedReviews(res.reviews);
        else setFetchedReviews([]);
      });
    }
  }, [selectedDoctorId]);

  const loadDoctors = async () => {
    const data = await apiGet('/doctors');
    if (Array.isArray(data) && data.length > 0) {
      setDoctors(data);
    }
  };

  const loadAppointments = async (currentUser: User) => {
    if (currentUser.role === 'patient') {
      const data = await apiGet(`/appointments/my/${currentUser.email}`);
      if (Array.isArray(data)) setAppointments(data);
    } else if (currentUser.role === 'doctor') {
      const docId = currentUser.doctorId || currentUser.id || 'd1';
      const data = await apiGet(`/appointments/doctor/${docId}`);
      if (Array.isArray(data)) setAppointments(data);
    } else if (currentUser.role === 'admin') {
      const data = await apiGet('/admin/assignments');
      if (data && data.assignments) setAppointments(data.assignments);
    }
  };

  const loadAdminData = async () => {
    const statsRes = await apiGet('/admin/stats');
    if (statsRes && statsRes.stats) setAdminStats(statsRes.stats);

    const patientsRes = await apiGet('/admin/patients');
    if (patientsRes && patientsRes.patients) setPatients(patientsRes.patients);

    const assignRes = await apiGet('/admin/assignments');
    if (assignRes && assignRes.assignments) setAppointments(assignRes.assignments);
  };

  const openAuthModal = (role: UserRole = 'patient', mode: 'login'|'signup' = 'login') => {
    setAuthRole(role);
    setAuthMode(mode);
    setAuthEmail('');
    setAuthPassword('');
    setAuthName('');
    setAuthPhone('');
    setAuthHospital('');
    setAuthFee('800');
    setAuthExperience('5');
    setAuthEducation('MBBS / MD');
    setAuthLocation('Delhi');
    setAuthAbout('');
    setShowAuthModal(true);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);

    if (authMode === 'login') {
      const res = await apiPost('/auth/login', { email: authEmail, password: authPassword });
      setAuthLoading(false);
      if (res.success && res.user && res.token) {
        localStorage.setItem('medconnect_token', res.token);
        localStorage.setItem('medconnect_user', JSON.stringify(res.user));
        setUser(res.user);
        setShowAuthModal(false);
        showToast(`Welcome back, ${res.user.name}!`, 'success');
        if (res.user.role === 'admin') setPage('adminDashboard');
        else if (res.user.role === 'doctor') setPage('doctorDashboard');
        else setPage('patientDashboard');
      } else {
        showToast(res.error || 'Authentication failed. Please check credentials.', 'error');
      }
    } else {
      // Registration
      if (authRole === 'admin') {
        setAuthLoading(false);
        showToast('Public registration for admin role is prohibited. Please sign in.', 'error');
        return;
      }

      const formattedName = authRole === 'doctor' ? (authName.startsWith('Dr.') ? authName : `Dr. ${authName}`) : authName;

      const res = await apiPost('/auth/register', {
        name: formattedName,
        email: authEmail,
        password: authPassword,
        role: authRole,
        phone: authPhone,
        specialty: authSpecialty,
        hospital: authHospital || 'MedConnect Healthcare Center',
        fee: Number(authFee) || 800,
        experience: Number(authExperience) || 5,
        education: authEducation || 'MBBS / MD',
        location: authLocation || 'Delhi',
        about: authAbout || `${formattedName} is a dedicated healthcare specialist.`
      });
      setAuthLoading(false);

      if (res.success && res.user && res.token) {
        localStorage.setItem('medconnect_token', res.token);
        localStorage.setItem('medconnect_user', JSON.stringify(res.user));
        setUser(res.user);
        setShowAuthModal(false);
        showToast(`Account created successfully! Welcome ${res.user.name}`, 'success');
        loadDoctors();
        if (res.user.role === 'doctor') setPage('doctorDashboard');
        else setPage('patientDashboard');
      } else {
        showToast(res.error || 'Registration failed', 'error');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('medconnect_token');
    localStorage.removeItem('medconnect_user');
    setUser(null);
    setPage('landing');
    showToast('Logged out successfully', 'info');
  };

  // Filter Doctors
  const filteredDoctors = useMemo(() => {
    return doctors.filter(doc => {
      if (filters.specialty !== 'All' && filters.specialty !== 'All Specialties' && doc.specialty !== filters.specialty) return false;
      if (filters.location !== 'All' && !doc.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
      if (filters.rating > 0 && doc.rating < filters.rating) return false;
      if (doc.fee > filters.feeMax) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchName = doc.name.toLowerCase().includes(q);
        const matchSpec = doc.specialty.toLowerCase().includes(q);
        const matchHosp = doc.hospital && doc.hospital.toLowerCase().includes(q);
        if (!matchName && !matchSpec && !matchHosp) return false;
      }
      return true;
    });
  }, [doctors, filters, searchQuery]);

  const selectedDoctor = useMemo(() => {
    return doctors.find(d => d.id === selectedDoctorId) || null;
  }, [doctors, selectedDoctorId]);

  const isSlotBooked = (docId: string, date: string, time: string) => {
    return appointments.some(a => a.doctorId === docId && a.date === date && a.time === time && a.status !== 'cancelled');
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Please sign in or create an account to book an appointment', 'info');
      openAuthModal('patient', 'login');
      return;
    }

    if (!selectedDoctor || !bookingTime) {
      showToast('Please select a doctor and time slot', 'error');
      return;
    }

    if (!patientForm.email || !patientForm.name) {
      showToast('Patient name and email are required', 'error');
      return;
    }

    const payload = {
      doctorId: selectedDoctor.id,
      date: bookingDate,
      time: bookingTime,
      patientEmail: patientForm.email,
      patientName: patientForm.name,
      patientPhone: patientForm.phone,
      type: patientForm.type,
      age: patientForm.age,
      gender: patientForm.gender,
      problem: patientForm.problem || 'General Medical Consultation',
      fee: selectedDoctor.fee,
      payment: patientForm.payment
    };

    const res = await apiPost('/appointments/book', payload);
    if (res.success && res.data) {
      setBookingSuccessModal(res.data);
      setSelectedDoctorId(null);
      setBookingTime(null);
      showToast('Appointment booked successfully!', 'success');
      if (user) loadAppointments(user);
    } else {
      showToast(res.error || 'Failed to book appointment', 'error');
    }
  };

  const handleCancelAppointment = async (apptId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    const res = await apiPatch(`/appointments/${apptId}/cancel`, {});
    if (res.success) {
      showToast('Appointment cancelled', 'info');
      if (user) loadAppointments(user);
    } else {
      showToast(res.error || 'Could not cancel appointment', 'error');
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleModal.appt || !rescheduleModal.newTime) {
      showToast('Please select a new appointment time slot', 'error');
      return;
    }

    const res = await apiPatch(`/appointments/${rescheduleModal.appt.id}/reschedule`, {
      newDate: rescheduleModal.newDate,
      newTime: rescheduleModal.newTime
    });

    if (res.success) {
      showToast('Appointment rescheduled successfully!', 'success');
      setRescheduleModal({ open: false, appt: null, newDate: generateDates()[0].iso, newTime: null });
      if (user) loadAppointments(user);
    } else {
      showToast(res.error || 'Failed to reschedule appointment', 'error');
    }
  };

  const handleUpdateDoctorStatus = async (docId: string, status: 'approved' | 'rejected' | 'pending') => {
    const res = await apiPatch(`/admin/doctors/${docId}/status`, { status });
    if (res.success) {
      showToast(`Doctor verification updated to ${status}`, 'success');
      loadDoctors();
      if (user?.role === 'admin') loadAdminData();
    } else {
      showToast(res.error || 'Failed to update doctor verification status', 'error');
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModal.appt) return;

    const res = await apiPost('/reviews', {
      appointmentId: reviewModal.appt.id,
      doctorId: reviewModal.appt.doctorId,
      rating: reviewModal.rating,
      comment: reviewModal.comment
    });

    if (res.success) {
      showToast('Thank you for your feedback! Review posted.', 'success');
      setReviewModal({ open: false, appt: null, rating: 5, comment: '' });
      loadDoctors();
      if (user) loadAppointments(user);
    } else {
      showToast(res.error || 'Failed to submit review', 'error');
    }
  };

  const handleAddDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiPost('/doctors', newDoctorForm);
    if (res.success && res.data) {
      showToast('Doctor profile added successfully!', 'success');
      setAddDoctorModal(false);
      loadDoctors();
      if (user?.role === 'admin') loadAdminData();
    } else {
      showToast(res.error || 'Failed to add doctor', 'error');
    }
  };

  const handleDeleteDoctor = async (docId: string) => {
    if (!confirm('Are you sure you want to remove this doctor from system?')) return;
    const res = await apiDelete(`/doctors/${docId}`);
    if (res.success) {
      showToast('Doctor removed successfully', 'success');
      loadDoctors();
      if (user?.role === 'admin') loadAdminData();
    } else {
      showToast(res.error || 'Failed to delete doctor', 'error');
    }
  };

  const updateApptStatus = async (id: string, status: AppointmentStatus) => {
    const res = await apiPatch(`/appointments/${id}/status`, { status });
    if (res.success) {
      showToast(`Appointment status changed to ${status}`, 'success');
      if (user) loadAppointments(user);
    }
  };

  const handleSaveClinicalNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicalModal.appt) return;

    const res = await apiPatch(`/appointments/${clinicalModal.appt.id}/clinical`, {
      notes: clinicalModal.notes,
      prescription: clinicalModal.prescription
    });

    if (res.success) {
      showToast('Prescription and clinical notes saved successfully!', 'success');
      setClinicalModal({ open: false, appt: null, notes: '', prescription: '' });
      if (user) loadAppointments(user);
    } else {
      showToast(res.error || 'Failed to save clinical notes', 'error');
    }
  };

  const patientAppointmentsFiltered = appointments.filter(a => {
    if (apptFilterStatus === 'all') return true;
    return a.status === apptFilterStatus;
  });

  const doctorTodayAppts = appointments.filter(a => user?.role === 'doctor' ? (user.doctorId ? a.doctorId === user.doctorId : true) : true);

  return (
    <div className="min-h-screen bg-[#FBFCFD] text-slate-800 antialiased selection:bg-[#0E7C8C]/20 overflow-x-hidden flex flex-col font-sans">

      {/* NAVBAR */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/95 border-b border-slate-200/80 shadow-sm">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 h-[74px] flex items-center justify-between">
          
          {/* Logo / Branding */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setPage('landing')}>
            <div className="h-10.5 w-10.5 rounded-2xl bg-gradient-to-tr from-[#0E7C8C] to-[#15B0C7] flex items-center justify-center text-white shadow-md shadow-[#0E7C8C]/20">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900 block leading-tight">Med connect</span>
              <span className="text-[10px] font-bold text-slate-500 tracking-tight block uppercase">Hospital appointment booking system</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-7 text-sm font-bold text-slate-600">
            <button onClick={() => setPage('landing')} className={`hover:text-[#0E7C8C] transition-colors ${page === 'landing' ? 'text-[#0E7C8C]' : ''}`}>Find Doctors</button>
            <button onClick={() => { setFilters({ ...filters, specialty: 'Cardiology' }); setPage('landing'); }} className="hover:text-[#0E7C8C] transition-colors">Cardiology</button>
            <button onClick={() => { setFilters({ ...filters, specialty: 'Neurology' }); setPage('landing'); }} className="hover:text-[#0E7C8C] transition-colors">Neurology</button>
            <button onClick={() => { setFilters({ ...filters, specialty: 'Pediatrics' }); setPage('landing'); }} className="hover:text-[#0E7C8C] transition-colors">Pediatrics</button>
          </div>

          {/* Role Auth Controls */}
          <div className="flex items-center gap-2.5">
            {user ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    if (user.role === 'patient') setPage('patientDashboard');
                    else if (user.role === 'doctor') setPage('doctorDashboard');
                    else setPage('adminDashboard');
                  }} 
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all text-xs font-bold text-slate-700 border border-slate-200/80 cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 text-[#0E7C8C]" />
                  <span>{user.name}</span>
                  <span className="px-2 py-0.5 rounded-md bg-white text-[10px] uppercase font-black text-[#0E7C8C] border border-slate-200">{user.role}</span>
                </button>
                <button onClick={handleLogout} className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer" title="Logout">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => openAuthModal('patient', 'login')}
                  className="px-4 py-2.5 rounded-xl bg-[#0E7C8C] text-white font-bold text-xs shadow-md shadow-[#0E7C8C]/20 hover:bg-[#0A626F] transition-all cursor-pointer"
                >
                  Patient Sign In
                </button>
                <button 
                  onClick={() => openAuthModal('doctor', 'login')}
                  className="px-3.5 py-2.5 rounded-xl bg-teal-50 text-[#0E7C8C] font-bold text-xs hover:bg-teal-100 border border-teal-200/80 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Stethoscope className="w-3.5 h-3.5" /> Doctor Portal
                </button>
                <button 
                  onClick={() => openAuthModal('admin', 'login')}
                  className="hidden lg:flex items-center gap-1 px-3 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-600" /> Admin
                </button>
              </div>
            )}

            <button className="md:hidden p-2 text-slate-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-bottom-5 duration-200 ${
          toast.type === 'success' ? 'bg-slate-900 text-emerald-400 border-emerald-500/30' :
          toast.type === 'error' ? 'bg-slate-900 text-rose-400 border-rose-500/30' : 'bg-slate-900 text-teal-300 border-teal-500/30'
        }`}>
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
          {toast.type === 'info' && <Clock className="w-4 h-4 text-teal-400" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1">
        
        {/* LANDING / DOCTOR SEARCH PAGE */}
        {page === 'landing' && (
          <div>
            {/* HERO SECTION */}
            <section className="relative overflow-hidden bg-gradient-to-b from-[#EBF5F7] via-[#FBFCFD] to-[#FBFCFD] pt-14 pb-16">
              <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto space-y-4">
                  <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-100/80 text-[#0E7C8C] text-xs font-extrabold tracking-wide uppercase">
                    <Sparkles className="w-3.5 h-3.5" /> Healthcare Appointment System
                  </span>
                  <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                    Find & Book Top Hospital Doctors <br />
                    <span className="bg-gradient-to-r from-[#0E7C8C] via-teal-700 to-cyan-600 bg-clip-text text-transparent">Instant Online Slot Booking</span>
                  </h1>
                  <p className="text-slate-600 text-sm sm:text-base font-medium">
                    Search verified medical specialists, check live consultation availability, and schedule appointments instantly.
                  </p>

                  {/* Search Bar */}
                  <div className="pt-4 max-w-2xl mx-auto">
                    <div className="bg-white rounded-2xl p-2 shadow-xl shadow-slate-200/70 border border-slate-200 flex items-center gap-2">
                      <div className="flex items-center gap-2.5 pl-3.5 flex-1 text-slate-400">
                        <Search className="w-5 h-5 text-[#0E7C8C]" />
                        <input 
                          type="text"
                          placeholder="Search doctor by name, specialty or hospital center..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="w-full text-slate-900 placeholder-slate-400 text-sm outline-none font-semibold bg-transparent"
                        />
                      </div>
                      <button 
                        onClick={() => {}} 
                        className="px-6 py-3 rounded-xl bg-[#0E7C8C] text-white font-bold text-xs hover:bg-[#0A626F] transition-all shadow-md shadow-[#0E7C8C]/20 cursor-pointer"
                      >
                        Search Doctors
                      </button>
                    </div>
                  </div>
                </div>

                {/* Specialty Categories Grid */}
                <div className="mt-14">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-extrabold text-slate-900">Explore Specialties</h2>
                    <span className="text-slate-500 text-xs font-bold">{doctors.length} Doctors Available</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                    {SPECIALTIES.map(s => {
                      const Icon = s.icon;
                      const isSelected = filters.specialty === s.name;
                      return (
                        <button
                          key={s.name}
                          onClick={() => setFilters({ ...filters, specialty: s.name })}
                          className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 cursor-pointer ${
                            isSelected 
                              ? 'bg-[#0E7C8C] text-white border-[#0E7C8C] shadow-lg shadow-[#0E7C8C]/25 scale-[1.03]' 
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
                          }`}
                        >
                          <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-white/20 text-white' : s.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-bold line-clamp-1">{s.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            {/* DOCTOR LISTINGS SECTION */}
            <section className="py-10 mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Hospital Doctors Directory ({filteredDoctors.length})</h2>
                  <p className="text-slate-500 text-xs font-medium mt-0.5">Click any doctor card to inspect qualification details and book time slots</p>
                </div>
                {filters.specialty !== 'All' && (
                  <button 
                    onClick={() => setFilters({ ...filters, specialty: 'All' })}
                    className="text-xs text-[#0E7C8C] font-bold hover:underline"
                  >
                    Show All Specialties
                  </button>
                )}
              </div>

              {filteredDoctors.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
                  <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">No doctors match your search</h3>
                  <p className="text-slate-500 text-xs mt-1">Try searching another medical specialty or keyword.</p>
                  <button onClick={() => { setSearchQuery(''); setFilters({ specialty: 'All', location: 'All', availability: 'All', rating: 0, feeMax: 3000 }); }} className="mt-4 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">
                    Clear Search Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredDoctors.map(doc => (
                    <div 
                      key={doc.id}
                      className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between group"
                    >
                      <div>
                        {/* Doctor Header */}
                        <div className="flex items-start gap-4">
                          <DoctorAvatar name={doc.name} size={56} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h3 className="font-extrabold text-slate-900 text-base truncate group-hover:text-[#0E7C8C] transition-colors">{doc.name}</h3>
                              {doc.reviewsCount > 0 ? (
                                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-xs font-black shrink-0">
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  <span>{doc.rating}</span>
                                  <span className="text-[10px] text-slate-400 font-bold">({doc.reviewsCount})</span>
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">New Consultant</span>
                              )}
                            </div>
                            <p className="text-xs font-bold text-[#0E7C8C] mt-0.5">{doc.specialty}</p>
                            <p className="text-slate-500 text-xs mt-0.5 truncate font-medium">{doc.hospital}</p>
                          </div>
                        </div>

                        {/* Rich Profile Metrics */}
                        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                            <span>{doc.experience} Yrs Experience</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{doc.location}</span>
                          </div>
                        </div>

                        <div className="mt-2.5 text-xs text-slate-500 flex items-center gap-1.5 truncate">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate font-medium">{doc.education}</span>
                        </div>

                        <div className="mt-3 p-2.5 rounded-xl bg-teal-50/70 text-teal-900 text-xs flex items-center justify-between font-bold">
                          <span>Slots Open Today:</span>
                          <span className="text-[#0E7C8C] font-black">{doc.availableToday} slots</span>
                        </div>
                      </div>

                      {/* Footer Action */}
                      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Consultation Fee</span>
                          <span className="text-base font-black text-slate-900">₹{doc.fee}</span>
                        </div>
                        <button 
                          onClick={() => setSelectedDoctorId(doc.id)}
                          className="px-4 py-2.5 rounded-xl bg-[#0E7C8C] text-white text-xs font-bold hover:bg-[#0A626F] transition-all flex items-center gap-1.5 shadow-sm shadow-[#0E7C8C]/20 cursor-pointer"
                        >
                          Book Appointment <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* PATIENT DASHBOARD */}
        {page === 'patientDashboard' && user && (
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Patient Dashboard & Appointments</h1>
                <p className="text-slate-500 text-xs mt-1 font-medium">Logged in as {user.name} ({user.email})</p>
              </div>
              
              {/* Status Filter Tabs */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-bold text-slate-600">
                {(['all', 'upcoming', 'completed', 'cancelled'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setApptFilterStatus(st)}
                    className={`px-3.5 py-1.5 rounded-xl capitalize transition-all cursor-pointer ${apptFilterStatus === st ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {patientAppointmentsFiltered.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No {apptFilterStatus} appointments recorded</h3>
                <p className="text-slate-500 text-xs mt-1">You can browse available doctors and book consultation slots online.</p>
                <button onClick={() => setPage('landing')} className="mt-4 px-5 py-2.5 rounded-xl bg-[#0E7C8C] text-white font-bold text-xs hover:bg-[#0A626F]">
                  Book New Appointment
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {patientAppointmentsFiltered.map(appt => (
                  <div key={appt.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3.5 rounded-2xl bg-teal-50 text-[#0E7C8C] font-bold">
                        <Stethoscope className="w-6.5 h-6.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-slate-900 text-base">{appt.doctorName || 'Specialist Doctor'}</h3>
                          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            appt.status === 'upcoming' ? 'bg-teal-100 text-teal-800' :
                            appt.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {appt.status}
                          </span>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-slate-600 font-medium">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /> <strong className="text-slate-900 font-bold">{appt.date} at {appt.time}</strong></span>
                          <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5 text-slate-400" /> Mode: {appt.type}</span>
                          <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5 text-slate-400" /> Fee: ₹{appt.fee} ({appt.payment})</span>
                        </div>

                        <p className="text-slate-600 text-xs font-medium mt-2">Chief Complaint: {appt.problem}</p>
                        
                        {/* Prescription details */}
                        {appt.prescription && (
                          <div className="mt-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs">
                            <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                              <Pill className="w-4 h-4 text-emerald-600" /> Prescription & Advice:
                            </p>
                            <p className="mt-1 text-slate-800 font-mono text-[11.5px] whitespace-pre-wrap">{appt.prescription}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0">
                      {appt.status === 'completed' && (
                        <button 
                          onClick={() => setReviewModal({ open: true, appt, rating: 5, comment: '' })}
                          className="px-4 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Rate & Review Doctor
                        </button>
                      )}

                      {appt.status === 'upcoming' && (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setRescheduleModal({ open: true, appt, newDate: generateDates()[0].iso, newTime: null })}
                            className="px-3.5 py-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5 text-teal-600" /> Reschedule
                          </button>
                          <button 
                            onClick={() => handleCancelAppointment(appt.id)}
                            className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold cursor-pointer"
                          >
                            Cancel Booking
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DOCTOR DASHBOARD */}
        {page === 'doctorDashboard' && user && (
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-10">
            
            {/* Doctor Profile Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-6 text-white mb-8 border border-teal-800/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <DoctorAvatar name={user.name} size={64} />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-white">{user.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[11px] font-bold">
                      {user.specialty || 'General Specialist'}
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs mt-1 font-medium">{user.hospital || 'MedConnect Care Center'}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-teal-200/90 font-medium">
                    <span>Available Slots Today: <strong className="text-teal-300 font-bold">{doctors.find(d => d.id === user.doctorId || d.id === user.id || d.name === user.name)?.availableToday ?? 5} slots</strong></span>
                    <span>•</span>
                    <span>Consultation Fee: <strong className="text-teal-300 font-bold">₹{doctors.find(d => d.id === user.doctorId || d.id === user.id || d.name === user.name)?.fee ?? 800}</strong></span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => {
                  const doc = doctors.find(d => d.id === user.doctorId || d.id === user.id || d.name === user.name) || doctors[0];
                  setDoctorSlotsForm({
                    availableToday: doc ? doc.availableToday : 5,
                    fee: doc ? doc.fee : 800,
                    hospital: doc ? doc.hospital : user.hospital || '',
                    about: doc ? doc.about : ''
                  });
                  setUpdateAvailabilityModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all cursor-pointer"
              >
                <Clock className="w-4 h-4" /> Update Availability & Fee
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-slate-800">Patient Appointments Queue</h2>
                <button onClick={() => loadAppointments(user)} className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Queue
                </button>
              </div>

              {doctorTodayAppts.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center border border-slate-200">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-600 text-sm font-semibold">No patient appointments queued</p>
                </div>
              ) : (
                doctorTodayAppts.map(appt => (
                  <div key={appt.id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-2xl bg-teal-50 text-teal-700">
                        <UserIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-base">{appt.patientName}</h3>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {appt.gender}, {appt.age} yrs
                          </span>
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            appt.status === 'upcoming' ? 'bg-teal-100 text-teal-800' :
                            appt.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {appt.status}
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs mt-1">
                          Slot: <strong className="text-slate-700">{appt.date} at {appt.time}</strong> ({appt.type})
                        </p>
                        <p className="text-slate-600 text-xs font-medium mt-1">Chief Complaint: {appt.problem}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0">
                      <button 
                        onClick={() => setClinicalModal({ open: true, appt, notes: appt.notes || '', prescription: appt.prescription || '' })}
                        className="px-4 py-2 rounded-xl bg-[#0E7C8C] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#0A626F] transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Write Prescription
                      </button>

                      {appt.status !== 'completed' && (
                        <button 
                          onClick={() => updateApptStatus(appt.id, 'completed')}
                          className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold cursor-pointer"
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ADMIN DASHBOARD */}
        {page === 'adminDashboard' && user && user.role === 'admin' && (
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Hospital Administration Portal</h1>
                <p className="text-slate-500 text-xs mt-1 font-medium">Logged in as Administrator: {user.name} ({user.email})</p>
              </div>

              {/* Admin Navigation Tabs */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-bold text-slate-600">
                <button 
                  onClick={() => setAdminTab('assignments')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${adminTab === 'assignments' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
                >
                  Doctor-Patient Assignments
                </button>
                <button 
                  onClick={() => setAdminTab('patients')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${adminTab === 'patients' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
                >
                  Registered Patients
                </button>
                <button 
                  onClick={() => setAdminTab('doctors')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${adminTab === 'doctors' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
                >
                  Doctors Directory
                </button>
                <button 
                  onClick={() => setAdminTab('stats')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${adminTab === 'stats' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
                >
                  Analytics & Stats
                </button>
              </div>
            </div>

            {/* TAB 1: Doctor-Patient Assignments */}
            {adminTab === 'assignments' && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Master Doctor-Patient Assignments</h2>
                    <p className="text-slate-500 text-xs mt-0.5">Overview of assigned doctors and patient booking records</p>
                  </div>
                  <button onClick={() => loadAdminData()} className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh List
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 uppercase text-[10px] font-extrabold text-slate-400 tracking-wider">
                      <tr>
                        <th className="p-4">Appt ID</th>
                        <th className="p-4">Patient Details</th>
                        <th className="p-4">Assigned Doctor</th>
                        <th className="p-4">Date & Time</th>
                        <th className="p-4">Fee</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {appointments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">No doctor-patient assignments recorded yet.</td>
                        </tr>
                      ) : (
                        appointments.map(a => (
                          <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-4 font-mono font-bold text-slate-900">{a.id}</td>
                            <td className="p-4">
                              <p className="font-bold text-slate-900">{a.patientName}</p>
                              <p className="text-slate-400 text-[11px]">{a.patientEmail}</p>
                            </td>
                            <td className="p-4">
                              <p className="font-bold text-[#0E7C8C]">{a.doctorName || 'Specialist'}</p>
                              <p className="text-slate-400 text-[11px]">ID: {a.doctorId}</p>
                            </td>
                            <td className="p-4">
                              <p className="font-bold text-slate-800">{a.date}</p>
                              <p className="text-slate-400 text-[11px]">{a.time}</p>
                            </td>
                            <td className="p-4 font-bold text-slate-900">₹{a.fee}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                a.status === 'upcoming' ? 'bg-teal-100 text-teal-800' :
                                a.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {a.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              {a.status !== 'cancelled' && (
                                <button 
                                  onClick={() => handleCancelAppointment(a.id)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-[11px] font-bold cursor-pointer"
                                >
                                  Cancel Appt
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: Registered Patients */}
            {adminTab === 'patients' && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-900">Registered Patient Directory</h2>
                  <p className="text-slate-500 text-xs mt-0.5">List of registered patient user accounts</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 uppercase text-[10px] font-extrabold text-slate-400 tracking-wider">
                      <tr>
                        <th className="p-4">Patient Name</th>
                        <th className="p-4">Email Address</th>
                        <th className="p-4">Phone Number</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Joined Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {patients.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400">No patient accounts found.</td>
                        </tr>
                      ) : (
                        patients.map(p => (
                          <tr key={p.email} className="hover:bg-slate-50/80">
                            <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                              <UserIcon className="w-4 h-4 text-[#0E7C8C]" /> {p.name}
                            </td>
                            <td className="p-4 text-slate-600">{p.email}</td>
                            <td className="p-4 text-slate-600">{p.phone || 'N/A'}</td>
                            <td className="p-4">
                              <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 font-bold uppercase text-[10px]">
                                {p.role}
                              </span>
                            </td>
                            <td className="p-4 text-slate-400 text-[11px]">
                              {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Active'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: Doctors Directory Management */}
            {adminTab === 'doctors' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Hospital Doctors Management</h2>
                    <p className="text-slate-500 text-xs">Add new doctor profiles or manage current hospital consultants</p>
                  </div>
                  <button 
                    onClick={() => setAddDoctorModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#0E7C8C] text-white text-xs font-bold hover:bg-[#0A626F] flex items-center gap-1.5 shadow-md shadow-[#0E7C8C]/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Doctor Profile
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {doctors.map(doc => (
                    <div key={doc.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-start gap-4">
                          <DoctorAvatar name={doc.name} size={50} />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-900 text-base">{doc.name}</h3>
                            <p className="text-xs font-semibold text-[#0E7C8C]">{doc.specialty}</p>
                            <p className="text-slate-500 text-xs truncate">{doc.hospital}</p>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 text-xs space-y-1 text-slate-600">
                          <p>Experience: <strong className="text-slate-800">{doc.experience} Years</strong></p>
                          <p>Fee: <strong className="text-slate-800">₹{doc.fee}</strong></p>
                          <p>Location: <strong className="text-slate-800">{doc.location}</strong></p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          (doc.status || 'approved') === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          (doc.status === 'pending') ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {doc.status || 'approved'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {(doc.status === 'pending' || doc.status === 'rejected') && (
                            <button
                              onClick={() => handleUpdateDoctorStatus(doc.id, 'approved')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          {doc.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateDoctorStatus(doc.id, 'rejected')}
                              className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-[11px] font-bold cursor-pointer"
                            >
                              Reject
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteDoctor(doc.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: Analytics Stats */}
            {adminTab === 'stats' && adminStats && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase">Total Registered Patients</p>
                    <p className="text-3xl font-black text-slate-900 mt-1">{adminStats.totalPatients}</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase">Total Active Doctors</p>
                    <p className="text-3xl font-black text-slate-900 mt-1">{adminStats.totalDoctors}</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase">Total Appointments</p>
                    <p className="text-3xl font-black text-slate-900 mt-1">{adminStats.totalAppointments}</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase">Total Booking Revenue</p>
                    <p className="text-3xl font-black text-emerald-600 mt-1">₹{adminStats.totalRevenue}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* DOCTOR DETAILS & RICH PROFILE MODAL */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0E7C8C] to-teal-800 p-6 text-white rounded-t-3xl relative">
              <button 
                onClick={() => setSelectedDoctorId(null)}
                className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4">
                <DoctorAvatar name={selectedDoctor.name} size={64} />
                <div>
                  <h2 className="text-2xl font-black text-white">{selectedDoctor.name}</h2>
                  <p className="text-teal-100 text-xs font-bold">{selectedDoctor.specialty} • {selectedDoctor.education}</p>
                  <p className="text-teal-200 text-xs mt-0.5 font-medium">{selectedDoctor.hospital} ({selectedDoctor.location})</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Rich Doctor Profile Info */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1">About Doctor</h4>
                  <p className="text-slate-600 text-xs leading-relaxed font-medium">{selectedDoctor.about || 'Specialized medical consultant.'}</p>
                </div>

                <div className="pt-3 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Consultation Fee</span>
                    <strong className="text-slate-900 font-extrabold text-sm">₹{selectedDoctor.fee}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Clinical Experience</span>
                    <strong className="text-slate-900 font-extrabold text-sm">{selectedDoctor.experience} Years</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Languages Spoken</span>
                    <strong className="text-slate-900 font-extrabold text-xs">{selectedDoctor.languages}</strong>
                  </div>
                </div>
              </div>

              {/* REAL Patient Reviews Section */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> Patient Reviews & Feedback ({fetchedReviews.length})
                </h4>
                {fetchedReviews.length === 0 ? (
                  <p className="text-slate-400 text-xs italic bg-slate-50 p-3 rounded-xl border border-slate-200/60">No patient reviews submitted yet for this doctor. Be the first to rate your experience after consultation!</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {fetchedReviews.map(rev => (
                      <div key={rev.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-800">{rev.patientName}</span>
                          <div className="flex items-center gap-1 text-amber-500 font-bold text-[11px]">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {rev.rating} / 5
                          </div>
                        </div>
                        <p className="text-slate-600 font-medium">{rev.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* BOOKING FORM */}
              <form onSubmit={handleBookingSubmit} className="space-y-4 pt-2 border-t border-slate-200">
                <h4 className="font-extrabold text-slate-900 text-base">Select Date & Available Time Slot</h4>

                {/* Date Selector */}
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {generateDates().map(d => {
                    const isSelected = bookingDate === d.iso;
                    return (
                      <button
                        key={d.iso}
                        type="button"
                        onClick={() => setBookingDate(d.iso)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-[#0E7C8C] text-white border-[#0E7C8C] font-bold shadow-md' 
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span className="text-[10px] uppercase block font-semibold">{d.day}</span>
                        <span className="text-base font-black block">{d.date}</span>
                        <span className="text-[10px] block">{d.month}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Time Slots Selector */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">Open Time Slots</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                    {Object.values(TIME_SLOTS).flat().map(t => {
                      const booked = isSlotBooked(selectedDoctor.id, bookingDate, t);
                      const isSelected = bookingTime === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          disabled={booked}
                          onClick={() => setBookingTime(t)}
                          className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            booked 
                              ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed line-through' 
                              : isSelected 
                                ? 'bg-[#0E7C8C] text-white border-[#0E7C8C] shadow-sm' 
                                : 'bg-white hover:bg-teal-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {t} {booked ? '(Booked)' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Patient Information Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Patient Full Name</label>
                    <input 
                      type="text" required
                      value={patientForm.name}
                      onChange={e => setPatientForm({ ...patientForm, name: e.target.value })}
                      placeholder="Enter patient full name"
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#0E7C8C]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Patient Email Address</label>
                    <input 
                      type="email" required
                      value={patientForm.email}
                      onChange={e => setPatientForm({ ...patientForm, email: e.target.value })}
                      placeholder="Enter patient email address"
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#0E7C8C]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Chief Medical Complaint / Problem</label>
                  <input 
                    type="text" required
                    value={patientForm.problem}
                    onChange={e => setPatientForm({ ...patientForm, problem: e.target.value })}
                    placeholder="Describe symptoms or reason for medical consultation..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#0E7C8C]"
                  />
                </div>

                <div className="pt-3 flex items-center justify-between border-t border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Consultation Fee</span>
                    <span className="text-lg font-black text-slate-900">₹{selectedDoctor.fee}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setSelectedDoctorId(null)} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
                      Cancel
                    </button>
                    <button type="submit" className="px-6 py-2.5 rounded-xl bg-[#0E7C8C] text-white text-xs font-bold hover:bg-[#0A626F] transition-all shadow-md cursor-pointer">
                      Confirm Appointment Booking
                    </button>
                  </div>
                </div>

              </form>
            </div>
          </div>
        </div>
      )}

      {/* INSTANT BOOKING CONFIRMATION MODAL */}
      {bookingSuccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Appointment Confirmed!</h3>
            <p className="text-slate-500 text-xs mt-1">Your consultation appointment is booked successfully.</p>

            <div className="my-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
              <p>Reference ID: <strong className="font-mono text-slate-900 font-bold">{bookingSuccessModal.id}</strong></p>
              <p>Doctor: <strong className="text-slate-900 font-bold">{bookingSuccessModal.doctorName}</strong></p>
              <p>Date & Time: <strong className="text-[#0E7C8C] font-bold">{bookingSuccessModal.date} at {bookingSuccessModal.time}</strong></p>
              <p>Patient: <strong className="text-slate-900 font-bold">{bookingSuccessModal.patientName}</strong> ({bookingSuccessModal.patientEmail})</p>
              <p>Fee: <strong className="text-slate-900 font-bold">₹{bookingSuccessModal.fee}</strong> ({bookingSuccessModal.payment})</p>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => { setBookingSuccessModal(null); setPage('patientDashboard'); }}
                className="w-full py-3 rounded-xl bg-[#0E7C8C] text-white font-bold text-xs hover:bg-[#0A626F] cursor-pointer"
              >
                View My Appointments Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTHENTICATION MODAL (ROLE SELECTOR: PATIENT / DOCTOR / ADMIN) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] max-w-lg w-full p-5 sm:p-7 border border-slate-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0E7C8C] to-teal-700 text-white flex items-center justify-center shadow-md shadow-teal-500/20 shrink-0">
                  {authRole === 'doctor' ? <Stethoscope className="w-5 h-5" /> : authRole === 'admin' ? <ShieldCheck className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                    {authMode === 'login' 
                      ? `${authRole === 'doctor' ? 'Doctor' : authRole === 'admin' ? 'Admin' : 'Patient'} Sign In` 
                      : `Register ${authRole === 'doctor' ? 'Doctor Profile' : 'Patient Account'}`}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                    {authRole === 'admin' ? 'Master Hospital Management Portal' : authRole === 'doctor' ? 'Clinical Workspace & Appointments' : 'Book 24x7 Consultations & Access Health Records'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAuthModal(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Role Selector Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-slate-100/80 mb-4 text-xs font-bold">
              <button 
                type="button"
                onClick={() => setAuthRole('patient')}
                className={`py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${authRole === 'patient' ? 'bg-white text-slate-900 shadow-md font-extrabold' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Patient</span>
              </button>
              <button 
                type="button"
                onClick={() => setAuthRole('doctor')}
                className={`py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${authRole === 'doctor' ? 'bg-white text-slate-900 shadow-md font-extrabold' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Doctor</span>
              </button>
              <button 
                type="button"
                onClick={() => { setAuthRole('admin'); setAuthMode('login'); }}
                className={`py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${authRole === 'admin' ? 'bg-white text-slate-900 shadow-md font-extrabold' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            </div>


            {/* Mode Switcher (Sign In vs Register) */}
            {authRole !== 'admin' && (
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100/60 border border-slate-200/60 mb-4 text-xs font-bold">
                <button 
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`py-2 rounded-lg transition-all cursor-pointer ${authMode === 'login' ? 'bg-[#0E7C8C] text-white shadow-md font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Sign In
                </button>
                <button 
                  type="button"
                  onClick={() => setAuthMode('signup')}
                  className={`py-2 rounded-lg transition-all cursor-pointer ${authMode === 'signup' ? 'bg-[#0E7C8C] text-white shadow-md font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Create Account
                </button>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authMode === 'signup' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>{authRole === 'doctor' ? 'Doctor Full Name' : 'Full Name'}</span>
                  </label>
                  <input 
                    type="text" required
                    value={authName} onChange={e => setAuthName(e.target.value)}
                    placeholder={authRole === 'doctor' ? 'e.g. Dr. Ramesh Sharma' : 'e.g. Rahul Sharma'}
                    className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs sm:text-sm outline-none focus:bg-white focus:border-[#0E7C8C] focus:ring-2 focus:ring-[#0E7C8C]/20 transition-all font-medium"
                  />
                </div>
              )}

              <div className={authMode === 'signup' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-3'}>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email Address</span>
                  </label>
                  <input 
                    type="email" required
                    value={authEmail} onChange={e => setAuthEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs sm:text-sm outline-none focus:bg-white focus:border-[#0E7C8C] focus:ring-2 focus:ring-[#0E7C8C]/20 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Password</span>
                  </label>
                  <input 
                    type="password" required
                    value={authPassword} onChange={e => setAuthPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs sm:text-sm outline-none focus:bg-white focus:border-[#0E7C8C] focus:ring-2 focus:ring-[#0E7C8C]/20 transition-all font-medium"
                  />
                </div>
              </div>

              {authMode === 'signup' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Phone Number</span>
                  </label>
                  <input 
                    type="tel"
                    value={authPhone} onChange={e => setAuthPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs sm:text-sm outline-none focus:bg-white focus:border-[#0E7C8C] focus:ring-2 focus:ring-[#0E7C8C]/20 transition-all font-medium"
                  />
                </div>
              )}

              {/* DOCTOR SPECIFIC REGISTRATION FIELDS */}
              {authMode === 'signup' && authRole === 'doctor' && (
                <div className="space-y-3 pt-1 border-t border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                        <span>Medical Specialty</span>
                      </label>
                      <select 
                        value={authSpecialty} onChange={e => setAuthSpecialty(e.target.value as Specialty)}
                        className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs sm:text-sm outline-none focus:bg-white focus:border-[#0E7C8C] focus:ring-2 focus:ring-[#0E7C8C]/20 transition-all font-medium"
                      >
                        {SPECIALTIES.filter(s => s.name !== 'All Specialties').map(s => (
                          <option key={s.name} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                        <span>Medical Degree / Qualifications</span>
                      </label>
                      <input 
                        type="text" required
                        value={authEducation} onChange={e => setAuthEducation(e.target.value)}
                        placeholder="e.g. MBBS, MD (Cardiology)"
                        className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs sm:text-sm outline-none focus:bg-white focus:border-[#0E7C8C] focus:ring-2 focus:ring-[#0E7C8C]/20 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-slate-400" />
                        <span>Experience (Years)</span>
                      </label>
                      <input 
                        type="number" min="0" max="60" required
                        value={authExperience} onChange={e => setAuthExperience(e.target.value)}
                        placeholder="e.g. 10"
                        className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs sm:text-sm outline-none focus:bg-white focus:border-[#0E7C8C] focus:ring-2 focus:ring-[#0E7C8C]/20 transition-all font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                        <span>Consultation Fee (₹)</span>
                      </label>
                      <input 
                        type="number" min="100" max="10000" step="50" required
                        value={authFee} onChange={e => setAuthFee(e.target.value)}
                        placeholder="e.g. 1000"
                        className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs sm:text-sm outline-none focus:bg-white focus:border-[#0E7C8C] focus:ring-2 focus:ring-[#0E7C8C]/20 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Hospital / Medical Center</span>
                      </label>
                      <input 
                        type="text" required
                        value={authHospital} onChange={e => setAuthHospital(e.target.value)}
                        placeholder="e.g. Apollo Hospital"
                        className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs sm:text-sm outline-none focus:bg-white focus:border-[#0E7C8C] focus:ring-2 focus:ring-[#0E7C8C]/20 transition-all font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>Location / City</span>
                      </label>
                      <input 
                        type="text" required
                        value={authLocation} onChange={e => setAuthLocation(e.target.value)}
                        placeholder="e.g. Delhi"
                        className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs sm:text-sm outline-none focus:bg-white focus:border-[#0E7C8C] focus:ring-2 focus:ring-[#0E7C8C]/20 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>Professional Bio / About Summary</span>
                    </label>
                    <textarea 
                      rows={2}
                      value={authAbout} onChange={e => setAuthAbout(e.target.value)}
                      placeholder="Summarize your clinical expertise and background..."
                      className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs sm:text-sm outline-none focus:bg-white focus:border-[#0E7C8C] focus:ring-2 focus:ring-[#0E7C8C]/20 transition-all font-medium"
                    />
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={authLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0E7C8C] to-teal-700 hover:from-[#0A626F] hover:to-teal-800 text-white font-black text-xs sm:text-sm transition-all shadow-lg hover:shadow-xl mt-3 flex items-center justify-center gap-2 cursor-pointer"
              >
                {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : (authMode === 'login' ? `Sign In as ${authRole === 'doctor' ? 'Doctor' : authRole === 'admin' ? 'Admin' : 'Patient'}` : `Register as ${authRole === 'doctor' ? 'Doctor' : 'Patient'}`)}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PATIENT REVIEW SUBMISSION MODAL */}
      {reviewModal.open && reviewModal.appt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Rate & Review Doctor</h3>
                <p className="text-slate-500 text-xs">Share your experience with {reviewModal.appt.doctorName}</p>
              </div>
              <button onClick={() => setReviewModal({ open: false, appt: null, rating: 5, comment: '' })} className="p-2 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select Rating (1 to 5 Stars)</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewModal({ ...reviewModal, rating: star })}
                      className="p-2 rounded-xl transition-all cursor-pointer"
                    >
                      <Star className={`w-6 h-6 ${star <= reviewModal.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                    </button>
                  ))}
                  <span className="font-bold text-slate-800 text-sm ml-2">{reviewModal.rating} / 5 Stars</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Review Feedback / Comment</label>
                <textarea 
                  rows={3} required
                  value={reviewModal.comment}
                  onChange={e => setReviewModal({ ...reviewModal, comment: e.target.value })}
                  placeholder="Share details about consultation quality and doctor care..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#0E7C8C]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => setReviewModal({ open: false, appt: null, rating: 5, comment: '' })} className="w-1/3 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="w-2/3 py-3 rounded-xl bg-[#0E7C8C] text-white font-bold text-xs hover:bg-[#0A626F] cursor-pointer">
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCTOR CLINICAL PRESCRIPTION MODAL */}
      {clinicalModal.open && clinicalModal.appt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Write Prescription & Clinical Notes</h3>
                <p className="text-slate-500 text-xs">Patient: {clinicalModal.appt.patientName} ({clinicalModal.appt.gender}, {clinicalModal.appt.age} yrs)</p>
              </div>
              <button onClick={() => setClinicalModal({ open: false, appt: null, notes: '', prescription: '' })} className="p-2 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClinicalNotes} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Prescription & Dosage Details</label>
                <textarea 
                  rows={4} required
                  value={clinicalModal.prescription}
                  onChange={e => setClinicalModal({ ...clinicalModal, prescription: e.target.value })}
                  placeholder="e.g. Tab Paracetamol 500mg TDS x 5 days&#10;Tab Amoxicillin 500mg BD x 7 days"
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-mono outline-none focus:border-[#0E7C8C]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Clinical / Diagnostic Notes</label>
                <textarea 
                  rows={2}
                  value={clinicalModal.notes}
                  onChange={e => setClinicalModal({ ...clinicalModal, notes: e.target.value })}
                  placeholder="Additional diagnostic observations or follow-up instructions..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#0E7C8C]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => setClinicalModal({ open: false, appt: null, notes: '', prescription: '' })} className="w-1/3 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="w-2/3 py-3 rounded-xl bg-[#0E7C8C] text-white font-bold text-xs hover:bg-[#0A626F] cursor-pointer">
                  Save & Complete Consultation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCTOR AVAILABILITY UPDATE MODAL */}
      {updateAvailabilityModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Update Availability & Fee</h3>
                <p className="text-slate-500 text-xs">Set daily consultation slot capacity and fee</p>
              </div>
              <button onClick={() => setUpdateAvailabilityModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!user) return;
              const docId = user.doctorId || user.id || 'd1';
              const res = await apiPut(`/doctors/${docId}`, {
                availableToday: Number(doctorSlotsForm.availableToday),
                fee: Number(doctorSlotsForm.fee),
                hospital: doctorSlotsForm.hospital,
                about: doctorSlotsForm.about
              });
              if (res.success || res.data) {
                showToast('Doctor availability updated successfully!', 'success');
                setUpdateAvailabilityModal(false);
                const updatedDocs = await apiGet('/doctors');
                if (Array.isArray(updatedDocs)) setDoctors(updatedDocs);
              } else {
                showToast(res.error || 'Failed to update availability', 'error');
              }
            }} className="space-y-4">
              
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Available Slots Today</label>
                <input 
                  type="number" min="0" max="50" required
                  value={doctorSlotsForm.availableToday} 
                  onChange={e => setDoctorSlotsForm({ ...doctorSlotsForm, availableToday: Number(e.target.value) })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#0E7C8C]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Consultation Fee (₹)</label>
                <input 
                  type="number" min="0" required
                  value={doctorSlotsForm.fee} 
                  onChange={e => setDoctorSlotsForm({ ...doctorSlotsForm, fee: Number(e.target.value) })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#0E7C8C]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Hospital / Clinic Center</label>
                <input 
                  type="text" required
                  value={doctorSlotsForm.hospital} 
                  onChange={e => setDoctorSlotsForm({ ...doctorSlotsForm, hospital: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#0E7C8C]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => setUpdateAvailabilityModal(false)} className="w-1/3 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="w-2/3 py-3 rounded-xl bg-[#0E7C8C] text-white font-bold text-xs hover:bg-[#0A626F] cursor-pointer">
                  Save Availability
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESCHEDULE APPOINTMENT MODAL */}
      {rescheduleModal.open && rescheduleModal.appt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Reschedule Appointment</h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Doctor: <strong className="text-slate-800">{rescheduleModal.appt.doctorName || 'Medical Specialist'}</strong> | Current: {rescheduleModal.appt.date} at {rescheduleModal.appt.time}
                </p>
              </div>
              <button 
                onClick={() => setRescheduleModal({ open: false, appt: null, newDate: generateDates()[0].iso, newTime: null })} 
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">Select New Date</label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {generateDates().map((d) => (
                    <button
                      type="button"
                      key={d.iso}
                      onClick={() => setRescheduleModal(prev => ({ ...prev, newDate: d.iso, newTime: null }))}
                      className={`flex-shrink-0 px-3.5 py-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                        rescheduleModal.newDate === d.iso
                          ? 'border-[#0E7C8C] bg-[#0E7C8C] text-white shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      <p className="text-[10px] font-bold uppercase">{d.dayName}</p>
                      <p className="text-sm font-black">{d.dayNum}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">Select New Time Slot</label>
                <div className="grid grid-cols-4 gap-2">
                  {[...TIME_SLOTS.morning, ...TIME_SLOTS.afternoon, ...TIME_SLOTS.evening].map((slot) => {
                    const booked = isSlotBooked(rescheduleModal.appt!.doctorId, rescheduleModal.newDate, slot);
                    const selected = rescheduleModal.newTime === slot;
                    return (
                      <button
                        type="button"
                        key={slot}
                        disabled={booked}
                        onClick={() => setRescheduleModal(prev => ({ ...prev, newTime: slot }))}
                        className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          booked 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed line-through'
                            : selected
                            ? 'bg-[#0E7C8C] text-white shadow-sm'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRescheduleModal({ open: false, appt: null, newDate: generateDates()[0].iso, newTime: null })}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!rescheduleModal.newTime}
                  className="w-2/3 py-2.5 rounded-xl bg-[#0E7C8C] text-white font-bold text-xs hover:bg-[#0A626F] disabled:opacity-50 cursor-pointer shadow-md shadow-[#0E7C8C]/20"
                >
                  Confirm Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN ADD DOCTOR MODAL */}
      {addDoctorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Add New Hospital Doctor</h3>
                <p className="text-slate-500 text-xs">Create doctor profile in hospital database</p>
              </div>
              <button onClick={() => setAddDoctorModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDoctorSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Doctor Name (with Title)</label>
                <input 
                  type="text" required
                  value={newDoctorForm.name} 
                  onChange={e => setNewDoctorForm({ ...newDoctorForm, name: e.target.value })}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#0E7C8C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Specialty</label>
                  <select 
                    value={newDoctorForm.specialty}
                    onChange={e => setNewDoctorForm({ ...newDoctorForm, specialty: e.target.value as Specialty })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#0E7C8C]"
                  >
                    {SPECIALTIES.filter(s => s.name !== 'All Specialties').map(s => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Experience (Years)</label>
                  <input 
                    type="number" required
                    value={newDoctorForm.experience} 
                    onChange={e => setNewDoctorForm({ ...newDoctorForm, experience: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#0E7C8C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Hospital / Clinic</label>
                  <input 
                    type="text" required
                    value={newDoctorForm.hospital} 
                    onChange={e => setNewDoctorForm({ ...newDoctorForm, hospital: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#0E7C8C]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Fee (₹)</label>
                  <input 
                    type="number" required
                    value={newDoctorForm.fee} 
                    onChange={e => setNewDoctorForm({ ...newDoctorForm, fee: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#0E7C8C]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => setAddDoctorModal(false)} className="w-1/3 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer">Cancel</button>
                <button type="submit" className="w-2/3 py-2.5 rounded-xl bg-[#0E7C8C] text-white font-bold text-xs hover:bg-[#0A626F] cursor-pointer">Save Doctor Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLEAN CORPORATE FOOTER */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-12 text-slate-600 text-xs font-sans">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-100">
            
            {/* Col 1: Branding */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8.5 w-8.5 rounded-xl bg-gradient-to-tr from-[#0E7C8C] to-[#15B0C7] flex items-center justify-center text-white shadow-sm">
                  <Stethoscope className="h-4.5 w-4.5" />
                </div>
                <span className="text-base font-black text-slate-900">Med connect</span>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed font-medium">
                Hospital appointment booking system providing instant online doctor slot booking, patient records, and clinical management.
              </p>
            </div>

            {/* Col 2: Patient Services */}
            <div>
              <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] mb-3">Patient Services</h4>
              <ul className="space-y-2 text-slate-500 font-medium">
                <li><button onClick={() => setPage('landing')} className="hover:text-[#0E7C8C] cursor-pointer">Find Doctors</button></li>
                <li><button onClick={() => openAuthModal('patient', 'login')} className="hover:text-[#0E7C8C] cursor-pointer">Patient Sign In</button></li>
                <li><button onClick={() => openAuthModal('patient', 'signup')} className="hover:text-[#0E7C8C] cursor-pointer">Patient Register</button></li>
                <li><button onClick={() => setPage('patientDashboard')} className="hover:text-[#0E7C8C] cursor-pointer">Appointments Dashboard</button></li>
              </ul>
            </div>

            {/* Col 3: Specialties */}
            <div>
              <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] mb-3">Medical Specialties</h4>
              <ul className="space-y-2 text-slate-500 font-medium">
                <li><button onClick={() => { setFilters({ ...filters, specialty: 'Cardiology' }); setPage('landing'); }} className="hover:text-[#0E7C8C] cursor-pointer">Cardiology</button></li>
                <li><button onClick={() => { setFilters({ ...filters, specialty: 'Neurology' }); setPage('landing'); }} className="hover:text-[#0E7C8C] cursor-pointer">Neurology</button></li>
                <li><button onClick={() => { setFilters({ ...filters, specialty: 'Orthopedics' }); setPage('landing'); }} className="hover:text-[#0E7C8C] cursor-pointer">Orthopedics</button></li>
                <li><button onClick={() => { setFilters({ ...filters, specialty: 'Pediatrics' }); setPage('landing'); }} className="hover:text-[#0E7C8C] cursor-pointer">Pediatrics</button></li>
              </ul>
            </div>

            {/* Col 4: Doctor & Admin Portal */}
            <div>
              <h4 className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] mb-3">Hospital Portals</h4>
              <ul className="space-y-2 text-slate-500 font-medium">
                <li><button onClick={() => openAuthModal('doctor', 'login')} className="hover:text-[#0E7C8C] cursor-pointer">Doctor Portal Sign In</button></li>
                <li><button onClick={() => openAuthModal('doctor', 'signup')} className="hover:text-[#0E7C8C] cursor-pointer">Doctor Registration</button></li>
                <li><button onClick={() => openAuthModal('admin', 'login')} className="hover:text-[#0E7C8C] cursor-pointer">Admin Access</button></li>
                <li className="pt-2 text-[#0E7C8C] font-extrabold">24x7 Helpline: 1800-MED-CONNECT</li>
              </ul>
            </div>

          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 font-medium text-[11px]">
            <p>© 2026 Med connect-Hospital appointment booking system. All rights reserved.</p>
            <div className="flex items-center gap-4 text-slate-400">
              <span className="hover:text-slate-600 cursor-pointer">Privacy Policy</span>
              <span>•</span>
              <span className="hover:text-slate-600 cursor-pointer">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
