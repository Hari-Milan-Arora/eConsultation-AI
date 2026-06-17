import React, { useState } from 'react';

function DebugApp() {
  const [status, setStatus] = useState('Ready to test');
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setStatus('Testing...');
    
    try {
      console.log('Testing connection to http://localhost:8000/');
      
      const response = await fetch('http://localhost:8000/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Response data:', data);
        setStatus(`SUCCESS: ${JSON.stringify(data)}`);
      } else {
        setStatus(`ERROR: HTTP ${response.status} - ${response.statusText}`);
      }
      
    } catch (error) {
      console.error('Fetch error:', error);
      setStatus(`FAILED: ${error.message}`);
    }
    
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Frontend Debug Tool</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <strong>Status:</strong> {status}
      </div>
      
      <button 
        onClick={testConnection}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Testing...' : 'Test Backend Connection'}
      </button>
      
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p>Expected backend URL: http://localhost:8000/</p>
        <p>Check browser console (F12) for detailed logs</p>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Troubleshooting:</h3>
        <ol>
          <li>Make sure backend is running: <code>uvicorn app:app --reload --host 0.0.0.0 --port 8000</code></li>
          <li>Check backend directly: <a href="http://localhost:8000/" target="_blank" rel="noopener noreferrer">http://localhost:8000/</a></li>
          <li>Look for errors in browser console (F12)</li>
        </ol>
      </div>
    </div>
  );
}

export default DebugApp;