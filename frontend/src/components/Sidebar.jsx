import React from 'react';
import { Link } from 'react-router-dom';

export default function Sidebar() {
  return (
    <div style={{ width: 220, background: '#0f172a', color: '#fff', padding: 20 }}>
      <h2>MediTreat</h2>

      <Link to="/">Dashboard</Link><br/>
      <Link to="/queue">Queue</Link><br/>
      <Link to="/bookings">Bookings</Link><br/>
      <Link to="/patients">Patients</Link><br/>
      <Link to="/analytics">Analytics</Link><br/>
      <Link to="/whatsapp">WhatsApp</Link><br/>
      <Link to="/settings">Settings</Link><br/>
      <Link to="/billing">Billing</Link>
    </div>
  );
}
