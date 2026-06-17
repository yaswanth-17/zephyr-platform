// pages/dts/DTSPlayground.tsx
import { useState, useEffect } from 'react'
import { getCategories, getSoCs, getBoards, generateDTS, validateDTS } from '../../api/client'
import type { GenerateResult, ValidateResult, Board } from '../../types'

type Mode = 'generate' | 'validate'

// ── tiny shared UI primitives ──────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 6 }}>
      {children}
    </div>
  )
}

function Select({ value, onChange, disabled, children }: {
  value: string; onChange: (v: string) => void; disabled?: boolean; children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      style={{
        width: '100%', padding: '8px 10px', borderRadius: 6,
        background: 'var(--color-bg)', border: '1px solid var(--color-border)',
        color: disabled ? 'var(--color-muted)' : 'var(--color-text)',
        fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </select>
  )
}

function Btn({ onClick, disabled, color = '#58a6ff', children }: {
  onClick: () => void; disabled?: boolean; color?: string; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '9px 20px', borderRadius: 6, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        background: disabled ? 'var(--color-border)' : color,
        color: disabled ? 'var(--color-muted)' : '#0d1117',
        fontWeight: 600, fontSize: 13, transition: 'opacity .15s',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  )
}

function CodeBlock({ code, language = 'dts' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 14px', background: '#161b22', borderBottom: '1px solid var(--color-border)',
      }}>
        <span style={{ fontSize: 11, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>{language}</span>
        <button onClick={copy} style={{
          background: 'none', border: 'none', color: copied ? 'var(--color-green)' : 'var(--color-muted)',
          cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-mono)',
        }}>
          {copied ? '✓ copied' : 'copy'}
        </button>
      </div>
      <pre style={{
        margin: 0, padding: '14px 16px', overflowX: 'auto',
        background: '#0d1117', fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.7,
        color: '#e6edf3',
      }}>
        {code}
      </pre>
    </div>
  )
}

// ── Issue badge ─────────────────────────────────────────────────────────────

const LEVEL_STYLE: Record<string, { bg: string; color: string; icon: string }> = {
  error:   { bg: '#3d1a1a', color: '#f85149', icon: '✗' },
  warning: { bg: '#2d2008', color: '#d29922', icon: '⚠' },
  ok:      { bg: '#0d2a1a', color: '#3fb950', icon: '✓' },
  hint:    { bg: '#1a1f2d', color: '#79c0ff', icon: '→' },
}

function IssueLine({ issue }: { issue: { level: string; message: string; line: number | null } }) {
  const s = LEVEL_STYLE[issue.level] || LEVEL_STYLE.hint
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: '7px 12px', borderRadius: 6, background: s.bg, marginBottom: 5,
    }}>
      <span style={{ color: s.color, fontWeight: 700, flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
        {s.icon}
      </span>
      <span style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.5 }}>
        {issue.line && <span style={{ color: 'var(--color-muted)', marginRight: 6, fontFamily: 'var(--font-mono)', fontSize: 11 }}>L{issue.line}</span>}
        {issue.message}
      </span>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function DTSPlayground() {
  const [mode, setMode] = useState<Mode>('generate')

  // Dropdown state
  const [categories, setCategories] = useState<string[]>([])
  const [socs, setSocs]             = useState<string[]>([])
  const [boards, setBoards]         = useState<Board[]>([])

  const [peripheral, setPeripheral] = useState('')
  const [soc, setSoc]               = useState('')
  const [board, setBoard]           = useState('')

  // Mode A output
  const [genResult, setGenResult]   = useState<GenerateResult | null>(null)
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError]     = useState('')
  const [activeTab, setActiveTab]   = useState<'overlay' | 'kconfig' | 'explanation'>('overlay')

  // Mode B state
  const [dtsInput, setDtsInput]     = useState('')
  const [valResult, setValResult]   = useState<ValidateResult | null>(null)
  const [valLoading, setValLoading] = useState(false)

  // Load categories on mount
  useEffect(() => {
    getCategories().then(r => {
      setCategories(r.categories)
      if (r.categories.length) setPeripheral(r.categories[0])
    })
    getSoCs().then(r => {
      setSocs(r.socs)
      if (r.socs.length) setSoc(r.socs[0])
    })
  }, [])

  // Load boards when SoC changes
  useEffect(() => {
    if (!soc) return
    getBoards({ soc }).then(r => {
      setBoards(r.boards)
      setBoard(r.boards[0]?.name || '')
    })
  }, [soc])

  async function handleGenerate() {
    if (!peripheral || !soc || !board) return
    setGenLoading(true)
    setGenError('')
    setGenResult(null)
    try {
      const r = await generateDTS({ peripheral, soc, board })
      setGenResult(r)
      setActiveTab('overlay')
    } catch (e: any) {
      setGenError(e.message || 'Generation failed')
    } finally {
      setGenLoading(false)
    }
  }

  async function handleValidate() {
    if (!dtsInput.trim()) return
    setValLoading(true)
    setValResult(null)
    try {
      const r = await validateDTS({ dts_content: dtsInput, peripheral, soc })
      setValResult(r)
    } finally {
      setValLoading(false)
    }
  }

  // ── Selector panel (shared between both modes) ────────────────────────────
  const selectorPanel = (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Context</div>

      <div>
        <Label>Peripheral</Label>
        <Select value={peripheral} onChange={setPeripheral}>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>

      <div>
        <Label>SoC</Label>
        <Select value={soc} onChange={v => { setSoc(v); setBoard('') }}>
          {socs.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>

      <div>
        <Label>Board</Label>
        <Select value={board} onChange={setBoard} disabled={!boards.length}>
          {boards.length === 0
            ? <option>Loading…</option>
            : boards.map(b => <option key={b.name} value={b.name}>{b.name}</option>)
          }
        </Select>
      </div>

      {mode === 'generate' && (
        <Btn onClick={handleGenerate} disabled={genLoading || !board}>
          {genLoading ? 'Generating…' : '⚡ Generate DTS'}
        </Btn>
      )}
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 28px' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>DTS Playground</h1>
        <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>
          Generate overlays automatically or write your own and validate it against real Zephyr bindings.
        </p>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden', width: 'fit-content' }}>
        {(['generate', 'validate'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: '8px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: mode === m ? '#58a6ff' : 'var(--color-surface)',
              color: mode === m ? '#0d1117' : 'var(--color-muted)',
              transition: 'all .15s',
            }}
          >
            {m === 'generate' ? '⚡ Auto Generate' : '✏ Try It Yourself'}
          </button>
        ))}
      </div>

      {/* ── MODE A: Generate ─────────────────────────────────────────────── */}
      {mode === 'generate' && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' }}>
          {selectorPanel}

          <div>
            {genError && (
              <div style={{ padding: 14, borderRadius: 8, background: '#3d1a1a', color: '#f85149', fontSize: 13, marginBottom: 16 }}>
                {genError}
              </div>
            )}

            {!genResult && !genLoading && (
              <div style={{
                border: '1px dashed var(--color-border)', borderRadius: 10,
                padding: '60px 32px', textAlign: 'center', color: 'var(--color-muted)',
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⬡</div>
                <div style={{ fontSize: 14, marginBottom: 6 }}>Select a peripheral, SoC, and board</div>
                <div style={{ fontSize: 12 }}>then click Generate DTS</div>
              </div>
            )}

            {genResult && (
              <div>
                {/* Binding used */}
                <div style={{
                  padding: '8px 14px', background: '#0d2a1a', border: '1px solid #1a4a2a',
                  borderRadius: 6, marginBottom: 16, fontSize: 12,
                  color: 'var(--color-green)', fontFamily: 'var(--font-mono)',
                }}>
                  ✓ Using binding: <strong>{genResult.binding_used}</strong>
                </div>

                {/* Tab bar */}
                <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid var(--color-border)' }}>
                  {(['overlay', 'kconfig', 'explanation'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: '7px 16px', border: 'none', background: 'none', cursor: 'pointer',
                        fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
                        color: activeTab === tab ? 'var(--color-text)' : 'var(--color-muted)',
                        borderBottom: activeTab === tab ? '2px solid #58a6ff' : '2px solid transparent',
                        marginBottom: -1,
                      }}
                    >
                      {tab === 'overlay' ? '📄 Overlay' : tab === 'kconfig' ? '⚙ Kconfig' : '📖 Explanation'}
                    </button>
                  ))}
                </div>

                {activeTab === 'overlay' && (
                  <CodeBlock code={genResult.overlay} language="dts" />
                )}
                {activeTab === 'kconfig' && (
                  <CodeBlock code={genResult.kconfig.join('\n')} language="kconfig" />
                )}
                {activeTab === 'explanation' && (
                  <div style={{
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    borderRadius: 8, padding: '16px 20px', fontSize: 13, lineHeight: 1.8,
                    color: 'var(--color-text)', whiteSpace: 'pre-wrap', fontFamily: 'inherit',
                  }}>
                    {genResult.explanation}
                  </div>
                )}

                {/* Required properties table */}
                {genResult.properties.filter(p => p.required).length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                      Required Properties
                    </div>
                    <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
                      {genResult.properties.filter(p => p.required).map((p, i) => (
                        <div key={p.name} style={{
                          display: 'grid', gridTemplateColumns: '180px 80px 1fr',
                          padding: '8px 14px', fontSize: 12,
                          background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-bg)',
                          borderBottom: '1px solid var(--color-border)',
                          gap: 12, alignItems: 'center',
                        }}>
                          <code style={{ color: '#58a6ff', fontFamily: 'var(--font-mono)' }}>{p.name}</code>
                          <span style={{ color: 'var(--color-muted)' }}>{p.type}</span>
                          <span style={{ color: 'var(--color-muted)' }}>{p.description?.split('\n')[0]?.slice(0, 80)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODE B: Validate ─────────────────────────────────────────────── */}
      {mode === 'validate' && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' }}>
          {selectorPanel}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <Label>Write your DTS here</Label>
              <textarea
                value={dtsInput}
                onChange={e => setDtsInput(e.target.value)}
                placeholder={`&ledc0 {\n\tcompatible = "espressif,esp32-ledc";\n\tstatus = "okay";\n\tpinctrl-0 = <&ledc0_default>;\n\tpinctrl-names = "default";\n\treg = <0>;\n};`}
                spellCheck={false}
                style={{
                  width: '100%', height: 260, padding: '12px 14px',
                  background: '#0d1117', border: '1px solid var(--color-border)',
                  borderRadius: 8, color: 'var(--color-text)',
                  fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.7,
                  resize: 'vertical', outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <Btn onClick={handleValidate} disabled={valLoading || !dtsInput.trim()} color="#3fb950">
                {valLoading ? 'Validating…' : '✓ Validate'}
              </Btn>
              <button
                onClick={() => { setDtsInput(''); setValResult(null) }}
                style={{ padding: '9px 16px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontSize: 13 }}
              >
                Clear
              </button>
            </div>

            {valResult && (
              <div>
                {/* Summary badge */}
                <div style={{
                  padding: '10px 16px', borderRadius: 8, marginBottom: 12,
                  background: valResult.valid ? '#0d2a1a' : '#3d1a1a',
                  border: `1px solid ${valResult.valid ? '#1a4a2a' : '#5a2020'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontWeight: 600, color: valResult.valid ? 'var(--color-green)' : 'var(--color-red)', fontSize: 14 }}>
                    {valResult.valid ? '✓ Valid' : '✗ Invalid'}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{valResult.summary}</span>
                </div>

                {/* Issues list */}
                <div>
                  {valResult.issues.map((issue, i) => (
                    <IssueLine key={i} issue={issue} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
