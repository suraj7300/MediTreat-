import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

export default function Queue() {
  const [queue, setQueue]           = useState([]);
  const [selected, setSelected]     = useState(null);
  const [summary, setSummary]       = useState('');
  const [notes, setNotes]           = useState('');
  const [loadingSum, setLoadingSum] = useState(false);

  const fetchQueue = useCallback(async () => {
    try { setQueue(await api.getQueue()); } catch(e) { console.error(e); }
  }, []);

  useEffect(() => { fetchQueue(); const t = setInterval(fetchQueue, 30000); return () => clearInterval(t); }, [fetchQueue]);

  async function selectPatient(p) {
    setSelected(p); setNotes(''); setSummary(''); setLoadingSum(true);
    try {
      const r = await api.patientSummary(p.patient_id, p.complaint);
      setSummary(r.summary);
    } catch { setSummary('AI summary unavailable.'); }
    finally { setLoadingSum(false); }
  }

  async function markDone() {
    if (!selected) return;
    await api.updateQueueStatus(selected.id, { status: 'done', notes });
    setSelected(null); setSummary(''); fetchQueue();
  }

  async function callPatient(item) {
    await api.updateQueueStatus(item.id, { status: 'active' });
    fetchQueue();
  }

  const statusColor = { waiting:'#f59e0b', active:'#1a7a4a', done:'#22c55e' };

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16 }}>
      {/* QUEUE LIST */}
      <div>
        <div style={{ fontWeight:700, color:'#475569', fontSize:13, textTransform:'uppercase', letterSpacing:.5, marginBottom:10 }}>
          Live Queue — <span style={{ color:'#1a7a4a' }}>{queue.filter(q=>q.status==='waiting').length} waiting</span>
        </div>
        {queue.map(p => (
          <div key={p.id} onClick={() => selectPatient(p)}
            style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:10,
              border:`1px solid ${selected?.id===p.id?'#1a7a4a':'#e2e8f0'}`,
              borderLeft:`4px solid ${statusColor[p.status]||'#e2e8f0'}`,
              background: selected?.id===p.id ? '#e6f4ed' : '#fff',
              marginBottom:8, cursor:'pointer', transition:'.15s' }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background: p.status==='done'?'#22c55e': p.status==='active'?'#1a7a4a':'#e2e8f0',
              color: p.status==='waiting'?'#64748b':'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0 }}>
              {p.status==='done' ? '✓' : p.token_number}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:14 }}>
                {p.name} <span style={{ fontSize:12, color:'#94a3b8' }}>{p.age}/{p.gender}</span>
                {p.triage==='urgent' && <span style={{ marginLeft:8, background:'#fee2e2', color:'#b91c1c', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700 }}>Urgent</span>}
              </div>
              <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{p.complaint}</div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {p.status==='waiting' && (
                <button onClick={e=>{e.stopPropagation();callPatient(p)}}
                  style={{ padding:'5px 12px', borderRadius:6, border:'1.5px solid #1a7a4a', background:'transparent', color:'#1a7a4a', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  Call
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* PATIENT DETAIL PANEL */}
      {selected ? (
        <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', padding:20, position:'sticky', top:0, maxHeight:'90vh', overflowY:'auto' }}>
          <div style={{ width:52, height:52, borderRadius:'50%', background:'#1a7a4a', color:'#fff', fontSize:18, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px' }}>
            {selected.name?.charAt(0)}
          </div>
          <div style={{ textAlign:'center', fontWeight:700, fontSize:16 }}>{selected.name}</div>
          <div style={{ textAlign:'center', fontSize:12, color:'#64748b', marginBottom:14 }}>Token #{selected.token_number}</div>
          {[['Phone', selected.phone], ['Age/Gender', `${selected.age} / ${selected.gender}`], ['Allergies', selected.allergies||'None'], ['Complaint', selected.complaint]].map(([k,v])=>(
            <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #f8fafc', fontSize:13 }}>
              <span style={{ color:'#64748b' }}>{k}</span><span style={{ fontWeight:500 }}>{v}</span>
            </div>
          ))}
          <div style={{ background:'#e6f4ed', borderRadius:8, padding:12, margin:'14px 0', fontSize:13, lineHeight:1.6, borderLeft:'3px solid #1a7a4a' }}>
            <b style={{ color:'#1a7a4a' }}>AI Summary: </b>
            {loadingSum ? 'Generating...' : summary}
          </div>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)}
            placeholder="Add consultation notes, diagnosis, prescription..."
            style={{ width:'100%', padding:8, border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, resize:'vertical', minHeight:80, outline:'none', boxSizing:'border-box', marginBottom:8 }} />
          <button onClick={markDone}
            style={{ width:'100%', padding:9, background:'#1a7a4a', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', marginBottom:6 }}>
            ✓ Mark as Done
          </button>
          <button onClick={()=>alert('WhatsApp message sent to '+selected.phone)}
            style={{ width:'100%', padding:9, background:'#e3f0fd', color:'#1565c0', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
            💬 Send WhatsApp Message
          </button>
        </div>
      ) : (
        <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', padding:40, display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', fontSize:14 }}>
          Select a patient to view details
        </div>
      )}
    </div>
  );
}
