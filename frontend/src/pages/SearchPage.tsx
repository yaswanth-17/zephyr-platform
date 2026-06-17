// pages/SearchPage.tsx
import { useState, useEffect, useRef } from 'react'
import { search, getBinding } from '../api/client'
import type { SearchResult, Binding } from '../types'

export default function SearchPage() {
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState<SearchResult[]>([])
  const [loading, setLoading]     = useState(false)
  const [selected, setSelected]   = useState<Binding | null>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    clearTimeout(debounce.current)
    if (!query.trim()) { setResults([]); return }
    debounce.current = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await search(query, 30)
        setResults(r.results)
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [query])

  async function openDetail(compatible: string) {
    
    try {
      const b = await getBinding(compatible)
      setSelected(b)
    } finally {
      
    }
  }

  const CAT_COLOR: Record<string, string> = {
    PWM: '#d29922', GPIO: '#3fb950', UART: '#58a6ff',
    SPI: '#bc8cff', I2C: '#f78166', ADC: '#79c0ff',
    CAN: '#ffa657', BLE: '#ff7b72', Flash: '#e3b341',
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '36px 28px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Search Bindings</h1>
      <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 24 }}>
        Search across 3,555 Zephyr bindings. Try "pwm esp32", "gpio nrf52840", "uart stm32".
      </p>

      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', fontSize: 16 }}>🔍</span>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search bindings, peripherals, vendors…"
          style={{
            width: '100%', padding: '11px 14px 11px 40px',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 8, color: 'var(--color-text)', fontSize: 14, outline: 'none',
          }}
        />
        {loading && (
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', fontSize: 12 }}>
            searching…
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 20 }}>

        {/* Results list */}
        <div>
          {results.length === 0 && query && !loading && (
            <div style={{ color: 'var(--color-muted)', fontSize: 13, padding: '24px 0' }}>
              No results for "{query}"
            </div>
          )}

          {results.map(r => {
            const catColor = CAT_COLOR[r.category || ''] || 'var(--color-muted)'
            return (
              <div
                key={r.compatible}
                onClick={() => openDetail(r.compatible)}
                style={{
                  padding: '12px 16px', marginBottom: 6, borderRadius: 8, cursor: 'pointer',
                  background: selected?.compatible === r.compatible ? 'rgba(88,166,255,0.08)' : 'var(--color-surface)',
                  border: selected?.compatible === r.compatible ? '1px solid #58a6ff40' : '1px solid var(--color-border)',
                  transition: 'all .1s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <code style={{ fontSize: 13, color: '#58a6ff', fontFamily: 'var(--font-mono)' }}>
                    {r.compatible}
                  </code>
                  <span style={{
                    fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600,
                    background: `${catColor}20`, color: catColor,
                  }}>
                    {r.category}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                  {r.title?.slice(0, 80)}
                  {r.vendor && <span style={{ marginLeft: 8, color: 'var(--color-border)' }}>· {r.vendor}</span>}
                </div>
              </div>
            )
          })}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 10, padding: 20, position: 'sticky', top: 20, alignSelf: 'start',
            maxHeight: '80vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <code style={{ fontSize: 13, color: '#58a6ff', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>
                  {selected.compatible}
                </code>
                <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{selected.vendor} · {selected.category}</div>
              </div>
              <button onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
            </div>

            {selected.description && (
              <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.7, marginBottom: 16, whiteSpace: 'pre-line' }}>
                {selected.description.slice(0, 400)}{selected.description.length > 400 ? '…' : ''}
              </p>
            )}

            {selected.properties.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>
                  Properties ({selected.properties.length})
                </div>
                {selected.properties.map(p => (
                  <div key={p.name} style={{
                    padding: '7px 10px', borderRadius: 6, marginBottom: 4,
                    background: p.required ? '#0d2a1a' : 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <code style={{ fontSize: 12, color: p.required ? '#3fb950' : '#58a6ff', fontFamily: 'var(--font-mono)' }}>{p.name}</code>
                      <span style={{ fontSize: 10, color: 'var(--color-muted)' }}>{p.type}</span>
                      {p.required && <span style={{ fontSize: 10, color: '#3fb950', marginLeft: 'auto' }}>required</span>}
                    </div>
                    {p.description && (
                      <div style={{ fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
                        {p.description.split('\n')[0].slice(0, 100)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--color-border)', fontSize: 11, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
              {selected.source_file}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
