import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Queue from './pages/Queue';
import Bookings from './pages/Bookings';
import Patients from './pages/Patients';
import Analytics from './pages/Analytics';
import WhatsAppBot from './pages/WhatsAppBot';
import Settings from './pages/Settings';
import Billing from './pages/Billing';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

function ProtectedLayout({ children }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar />
        <main style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#f8fafc' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/queue" element={<ProtectedLayout><Queue /></ProtectedLayout>} />
          <Route path="/bookings" element={<ProtectedLayout><Bookings /></ProtectedLayout>} />
          <Route path="/patients" element={<ProtectedLayout><Patients /></ProtectedLayout>} />
          <Route path="/analytics" element={<ProtectedLayout><Analytics /></ProtectedLayout>} />
          <Route path="/whatsapp" element={<ProtectedLayout><WhatsAppBot /></ProtectedLayout>} />
          <Route path="/settings" element={<ProtectedLayout><Settings /></ProtectedLayout>} />
          <Route path="/billing" element={<ProtectedLayout><Billing /></ProtectedLayout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
