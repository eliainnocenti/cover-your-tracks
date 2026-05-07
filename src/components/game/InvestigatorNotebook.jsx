// InvestigatorNotebook.jsx
import { useState } from 'react'
import { BookOpen, Tag, X, CheckCircle, XCircle, Lightbulb, Send, Target } from 'lucide-react'
import { useEngine } from './ScenarioEngine'

export default function InvestigatorNotebook() {
  const { state, untagEvidence, useHint, submitFlag, wrongSubmission } = useEngine()
  const { scenario, taggedEvidence, hintsUsed, score, flagsFound } = state
  const [input, setInput]       = useState('')
  const [lastResult, setResult] = useState(null)
  const [hintsOpen, setHintsOpen] = useState(false)

  if (!scenario) return null

  const totalFlags = scenario.flags.length
  const found      = flagsFound.length
  const progress   = Math.round((found / totalFlags) * 100)

  const handleSubmit = () => {
    if (!input.trim()) return
    const q = input.toLowerCase()
    const match = scenario.flags.find(f => {
      if (flagsFound.find(ff => ff.flagId === f.id)) return false
      return (
        q.includes(f.target?.toLowerCase() ?? '') ||
        q.includes(f.finding?.toLowerCase() ?? '') ||
        q.includes(f.id)
      )
    })
    if (match) {
      submitFlag(match.id)
      setResult({ ok: true, msg: `✓ Confirmed: ${match.description}` })
    } else {
      wrongSubmission()
      setResult({ ok: false, msg: '✗ No matching finding. Re-examine your evidence.' })
    }
    setInput('')
  }

  return (
    <div className="panel flex flex-col h-full">
      {/* Header */}
      <div className="panel-header flex-shrink-0">
        <BookOpen size={12} style={{ color: 'var(--green-main)' }} />
        <span style={{ fontSize: '9px', color: 'var(--green-main)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
          Investigator's Notebook
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '10px', color: score >= 80 ? 'var(--green-main)' : score >= 50 ? 'var(--amber-main)' : 'var(--red-alert)', fontWeight: 700 }}>
            {score} pts
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Progress */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Progress</span>
            <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{found}/{totalFlags} flags</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Tagged Evidence */}
        <div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Tagged Evidence ({taggedEvidence.length})
          </div>
          {taggedEvidence.length === 0
            ? <p style={{ fontSize: '10px', color: 'var(--text-ghost)', fontStyle: 'italic' }}>
                Use the Tag button in the Explorer to collect evidence here.
              </p>
            : taggedEvidence.map(item => (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  background: 'var(--bg-raised)', border: '1px solid var(--border-dim)',
                  borderRadius: 'var(--radius-sm)', padding: '7px 8px', marginBottom: 6,
                }}>
                  <Tag size={10} style={{ color: 'var(--amber-main)', marginTop: 1, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </div>
                    {item.note && (
                      <div style={{ fontSize: '9px', color: 'var(--amber-dim)', marginTop: 2, lineHeight: 1.4 }}>{item.note}</div>
                    )}
                  </div>
                  <button onClick={() => untagEvidence(item.id)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                    <X size={10} />
                  </button>
                </div>
              ))
          }
        </div>

        {/* Confirmed flags */}
        {flagsFound.length > 0 && (
          <div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Confirmed Findings
            </div>
            {flagsFound.map(ff => {
              const flag = scenario.flags.find(f => f.id === ff.flagId)
              return flag ? (
                <div key={ff.flagId} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  background: 'rgba(0,200,100,0.06)', border: '1px solid var(--green-muted)',
                  borderRadius: 'var(--radius-sm)', padding: '7px 8px', marginBottom: 6,
                }}>
                  <CheckCircle size={10} style={{ color: 'var(--green-main)', marginTop: 1, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--green-main)' }}>{flag.target}</div>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{flag.description}</div>
                  </div>
                </div>
              ) : null
            })}
          </div>
        )}

        {/* Submit */}
        <div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
            Submit Finding
          </div>
          <p style={{ fontSize: '10px', color: 'var(--text-ghost)', marginBottom: 6, lineHeight: 1.5 }}>
            Identify the tampered artifact and the technique.<br />
            e.g. "Q2_Report_FINAL.docx — timestomping"
          </p>
          <textarea rows={3} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
            placeholder="Describe your finding..."
          />
          <button className="btn-submit" style={{ marginTop: 6 }} onClick={handleSubmit}>
            <Send size={11} /> Submit Finding
          </button>
          {lastResult && (
            <div style={{
              marginTop: 8, padding: '7px 10px', borderRadius: 'var(--radius-sm)', fontSize: '10px',
              background: lastResult.ok ? 'rgba(0,200,100,0.08)' : 'rgba(255,60,60,0.07)',
              border: `1px solid ${lastResult.ok ? 'var(--green-muted)' : 'var(--red-dim)'}`,
              color: lastResult.ok ? 'var(--green-main)' : 'var(--red-alert)',
              lineHeight: 1.5,
            }}>
              {lastResult.msg}
            </div>
          )}
        </div>

        {/* Hints */}
        <div>
          <button
            onClick={() => setHintsOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: '9px', color: 'var(--amber-main)', background: 'none', border: 'none',
              cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em',
              padding: 0, fontFamily: 'var(--font-mono)',
            }}
          >
            <Lightbulb size={11} />
            Hints ({hintsUsed.length}/{scenario.hints.length} used)
          </button>
          {hintsOpen && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {scenario.hints.map(hint => {
                const used = hintsUsed.includes(hint.tier)
                return (
                  <div key={hint.tier} style={{
                    border: `1px solid ${used ? 'var(--amber-dim)' : 'var(--border-dim)'}`,
                    background: used ? 'rgba(255,184,0,0.05)' : 'var(--bg-raised)',
                    borderRadius: 'var(--radius-sm)', padding: '8px 10px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: used ? 6 : 0 }}>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>TIER {hint.tier}</span>
                      <span style={{ fontSize: '9px', color: 'var(--red-alert)' }}>−{hint.cost} pts</span>
                    </div>
                    {used
                      ? <p style={{ fontSize: '10px', color: 'var(--amber-main)', margin: 0, lineHeight: 1.5 }}>{hint.text}</p>
                      : <button
                          onClick={() => useHint(hint.tier)}
                          style={{
                            fontSize: '10px', color: 'var(--text-muted)', background: 'none',
                            border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-mono)',
                          }}
                        >
                          Reveal (−{hint.cost} pts)
                        </button>
                    }
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
