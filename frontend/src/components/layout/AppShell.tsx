// components/layout/AppShell.tsx

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const NAV = [
  {
    label: 'Device Tree',
    prefix: '/dts',
    icon: '⬡',
    color: '#58a6ff',
    links: [
      { to: '/dts/learn',      label: 'Learn' },
      { to: '/dts/playground', label: 'Playground' },
      { to: '/dts/validate',   label: 'Validate' },
      { to: '/dts/visualize',  label: 'Visualize' },
    ],
  },
  {
    label: 'CMakeLists',
    prefix: '/cmake',
    icon: '⚙',
    color: '#3fb950',
    links: [
      { to: '/cmake/learn',      label: 'Learn' },
      { to: '/cmake/playground', label: 'Playground' },
    ],
  },
  {
    label: 'YAML Bindings',
    prefix: '/yaml',
    icon: '◈',
    color: '#bc8cff',
    links: [
      { to: '/yaml/learn',      label: 'Learn' },
      { to: '/yaml/playground', label: 'Playground' },
    ],
  },
]

interface Props {
  children: React.ReactNode
}

export default function AppShell({ children }: Props) {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>

      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 52 : 220,
        minHeight: '100vh',
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width .2s',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>

        {/* Logo */}
        <div style={{
          padding: '16px 12px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifyContent: collapsed ? 'center' : 'space-between',
        }}>
          {!collapsed && (
            <Link to="/" style={{ textDecoration: 'none', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>⬡</span>
              <span style={{ fontWeight: 600, fontSize: 13, letterSpacing: '-0.3px' }}>Zephyr Learn</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: 14, padding: 4 }}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ padding: '12px 8px', flex: 1 }}>
          {NAV.map(section => {
            // section active state used in link styling
            return (
              <div key={section.prefix} style={{ marginBottom: 20 }}>
                {/* Section header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 6px',
                  marginBottom: 4,
                }}>
                  <span style={{ color: section.color, fontSize: 14 }}>{section.icon}</span>
                  {!collapsed && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      {section.label}
                    </span>
                  )}
                </div>

                {/* Section links */}
                {!collapsed && section.links.map(link => {
                  const active = location.pathname === link.to
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      style={{
                        display: 'block',
                        padding: '5px 10px 5px 22px',
                        fontSize: 13,
                        color: active ? 'var(--color-text)' : 'var(--color-muted)',
                        textDecoration: 'none',
                        borderRadius: 6,
                        background: active ? 'rgba(88,166,255,0.1)' : 'transparent',
                        borderLeft: active ? `2px solid ${section.color}` : '2px solid transparent',
                        marginBottom: 2,
                        transition: 'all .15s',
                      }}
                    >
                      {link.label}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* Bottom: search shortcut */}
        {!collapsed && (
          <div style={{ padding: '12px 8px', borderTop: '1px solid var(--color-border)' }}>
            <Link
              to="/search"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', borderRadius: 6,
                background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                color: 'var(--color-muted)', textDecoration: 'none', fontSize: 12,
              }}
            >
              <span>🔍</span>
              <span>Search bindings</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.5 }}>⌘K</span>
            </Link>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  )
}
