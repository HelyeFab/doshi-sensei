'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
              Critical Application Error
            </h1>
            <p style={{ marginBottom: '1.5rem', color: '#666' }}>
              The application encountered a critical error and needs to restart.
            </p>
            <button
              onClick={() => {
                // Force hard reload
                window.location.href = '/';
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Restart Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}