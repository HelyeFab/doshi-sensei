'use client';

export function TestModal() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '90%',
          textAlign: 'center',
          border: '2px solid #333',
        }}
      >
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#333' }}>
          🎌 Welcome to Doshi Sensei!
        </h1>
        <p style={{ marginBottom: '20px', color: '#666' }}>
          This is a test modal to verify rendering works.
        </p>
        <button
          style={{
            backgroundColor: '#6366f1',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          Test Button
        </button>
      </div>
    </div>
  );
}
