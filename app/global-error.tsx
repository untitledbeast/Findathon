'use client';
import * as Sentry from '@sentry/nextjs';
import React, { useEffect } from 'react';

export default function GlobalError({ error }: { error: Error }) {
  useEffect(() => {
    if (process.env.SENTRY_DSN) Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          color: 'white',
          background: '#0b0f19',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}>
          <h1 style={{ color: '#7C3AED' }}>Something went wrong</h1>
          <p style={{ color: '#94a3b8' }}>Our team has been notified. Please try again.</p>
        </div>
      </body>
    </html>
  );
}
