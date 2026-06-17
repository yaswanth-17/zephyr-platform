// pages/Dashboard.tsx
import { Link } from 'react-router-dom'

const MODULES = [
  {
    icon: '⬡',
    title: 'Device Tree',
    description: 'Learn DTS from scratch, generate overlays for any SoC, and validate your configs against real Zephyr bindings.',
    color: '#58a6ff',
    links: [
      { to: '/dts/learn',      label: 'Learn DTS' },
      { to: '/dts/playground', label: 'Playground' },
      { to: '/dts/validate',   label: 'Validate DTS' },
    ],
  },
  {
    icon: '⚙',
    title: 'CMakeLists',
    description: 'Understand the Zephyr build system, generate CMakeLists templates for any board, and validate your build config.',
    color: '#3fb950',
    links: [
      { to: '/cmake/learn',      label: 'Learn CMake' },
      { to: '/cmake/playground', label: 'Playground' },
    ],
  },
  {
    icon: '◈',
    title: 'YAML Bindings',
    description: 'Create custom device bindings, understand compatible strings, and generate valid YAML for your own drivers.',
    color: '#bc8cff',
    links: [
      { to: '/yaml/learn',      label: 'Learn YAML' },
      { to: '/yaml/playground', label: 'Playground' },
    ],
  },
]

const STATS = [
  { value: '3,555', label: 'Bindings' },
  { value: '994',   label: 'Boards' },
  { value: '50+',   label: 'Vendors' },
  { value: '15+',   label: 'Categories' },
]

export default function Dashboard() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 32px' }}>

      {/* Hero */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 32, color: '#58a6ff' }}>⬡</span>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px' }}>
            Zephyr Learning Platform
          </h1>
        </div>
        <p style={{ fontSize: 16, color: 'var(--color-muted)', maxWidth: 540, lineHeight: 1.7 }}>
          An interactive playground for Device Tree, CMakeLists, and YAML bindings —
          powered by your local Zephyr installation.
        </p>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 24, marginTop: 28, flexWrap: 'wrap' }}>
          {STATS.map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>
                {s.label} loaded
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Module cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 40 }}>
        {MODULES.map(mod => (
          <div
            key={mod.title}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22, color: mod.color }}>{mod.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{mod.title}</span>
            </div>

            <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.65, flex: 1 }}>
              {mod.description}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {mod.links.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  style={{
                    display: 'block',
                    padding: '7px 12px',
                    borderRadius: 6,
                    fontSize: 13,
                    color: mod.color,
                    background: `${mod.color}12`,
                    border: `1px solid ${mod.color}30`,
                    textDecoration: 'none',
                    transition: 'background .15s',
                  }}
                >
                  {link.label} →
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quick search CTA */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Search all bindings</div>
          <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>
            Try: "pwm esp32s3", "gpio nrf52840", "uart stm32"
          </div>
        </div>
        <Link
          to="/search"
          style={{
            padding: '8px 18px',
            background: '#58a6ff',
            color: '#0d1117',
            borderRadius: 6,
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 13,
            whiteSpace: 'nowrap',
          }}
        >
          🔍 Search
        </Link>
      </div>
    </div>
  )
}
