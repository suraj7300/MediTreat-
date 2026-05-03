
import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch]     = useState('');
  const [adding, setAdding]     = useState(false);
  const [form, setForm]         = useState({ name:'', age:'', gender:'Male', phone:'', allergies:'' });

  useEffect(() => { api.getPatients(search).then(setPatients).catch(console.error); }, [search]);

  async function addPatient() {
    try { await api.createPatient(form); setAdding(false); api.getPatients('').then(setPatients); }
    catch(e) { alert(e.error || 'Error adding patient'); }
  }

  return (
    <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', padding:20 }}>
      <div style={{ display:'flex', gap:10, marginBottom:16, alignItems:'center' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or phone..."
          style={{ padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, width:260, outline:'none' }} />
        <button onClick={()=>setAdding(true)}
          style={{ padding:'8px 16px', background:'#1a7a4a', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
          + Add Patient
        </button>
        <button style={{ padding:'8px 14px', border:'1.5px solid #e2e8f0', background:'transparent', borderRadius:8, fontSize:13, cursor:'pointer' }}>Export CSV</button>
      </div>

      {adding && (
        <div style={{ background:'#f8fafc', borderRadius:10, padding:16, marginBottom:16, border:'1px solid #e2e8f0' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
            {[['name','Full Name','text'],['age','Age','number'],['phone','Phone (+91)','tel']].map(([k,l,t])=>(
              <div key={k}><label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:4 }}>{l}</label>
              <input type={t} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
                style={{ width:'100%', padding:'7px 10px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' }} /></div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div><label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:4 }}>Gender</label>
              <select value={form.gender} onChange={e=>setForm(f=>({...f,gender:e.target.value}))}
                style={{ width:'100%', padding:'7px 10px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none' }}>
                <option>Male</option><option>Female</option><option>Other</option>
              </select></div>
            <div><label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:4 }}>Allergies</label>
              <input value={form.allergies} onChange={e=>setForm(f=>({...f,allergies:e.target.value}))}
                style={{ width:'100%', padding:'7px 10px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' }} /></div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={addPatient} style={{ padding:'8px 18px', background:'#1a7a4a', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>Save Patient</button>
            <button onClick={()=>setAdding(false)} style={{ padding:'8px 14px', border:'1.5px solid #e2e8f0', background:'transparent', borderRadius:8, fontSize:13, cursor:'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
        <thead><tr>{['Name','Age/Gender','Phone','Last Visit','Visits',''].map(h=>(
          <th key={h} style={{ textAlign:'left', padding:'10px 14px', background:'#f8fafc', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, color:'#64748b' }}>{h}</th>
        ))}</tr></thead>
        <tbody>{patients.map(p=>(
          <tr key={p.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
            <td style={{ padding:'10px 14px', fontWeight:600 }}>{p.name}</td>
            <td style={{ padding:'10px 14px', color:'#64748b' }}>{p.age} / {p.gender}</td>
            <td style={{ padding:'10px 14px', color:'#1565c0' }}>{p.phone}</td>
            <td style={{ padding:'10px 14px' }}>{p.last_visit || '—'}</td>
            <td style={{ padding:'10px 14px' }}>{p.total_visits}</td>
            <td style={{ padding:'10px 14px' }}>
              <button style={{ padding:'4px 10px', border:'1.5px solid #e2e8f0', background:'transparent', borderRadius:6, fontSize:12, cursor:'pointer' }}>View</button>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
