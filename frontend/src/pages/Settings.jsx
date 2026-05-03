import React, { useState, useEffect } from 'react';
import { api } from '../api';

const TABS = ['Clinic Profile','Slot Settings','Fees & Payments','Staff & Roles','Notifications'];

export default function Settings() {
  const [tab, setTab]       = useState(0);
  const [settings, setSettings] = useState({});
  const [saved, setSaved]   = useState(false);

  useEffect(() => { api.getSettings().then(setSettings).catch(console.error); }, []);

  async function save() {
    try { await api.saveSettings(settings); setSaved(true); setTimeout(()=>setSaved(false),2000); }
    catch(e) { alert(e.error || 'Save failed'); }
  }

  const field = (key, label, type='text') => (
    <div key={key}>
      <label style={{ display:'block', fontSize:12, fontWeight:700, marginBottom:5, color:'#475569' }}>{label}</label>
      <input type={type} value={settings[key]||''} onChange={e=>setSettings(s=>({...s,[key]:e.target.value}))}
        style={{ width:'100%', padding:'8px 10px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' }} />
    </div>
  );

  const toggle = (key, label) => (
    <div key={key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid #f8fafc', fontSize:14 }}>
      <span>{label}</span>
      <div onClick={()=>setSettings(s=>({...s,[key]:!s[key]}))}
        style={{ width:42, height:24, background:settings[key]?'#1a7a4a':'#e2e8f0', borderRadius:12, position:'relative', cursor:'pointer', transition:'.2s' }}>
        <div style={{ position:'absolute', width:18, height:18, background:'#fff', borderRadius:'50%', top:3, left:settings[key]?21:3, transition:'.2s' }} />
      </div>
    </div>
  );

  const panels = [
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
      {field('clinic_name','Clinic Name')}{field('doctor_name','Doctor Name')}
      {field('phone','Phone')}{field('email','Email')}
      {field('address','Address')}{field('specialization','Specialization')}
      {field('open_time','Opening Time','time')}{field('close_time','Closing Time','time')}
    </div>,
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
      {field('slot_duration','Minutes per Patient','number')}
      {field('max_patients_day','Max Patients/Day','number')}
      {field('advance_booking_days','Advance Booking Days','number')}
      {toggle('walk_in_allowed','Allow Walk-in Queue')}
      {toggle('sunday_closed','Sunday Closed')}
    </div>,
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
      {field('consultation_fee','Consultation Fee (₹)','number')}
      {field('advance_fee','Advance Booking Fee (₹)','number')}
      {field('upi_id','UPI ID')}
      {toggle('upi_enabled','Enable UPI Payments')}
      {toggle('receipt_on_whatsapp','Send Receipt on WhatsApp')}
    </div>,
    <div>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14, marginBottom:14 }}>
        <thead><tr>{['Name','Role','Access',''].map(h=><th key={h} style={{ textAlign:'left', padding:'8px 12px', background:'#f8fafc', fontSize:12, fontWeight:700, color:'#64748b' }}>{h}</th>)}</tr></thead>
        <tbody>
          <tr><td style={{ padding:'10px 12px', fontWeight:600 }}>Dr. Sharma</td><td><span style={{ background:'#e6f4ed', color:'#1a7a4a', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600 }}>Doctor</span></td><td>Full</td><td><button style={{ padding:'4px 10px', border:'1.5px solid #e2e8f0', borderRadius:6, fontSize:12, cursor:'pointer' }}>Edit</button></td></tr>
          <tr><td style={{ padding:'10px 12px', fontWeight:600 }}>Meena Devi</td><td><span style={{ background:'#e3f0fd', color:'#1565c0', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600 }}>Receptionist</span></td><td>Queue only</td><td><button style={{ padding:'4px 10px', border:'1.5px solid #e2e8f0', borderRadius:6, fontSize:12, cursor:'pointer' }}>Edit</button></td></tr>
        </tbody>
      </table>
      <button style={{ padding:'8px 16px', border:'1.5px solid #1a7a4a', color:'#1a7a4a', background:'transparent', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>+ Invite Staff</button>
    </div>,
    <div>
      {toggle('reminder_enabled','Appointment Reminder (1hr before)')}
      {toggle('queue_updates','Queue Position Updates')}
      {toggle('followup_enabled','Post-visit Follow-up (3 days)')}
      {toggle('payment_receipt','Payment Confirmation')}
      {toggle('urgent_sms','Urgent Triage SMS to Doctor')}
    </div>
  ];

  return (
    <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:20 }}>
      <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', padding:10, height:'fit-content' }}>
        {TABS.map((t,i)=>(
          <div key={t} onClick={()=>setTab(i)}
            style={{ padding:'9px 12px', borderRadius:8, fontSize:14, cursor:'pointer', marginBottom:2,
              background: tab===i?'#e6f4ed':'transparent', color: tab===i?'#1a7a4a':'#475569', fontWeight: tab===i?600:400 }}>
            {t}
          </div>
        ))}
      </div>
      <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', padding:24 }}>
        <h3 style={{ fontSize:16, fontWeight:700, marginBottom:18 }}>{TABS[tab]}</h3>
        {panels[tab]}
        {tab !== 3 && (
          <button onClick={save}
            style={{ marginTop:16, padding:'9px 22px', background:'#1a7a4a', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' }}>
            {saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        )}
      </div>
    </div>
  );
}
