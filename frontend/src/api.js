const BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const token = () => localStorage.getItem('meditreat_token');
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

export const api = {
  login: (body) => post('/auth/login', body, false),
  register: (body) => post('/auth/register', body, false),

  getPatients: (search) => get(`/patients${search ? '?search=' + search : ''}`),
  getPatient: (id) => get(`/patients/${id}`),
  createPatient: (body) => post('/patients', body),
  updatePatient: (id, body) => put(`/patients/${id}`, body),

  getQueue: () => get('/queue/today'),
  addToQueue: (body) => post('/queue', body),
  updateQueueStatus: (id, body) => put(`/queue/${id}/status`, body),

  getBookings: (date) => get(`/bookings${date ? '?date=' + date : ''}`),
  createBooking: (body) => post('/bookings', body),
  cancelBooking: (id) => put(`/bookings/${id}/cancel`, {}),

  createOrder: (body) => post('/payments/create-order', body),
  verifyPayment: (body) => post('/payments/verify', body),

  getSummary: () => get('/analytics/summary'),
  getFootfall: (days) => get(`/analytics/footfall?days=${days || 7}`),

  triage: (complaint) => post('/ai/triage', { complaint }),
  patientSummary: (patient_id, current_complaint) =>
    post('/ai/patient-summary', { patient_id, current_complaint }),
  prescription: (body) => post('/ai/prescription', body),
  dailyInsight: () => get('/ai/daily-insight'),
  forecast: () => post('/ai/forecast', {}),

  getSettings: () => get('/settings'),
  saveSettings: (body) => put('/settings', body),

  getSubscription: () => get('/subscription'),
  upgradePlan: (plan) => post('/subscription/upgrade', { plan }),
};

async function get(path) {
  const r = await fetch(BASE + path, { headers: headers() });
  if (!r.ok) throw await r.json();
  return r.json();
}

async function post(path, body, auth = true) {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: auth ? headers() : { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw await r.json();
  return r.json();
}

async function put(path, body) {
  const r = await fetch(BASE + path, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw await r.json();
  return r.json();
}
