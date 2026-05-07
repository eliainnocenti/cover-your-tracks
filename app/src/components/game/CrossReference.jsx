// CrossReference.jsx — Connect-the-dots evidence linking mechanic
import { useState } from 'react'
import { Link2, CheckCircle, ChevronDown, ChevronRight, Zap } from 'lucide-react'
import { useEngine } from './ScenarioEngine'

export default function CrossReference() {
  const { state, registerConnection } = useEngine()
  const { scenario, taggedEvidence, foundConnections } = state
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState([])
  const [lastResult, setResult] = useState(null)

  // Only show if scenario has defined connections
  const connections = scenario?.connections
  if (!connections || connections.length === 0) return null

  const foundCount = foundConnections.length
  const totalCount = connections.length

  const handleSelect = (evidenceId) => {
    setResult(null)
    setSelected(prev => {
      if (prev.includes(evidenceId)) return prev.filter(id => id !== evidenceId)
      if (prev.length >= 2) return [prev[1], evidenceId]
      return [...prev, evidenceId]
    })
  }

  const handleConnect = () => {
    if (selected.length !== 2) return

    // Check if this pair matches any defined connection
    const [a, b] = selected
    const match = connections.find(c =>
      !foundConnections.includes(c.id) &&
      ((c.evidence1 === a && c.evidence2 === b) ||
       (c.evidence1 === b && c.evidence2 === a) ||
       // Also match by evidence name (case-insensitive)
       (taggedEvidence.find(e => e.id === a)?.name?.toLowerCase().includes(c.evidence1.toLowerCase()) &&
        taggedEvidence.find(e => e.id === b)?.name?.toLowerCase().includes(c.evidence2.toLowerCase())) ||
       (taggedEvidence.find(e => e.id === a)?.name?.toLowerCase().includes(c.evidence2.toLowerCase()) &&
        taggedEvidence.find(e => e.id === b)?.name?.toLowerCase().includes(c.evidence1.toLowerCase()))
    ))

    if (match) {
      registerConnection({
        connectionId: match.id,
        description: match.description,
        points: match.points,
        evidence1: match.evidence1,
        evidence2: match.evidence2,
      })
      setResult({ ok: true, msg: `🔗 Connection found: ${match.description} (+${match.points} pts)` })
    } else {
      setResult({ ok: false, msg: '✗ No known forensic connection between these evidence items.' })
    }
    setSelected([])
  }

  return (
    <div style={{
      border: `1px solid ${foundCount > 0 ? 'var(--cyan-accent)' : 'var(--border-dim)'}`,
      borderRadius: 'var(--radius-sm)',
      background: foundCount > 0 ? 'rgba(0,229,204,0.03)' : 'var(--bg-raised)',
      overflow: 'hidden',
      transition: 'border-color 0.3s',
    }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 10px', background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: 'var(--font-mono)',
        }}
      >
        <Link2 size={11} style={{ color: 'var(--cyan-accent)' }} />
        <span style={{ fontSize: '9px', color: 'var(--cyan-accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Cross-Reference ({foundCount}/{totalCount})
        </span>
        <div style={{ marginLeft: 'auto' }}>
          {open
            ? <ChevronDown size={10} style={{ color: 'var(--text-muted)' }} />
            : <ChevronRight size={10} style={{ color: 'var(--text-muted)' }} />
          }
        </div>
      </button>

      {/* Body */}
      {open && (
        <div style={{ padding: '0 10px 10px', maxHeight: '250px', overflowY: 'auto' }}>
          <p style={{ fontSize: '9px', color: 'var(--text-ghost)', lineHeight: 1.6, marginBottom: 8, marginTop: 0 }}>
            Select two tagged evidence items to cross-reference them.
            Finding hidden connections earns bonus points.
          </p>

          {/* Tagged evidence selector */}
          {taggedEvidence.length < 2 ? (
            <p style={{ fontSize: '10px', color: 'var(--text-ghost)', fontStyle: 'italic' }}>
              Tag at least 2 evidence items to use cross-referencing.
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                {taggedEvidence.map(item => {
                  const isSelected = selected.includes(item.id)
                  const isFound = foundConnections.some(cId => {
                    const conn = connections.find(c => c.id === cId)
                    return conn && (
                      item.name.toLowerCase().includes(conn.evidence1.toLowerCase()) ||
                      item.name.toLowerCase().includes(conn.evidence2.toLowerCase())
                    )
                  })
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '5px 8px', borderRadius: 'var(--radius-sm)',
                        background: isSelected ? 'rgba(0,229,204,0.1)' : 'var(--bg-surface)',
                        border: `1px solid ${isSelected ? 'rgba(0,229,204,0.4)' : 'var(--border-dim)'}`,
                        cursor: 'pointer', fontFamily: 'var(--font-mono)',
                        fontSize: '10px', color: isSelected ? 'var(--cyan-accent)' : 'var(--text-secondary)',
                        textAlign: 'left', width: '100%',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{
                        width: 12, height: 12, borderRadius: 2,
                        border: `1px solid ${isSelected ? 'var(--cyan-accent)' : 'var(--border-mid)'}`,
                        background: isSelected ? 'var(--cyan-accent)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, fontSize: '8px', color: 'var(--bg-base)',
                      }}>
                        {isSelected ? '✓' : ''}
                      </span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </span>
                      {isFound && (
                        <CheckCircle size={9} style={{ color: 'var(--green-main)', marginLeft: 'auto', flexShrink: 0 }} />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Connect button */}
              <button
                onClick={handleConnect}
                disabled={selected.length !== 2}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  width: '100%', padding: '7px',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-mono)', fontSize: '10px',
                  cursor: selected.length === 2 ? 'pointer' : 'not-allowed',
                  border: `1px solid ${selected.length === 2 ? 'rgba(0,229,204,0.4)' : 'var(--border-dim)'}`,
                  background: selected.length === 2 ? 'rgba(0,229,204,0.08)' : 'var(--bg-raised)',
                  color: selected.length === 2 ? 'var(--cyan-accent)' : 'var(--text-ghost)',
                  transition: 'all 0.15s',
                  letterSpacing: '0.05em',
                }}
              >
                <Zap size={10} /> Cross-Reference Evidence
              </button>
            </>
          )}

          {/* Result feedback */}
          {lastResult && (
            <div style={{
              marginTop: 8, padding: '7px 10px', borderRadius: 'var(--radius-sm)', fontSize: '10px',
              background: lastResult.ok ? 'rgba(0,229,204,0.08)' : 'rgba(255,60,60,0.07)',
              border: `1px solid ${lastResult.ok ? 'rgba(0,229,204,0.3)' : 'var(--red-dim)'}`,
              color: lastResult.ok ? 'var(--cyan-accent)' : 'var(--red-alert)',
              lineHeight: 1.5,
            }}>
              {lastResult.msg}
            </div>
          )}

          {/* Found connections list */}
          {foundCount > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                Discovered Links
              </div>
              {foundConnections.map(cId => {
                const conn = connections.find(c => c.id === cId)
                if (!conn) return null
                return (
                  <div key={cId} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 6,
                    padding: '5px 8px', marginBottom: 4,
                    background: 'rgba(0,229,204,0.05)',
                    border: '1px solid rgba(0,229,204,0.15)',
                    borderRadius: 'var(--radius-sm)',
                  }}>
                    <Link2 size={9} style={{ color: 'var(--cyan-accent)', marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--cyan-accent)' }}>
                        {conn.evidence1} ↔ {conn.evidence2}
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                        {conn.description}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
