import React, { useState, useEffect } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import VpnKeyIcon from '@mui/icons-material/VpnKey';

const COLORS = {
  bg: '#0f1117',
  surface: '#1a1d2e',
  card: '#22263a',
  border: '#2e3450',
  text: '#e2e8f0',
  subtext: '#94a3b8',
  accent: '#3b82f6',
  placement: '#ef4444',
  result: '#f59e0b',
  event: '#10b981',
};

const typeColor = (type) => {
  if (type === 'Placement') return COLORS.placement;
  if (type === 'Result') return COLORS.result;
  return COLORS.event;
};

export default function App() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [token, setToken] = useState(() => localStorage.getItem('eval_token') || '');
  const [tokenInput, setTokenInput] = useState(() => localStorage.getItem('eval_token') || '');
  const limit = 10;

  useEffect(() => {
    if (token) fetchData();
  }, [page, filter, token]);

  const saveToken = () => {
    localStorage.setItem('eval_token', tokenInput);
    setToken(tokenInput);
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      let URL = `http://4.224.186.213/evaluation-service/notifications?page=${page}&limit=${limit}`;
      if (filter) URL += `&notification_type=${filter}`;
      const response = await fetch(URL, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      setNotifications(result.notifications || []);
    } catch (err) {
      setError('Could not load notifications. The API requires a valid access token.');
      console.error('Fetch crash:', err);
    } finally {
      setLoading(false);
    }
  };

  const computePriorityInbox = () => {
    const weights = { 'Placement': 3, 'Result': 2, 'Event': 1 };
    return [...notifications]
      .sort((a, b) => {
        if (weights[b.Type] !== weights[a.Type]) return weights[b.Type] - weights[a.Type];
        return new Date(b.Timestamp) - new Date(a.Timestamp);
      })
      .slice(0, 5);
  };

  const filters = [
    { label: '⚡ All Alerts', value: '' },
    { label: 'Placements', value: 'Placement' },
    { label: 'Results', value: 'Result' },
    { label: 'Events', value: 'Event' },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, color: COLORS.text, padding: '30px', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      
      {/* Header */}
      <header style={{ borderBottom: `2px solid ${COLORS.border}`, paddingBottom: '16px', marginBottom: '20px' }}>
        <h1 style={{ color: COLORS.text, margin: 0, fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>
          🎓 Campus Alert Hub
        </h1>
        <p style={{ color: COLORS.subtext, marginTop: '6px', fontSize: '14px' }}>
          Real-time campus notifications — Placements, Results &amp; Events
        </p>
      </header>

      {/* Token Input */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '24px', backgroundColor: COLORS.surface, padding: '14px 16px', borderRadius: '10px', border: `1px solid ${COLORS.border}` }}>
        <span style={{ color: COLORS.subtext, fontSize: '13px', whiteSpace: 'nowrap' }}>🔑 Access Token:</span>
        <input
          type="text"
          value={tokenInput}
          onChange={e => setTokenInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && saveToken()}
          placeholder="Paste your evaluation access token here..."
          style={{
            flex: 1,
            backgroundColor: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '6px',
            padding: '8px 12px',
            color: COLORS.text,
            fontSize: '13px',
            outline: 'none',
          }}
        />
        <button
          onClick={saveToken}
          style={{
            padding: '8px 18px',
            backgroundColor: COLORS.accent,
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px',
            whiteSpace: 'nowrap',
          }}
        >
          Load Data
        </button>
        {token && <span style={{ color: '#10b981', fontSize: '12px', whiteSpace: 'nowrap' }}>✅ Token set</span>}
      </div>


      {/* Filter Buttons */}
      <div style={{ marginBottom: '28px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {filters.map(({ label, value }) => (
          <button
            key={value}
            style={{
              padding: '10px 20px',
              backgroundColor: filter === value ? COLORS.accent : COLORS.surface,
              color: filter === value ? '#fff' : COLORS.text,
              border: `1px solid ${filter === value ? COLORS.accent : COLORS.border}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'all 0.2s ease',
            }}
            onClick={() => { setFilter(value); setPage(1); }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ backgroundColor: '#2d1515', border: '1px solid #7f1d1d', color: '#fca5a5', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        
        {/* Stream Feed */}
        <section>
          <h2 style={{ color: COLORS.text, marginBottom: '16px', fontSize: '18px', fontWeight: 700 }}>📡 Stream Feed</h2>
          {loading ? (
            <p style={{ color: COLORS.subtext }}>Loading...</p>
          ) : notifications.length === 0 ? (
            <p style={{ color: COLORS.subtext }}>No notifications found.</p>
          ) : (
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
              {notifications.map(n => (
                <li key={n.ID} style={{
                  padding: '14px 16px',
                  borderBottom: `1px solid ${COLORS.border}`,
                  backgroundColor: COLORS.surface,
                  borderRadius: '8px',
                  marginBottom: '10px',
                  borderLeft: `4px solid ${typeColor(n.Type)}`,
                }}>
                  <strong style={{ color: typeColor(n.Type), fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    [{n.Type}]
                  </strong>
                  <p style={{ color: COLORS.text, margin: '6px 0 4px', fontSize: '14px' }}>{n.Message}</p>
                  <small style={{ color: COLORS.subtext, fontSize: '12px' }}>{n.Timestamp}</small>
                </li>
              ))}
            </ul>
          )}
          {/* Pagination */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              style={{
                padding: '8px 16px', backgroundColor: page === 1 ? COLORS.border : COLORS.accent,
                color: '#fff', border: 'none', borderRadius: '6px', cursor: page === 1 ? 'not-allowed' : 'pointer',
                opacity: page === 1 ? 0.5 : 1, fontWeight: 600
              }}
            >← Prev</button>
            <span style={{ color: COLORS.subtext, fontWeight: 600 }}>Page {page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              style={{ padding: '8px 16px', backgroundColor: COLORS.accent, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >Next →</button>
          </div>
        </section>

        {/* Priority Inbox */}
        <section style={{ backgroundColor: COLORS.surface, padding: '20px', borderRadius: '12px', border: `1px solid ${COLORS.border}` }}>
          <h2 style={{ color: COLORS.text, marginBottom: '16px', fontSize: '18px', fontWeight: 700 }}>🔥 Priority Inbox (Top 5)</h2>
          {computePriorityInbox().length === 0 ? (
            <p style={{ color: COLORS.subtext, fontSize: '14px' }}>No notifications loaded yet.</p>
          ) : (
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
              {computePriorityInbox().map(n => (
                <li key={n.ID} style={{
                  padding: '12px 14px',
                  backgroundColor: COLORS.card,
                  marginBottom: '10px',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${typeColor(n.Type)}`,
                }}>
                  <strong style={{ color: typeColor(n.Type), fontSize: '13px' }}>{n.Type}</strong>
                  <p style={{ color: COLORS.text, margin: '4px 0 0', fontSize: '13px' }}>{n.Message}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
    </div>
  );
}