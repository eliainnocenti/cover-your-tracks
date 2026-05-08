// InvestigatorNotebook.jsx
import { useState } from 'react'
import { BookOpen, Tag, X, CheckCircle, XCircle, Lightbulb, Send, Target } from 'lucide-react'
import { useEngine } from './ScenarioEngine'
import CrossReference from './CrossReference'

const MASTER_TAXONOMY = [
  "0xE5 Deletion", "Anomalous Image", "ARP Poisoning", "Buffer Overflow",
  "Command Injection", "Cross-Site Scripting (XSS)", "Data Exfiltration",
  "Data Hiding", "DKOM", "DLL Hijacking", "DNS Tunneling", "Embedded Payload",
  "Hidden Process", "ICMP Exfiltration", "Keylogger", "Log Wiping",
  "LSB Steganography", "MAC Spoofing", "Memory Dump", "Pass-the-Hash",
  "PE Header Injection", "Phishing", "Privilege Escalation", "Ransomware Payload",
  "Registry Persistence", "Reverse Shell", "Rootkit", "Salary Data",
  "Scheduled Task", "Slack Space", "SQL Injection", "Suspicious Domain",
  "Timestomping", "Tool Artifact", "Typosquatting", "Zero-Day Exploit", "/etc/passwd"
].sort()

export default function InvestigatorNotebook() {
  const { state, untagEvidence, useHint, submitFlag, wrongSubmission } = useEngine()
  const { scenario, taggedEvidence, hintsUsed, score, flagsFound } = state
  const [selectedEvidenceId, setSelectedEvidenceId] = useState('')
  const [techniqueInput, setTechniqueInput] = useState('')
  const [lastResult, setResult] = useState(null)
  const [hintsOpen, setHintsOpen] = useState(false)

  if (!scenario) return null

  const totalFlags = scenario.flags.length
  const found      = flagsFound.length
  const progress   = Math.round((found / totalFlags) * 100)

  const handleSubmit = () => {
    if (!selectedEvidenceId) {
      setResult({ ok: false, msg: '✗ Please select a piece of tagged evidence first.' })
      return
    }
    if (!techniqueInput.trim()) {
      setResult({ ok: false, msg: '✗ Please enter a finding or technique.' })
      return
    }

    const evidence = taggedEvidence.find(e => e.id === selectedEvidenceId)
    if (!evidence) return

    const sanitize = s => (s || '').toLowerCase().replace(/[\s_\-]/g, '')
    const q = sanitize(techniqueInput)
    const match = scenario.flags.find(f => {
      if (flagsFound.find(ff => ff.flagId === f.id)) return false
      
      // 1. Evidence must match the flag's target (bi-directional check)
      const targetMatch = evidence.name.toLowerCase().includes(f.target?.toLowerCase() ?? '') || 
                          (f.target?.toLowerCase() ?? '').includes(evidence.name.toLowerCase())
      
      if (!targetMatch) return false
      
      // 2. Technique must match the finding
      const fFinding = sanitize(f.finding)
      return q.includes(fFinding) || (fFinding.includes(q) && q.length > 3)
    })

    if (match) {
      submitFlag(match.id)
      setResult({ ok: true, msg: `✓ Confirmed: ${match.description}` })
      setTechniqueInput('')
      setSelectedEvidenceId('')
    } else {
      wrongSubmission()
      setResult({ ok: false, msg: '✗ Incorrect evidence or technique. Re-examine your findings.' })
    }
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

        {/* Cross-reference evidence */}
        <CrossReference />

        {/* Submit */}
        <div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
            Submit Finding
          </div>
          <p style={{ fontSize: '10px', color: 'var(--text-ghost)', marginBottom: 6, lineHeight: 1.5 }}>
            Select the suspicious artifact and identify the technique.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <EvidenceDropdown 
              value={selectedEvidenceId} 
              options={taggedEvidence} 
              onChange={setSelectedEvidenceId} 
              placeholder="-- Select Tagged Evidence --" 
            />
            
            <CustomAutocomplete 
              value={techniqueInput} 
              options={MASTER_TAXONOMY} 
              onChange={setTechniqueInput} 
              onEnter={handleSubmit} 
              placeholder="e.g. Timestomping..." 
            />
          </div>
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
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: 6 }}>
            Wrong submissions are penalized only if you later use a hint.
          </div>
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

function CustomAutocomplete({ value, options, onChange, placeholder, onEnter }) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)

  // Keep internal state synced if cleared from parent
  if (value === '' && inputValue !== '') setInputValue('')

  const filtered = options.filter(o => o.toLowerCase().includes(inputValue.toLowerCase()))

  return (
    <div style={{ position: 'relative' }}>
      <input 
        value={inputValue}
        onChange={e => {
          setInputValue(e.target.value)
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onKeyDown={e => { if (e.key === 'Enter') { setOpen(false); onEnter && onEnter() } }}
        placeholder={placeholder}
        style={{
          fontFamily: 'var(--font-mono)', fontSize: '11px',
          background: 'var(--bg-raised)', color: 'var(--text-primary)',
          border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)',
          padding: '6px 8px', outline: 'none', width: '100%'
        }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--bg-surface)', border: '1px solid var(--green-dim)', 
          borderTop: 'none', maxHeight: '150px', overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)', borderBottomLeftRadius: 'var(--radius-sm)', borderBottomRightRadius: 'var(--radius-sm)'
        }}>
          {filtered.map(o => (
            <div 
              key={o}
              onClick={() => { 
                setInputValue(o); 
                onChange(o); 
                setOpen(false) 
              }}
              style={{
                padding: '6px 8px', fontSize: '11px', fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)', cursor: 'pointer',
                borderBottom: '1px solid var(--border-dim)'
              }}
              onMouseEnter={e => { e.target.style.background = 'rgba(0,200,100,0.1)'; e.target.style.color = 'var(--green-main)' }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--text-primary)' }}
            >
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EvidenceDropdown({ value, options, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.id === value)
  return (
    <div 
      style={{ position: 'relative', outline: 'none' }}
      tabIndex={0}
      onBlur={() => setTimeout(() => setOpen(false), 200)}
    >
      <div 
        onClick={() => setOpen(!open)}
        style={{
          fontFamily: 'var(--font-mono)', fontSize: '11px',
          background: 'var(--bg-raised)', color: selected ? 'var(--text-primary)' : 'var(--text-ghost)',
          border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)',
          padding: '6px 8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.name : placeholder}
        </span>
        <span style={{ fontSize: '8px' }}>▼</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--bg-surface)', border: '1px solid var(--green-dim)', 
          borderTop: 'none', maxHeight: '150px', overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)', borderBottomLeftRadius: 'var(--radius-sm)', borderBottomRightRadius: 'var(--radius-sm)'
        }}>
          {options.length === 0 ? (
            <div style={{ padding: '6px 8px', fontSize: '10px', color: 'var(--text-ghost)', fontStyle: 'italic' }}>
              No tagged evidence
            </div>
          ) : options.map(o => (
            <div 
              key={o.id}
              onClick={() => { onChange(o.id); setOpen(false) }}
              style={{
                padding: '6px 8px', fontSize: '11px', fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)', cursor: 'pointer',
                borderBottom: '1px solid var(--border-dim)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}
              onMouseEnter={e => { e.target.style.background = 'rgba(0,200,100,0.1)'; e.target.style.color = 'var(--green-main)' }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--text-primary)' }}
            >
              {o.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
