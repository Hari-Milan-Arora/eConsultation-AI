import React from 'react';

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>eConsultation AI - Simple Test</h1>
      <p>If you can see this, React is working!</p>
      <p>Current time: {new Date().toLocaleString()}</p>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <h2>System Status</h2>
        <p>✅ React is loading correctly</p>
        <p>✅ JavaScript is working</p>
        <p>✅ Component rendering is functional</p>
      </div>
    </div>
  );
}

export default App;