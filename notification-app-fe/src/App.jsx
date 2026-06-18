import React, { useState, useEffect } from 'react';
import './App.css'; 

export default function App() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    fetchData();
  }, [page, filter]);

  const fetchData = async () => {
    try {
      let URL = `http://4.224.186.213/evaluation-service/notifications?page=${page}&limit=${limit}`;
      if (filter) URL += `&notification_type=${filter}`;
      
      const response = await fetch(URL);
      const result = await response.json();
      setNotifications(result.notifications || []);
    } catch (err) {
      console.error("Fetch crash:", err);
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

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif' }}>
      <header style={{ borderBottom: '2px solid #ccc', paddingBottom: '15px', marginBottom: '25px' }}>
        <h1 style={{ color: '#2c3e50', margin: 0 }}>Campus Alert Hub</h1>
      </header>

      <div style={{ marginBottom: '25px', display: 'flex', gap: '10px' }}>
        {['', 'Placement', 'Result', 'Event'].map((type) => (
          <button 
            key={type}
            style={{
              padding: '10px 18px',
              backgroundColor: filter === type ? '#2980b9' : '#ecf0f1',
              color: filter === type ? '#fff' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            onClick={() => { setFilter(type); setPage(1); }}
          >
            {type === '' ? '⚡ All Alerts' : `${type}s`}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
        <section>
          <h2>Stream Feed</h2>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {notifications.map(n => (
              <li key={n.ID} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                <strong style={{ color: n.Type === 'Placement' ? '#e74c3c' : '#f39c12' }}>[{n.Type}]</strong>
                <p>{n.Message}</p>
                <small>{n.Timestamp}</small>
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
            <span>Page {page}</span>
            <button onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </section>

        <section style={{ background: '#f9f9f9', padding: '15px', borderRadius: '6px' }}>
          <h2>🔥 Priority Inbox (Top 5)</h2>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {computePriorityInbox().map(n => (
              <li key={n.ID} style={{ padding: '10px', background: '#fff', marginBottom: '8px', borderLeft: '4px solid #e74c3c' }}>
                <strong>{n.Type}</strong>: {n.Message}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}