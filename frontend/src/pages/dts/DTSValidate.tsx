// pages/dts/DTSValidate.tsx
// Standalone validate page (same logic as Mode B in playground, larger layout)
import { useState } from 'react'
import { validateDTS } from '../../api/client'
import type { ValidateResult } from '../../types'

const LEVEL_STYLE: Record<string, { bg: string; color: string; icon: string }> = {
  error:   { bg: '#3d1a1a', color: '#f85149', icon: '✗' },
  warning: { bg: '#2d2008', color: '#d29922', icon: '⚠' },
  ok:      { bg: '#0d2a1a', color: '#3fb950', icon: '✓' },
  hint:    { bg: '#1a1f2d', color: '#79c0ff', icon: '→' },
}

const EXAMPLE = `/* Example: PWM on ESP32-S3 */
&pinctrl {
\tledc0_default: ledc0_default {
\t\tgroup1 {
\t\t\tpinmux = <LEDC_CH0_GPIO4>;
\t\t\toutput-enable;
\t\t};
\t};
};

&ledc0 {
\tcompatible = "espressif,esp32-ledc";
\tstatus = "okay";
\tpinctrl-0 = <&ledc0_default>;
\tpinctrl-names = "default";
\treg = <0>;
};`

export default function DTSValidate() {
  const [input, setInput]     = useState('')
  const [result, setResult]   = useState<ValidateResult | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleValidate() {
    if (!input.trim()) return
    setLoading(true)
    try {
      const r = await validateDTS({ dts_content: input })
      setResult(r)
    } finally {
      setLoading(false)
    }
  }

  const errorCount   = result?.issues.filter(i => i.level === 'error').length   ?? 0
  const warningCount = result?.issues.filter(i => i.level === 'warning').length ?? 0
  const okCount      = result?.issues.filter(i => i.level === 'ok').length      ?? 0

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '36px 28px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>DTS Validator</h1>
        <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>
          Paste any Device Tree Source content and get instant feedback against real Zephyr bindings.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Left: editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
              DTS Content
            </span>
            <button
              onClick={() => setInput(EXAMPLE)}
              style={{ fontSize: 11, color: '#58a6ff', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Load example
            </button>
          </div>

          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Paste your .overlay or .dts content here…"
            spellCheck={false}
            style={{
              width: '100%', height: 400, padding: '12px 14px',
              background: '#0d1117', border: '1px solid var(--color-border)',
              borderRadius: 8, color: 'var(--color-text)',
              fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.7,
              resize: 'vertical', outline: 'none',
            }}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleValidate}
              disabled={loading || !input.trim()}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 6, border: 'none',
                background: loading || !input.trim() ? 'var(--color-border)' : '#3fb950',
                color: loading || !input.trim() ? 'var(--color-muted)' : '#0d1117',
                fontWeight: 600, fontSize: 13, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Validating…' : '✓ Validate'}
            </button>
            <button
              onClick={() => { setInput(''); setResult(null) }}
              style={{
                padding: '9px 16px', borderRadius: 6,
                border: '1px solid var(--color-border)', background: 'none',
                color: 'var(--color-muted)', cursor: 'pointer', fontSize: 13,
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Right: results */}
        <div>
          {!result && (
            <div style={{
              border: '1px dashed var(--color-border)', borderRadius: 10,
              height: 400, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', gap: 8,
            }}>
              <div style={{ fontSize: 28 }}>⬡</div>
              <div style={{ fontSize: 13 }}>Validation results will appear here</div>
            </div>
          )}

          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Summary */}
              <div style={{
                padding: '14px 18px', borderRadius: 8,
                background: result.valid ? '#0d2a1a' : '#3d1a1a',
                border: `1px solid ${result.valid ? '#1a4a2a' : '#5a2020'}`,
              }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: result.valid ? 'var(--color-green)' : 'var(--color-red)', marginBottom: 8 }}>
                  {result.valid ? '✓ Valid DTS' : '✗ Invalid DTS'}
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ fontSize: 12, color: '#f85149' }}>{errorCount} error{errorCount !== 1 ? 's' : ''}</span>
                  <span style={{ fontSize: 12, color: '#d29922' }}>{warningCount} warning{warningCount !== 1 ? 's' : ''}</span>
                  <span style={{ fontSize: 12, color: '#3fb950' }}>{okCount} passed</span>
                </div>
              </div>

              {/* Issues */}
              <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {result.issues.map((issue, i) => {
                  const s = LEVEL_STYLE[issue.level] || LEVEL_STYLE.hint
                  return (
                    <div key={i} style={{
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                      padding: '8px 12px', borderRadius: 6, background: s.bg,
                    }}>
                      <span style={{ color: s.color, fontWeight: 700, flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 12, marginTop: 1 }}>
                        {s.icon}
                      </span>
                      <span style={{ fontSize: 12.5, color: 'var(--color-text)', lineHeight: 1.5 }}>
                        {issue.line && (
                          <span style={{ color: 'var(--color-muted)', marginRight: 6, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                            L{issue.line}
                          </span>
                        )}
                        {issue.message}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
