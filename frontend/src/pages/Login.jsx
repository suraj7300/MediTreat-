import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email:'', password:'' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(form.email, form.password);
      nav('/');
    } catch (err) {
      setError(err.error || 'Login failed. Please check credentials.');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#e6f4ed,#e3f0fd)' }}>
      <div style={{ background:'#fff', borderRadius:16, padding:40, width:380, boxShadow:'0 4px 24px rgba(0,0,0,.1)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
          <div style={{ width:40, height:40, background:'#1a7a4a', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:20, fontWeight:700 }}>+</div>
          <span style={{ fontSize:24, fontWeight:700, color:'#1a7a4a' }}>MediTreat</span>
        </div>
        <h2 style={{ marginBottom:6 }}>Welcome back</h2>
        <p style={{ color:'#64748b', fontSize:13, marginBottom:24 }}>AI-powered dispensary management</p>
        {error && <div style={{ background:'#fee2e2', color:'#b91c1c', padding:'10px 12px', borderRadius:8, marginBottom:14, fontSize:13 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:'block', fontSize:13, fontWeight:600, marginBottom:6, color:'#475569' }}>Email</label>
            <input value={form.email} onChange={e => setForm(f=>({...f, email:e.target.value}))}
              type="email" required placeholder="doctor@clinic.com"
              style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box' }} />
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:'block', fontSize:13, fontWeight:600, marginBottom:6, color:'#475569' }}>Password</label>
            <input value={form.password} onChange={e => setForm(f=>({...f, password:e.target.value}))}
              type="password" required placeholder="••••••••"
              style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box' }} />
          </div>
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:11, background:'#1a7a4a', color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:600, cursor:'pointer' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
