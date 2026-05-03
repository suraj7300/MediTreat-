
// ── src/pages/Dashboard.jsx ──────────────────────────────────
import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function Dashboard() {
  const [stats, setStats]     = useState(null);
  const [insight, setInsight] = useState('');
  const [footfall, setFootfall] = useState([]);

  useEffect(() => {
    api.getSummary().then(setStats).catch(console.error);
    api.dailyInsight().then(r => setInsight(r.insight)).catch(console.error);
    api.getFootfall(7).then(setFootfall).catch(console.error);
  }, []);

  const cards = stats ? [
    { label: "Today's Patients", val: stats.today?.total || 0, color:'#1a7a4a', sub: `${stats.today?.waiting||0} waiting` },
    { label: 'Urgent Flags',     val: stats.today?.urgent || 0, color:'#b91c1c', sub: 'AI triage alerts' },
    { label: 'Monthly Patients', val: stats.monthly_patients || 0, color:'#1565c0', sub: 'this month' },
    { label: 'Monthly Revenue',  val: `₹${(stats.monthly_revenue||0).toLocaleString('en-IN')}`, color:'#b45309', sub: 'collected' },
  ] : [];

  const maxFoot = Math.max(...footfall.map(f=>parseInt(f.count)), 1);

  return (
    <div>
      {/* STAT CARDS */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', padding:16 }}>
            <div style={{ fontSize:12, color:'#64748b', marginBottom:6 }}>{c.label}</div>
            <div style={{ fontSize:26, fontWeight:700, color:c.color }}>{c.val}</div>
            <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        {/* AI INSIGHT */}
        <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', padding:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:.5, marginBottom:12 }}>AI Daily Insight</div>
          <div style={{ background:'#e6f4ed', borderRadius:8, padding:14, fontSize:13, lineHeight:1.7, borderLeft:'3px solid #1a7a4a' }}>
            <b style={{ color:'#1a7a4a' }}>AI: </b>{insight || 'Loading insight...'}
          </div>
        </div>

        {/* FOOTFALL CHART */}
        <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', padding:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:.5, marginBottom:12 }}>7-Day Footfall</div>
          {footfall.map(f => (
            <div key={f.date} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:7, fontSize:13 }}>
              <div style={{ width:70, textAlign:'right', color:'#94a3b8', fontSize:11 }}>
                {new Date(f.date).toLocaleDateString('en-IN',{weekday:'short',day:'numeric'})}
              </div>
              <div style={{ flex:1, background:'#f1f5f9', borderRadius:6, height:16, overflow:'hidden' }}>
                <div style={{ width:`${Math.round(parseInt(f.count)/maxFoot*100)}%`, height:'100%', background:'#1a7a4a', borderRadius:6, transition:'.5s' }} />
              </div>
              <div style={{ width:28, fontWeight:600 }}>{f.count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
