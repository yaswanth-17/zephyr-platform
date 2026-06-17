// pages/NotFound.tsx
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div style={{ maxWidth: 500, margin: '80px auto', padding: '0 28px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⬡</div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Page not found</h1>
      <p style={{ fontSize: 14, color: 'var(--color-muted)', marginBottom: 28 }}>
        This route doesn't exist yet.
      </p>
      <Link
        to="/"
        style={{
          padding: '9px 20px', background: '#58a6ff', color: '#0d1117',
          borderRadius: 6, textDecoration: 'none', fontWeight: 600, fontSize: 13,
        }}
      >
        ← Back to Dashboard
      </Link>
    </div>
  )
}
