// InvestigatorNotebook.jsx
import { useState } from 'react'
import { BookOpen, Tag, X, CheckCircle, Lightbulb, Send } from 'lucide-react'
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

  // Only count required flags for progress display
  const requiredFlags = scenario.flags.filter(f => f.required !== false)
  const totalFlags = requiredFlags.length
  const found = flagsFound.filter(ff => requiredFlags.some(rf => rf.id === ff.flagId)).length
  const progress = Math.round((found / totalFlags) * 100)

  const handleSubmit = () => {
    if (!selectedEvidenceId) {
      setResult({ ok: false, msg: '✗ Select a piece of tagged evidence first.' })
      return
    }
    if (!techniqueInput.trim()) {
      setResult({ ok: false, msg: '✗ Enter a finding or technique.' })
      return
    }

    const evidence = taggedEvidence.find(e => e.id === selectedEvidenceId)
    if (!evidence) return

    const sanitize = s => (s || '').toLowerCase().replace(/[\s_\-]/g, '')
    const q = sanitize(techniqueInput)

    const match = scenario.flags.find(f => {
      if (flagsFound.find(ff => ff.flagId === f.id)) return false

      // ── evidence matching ──────────────────────────────────────────────────
      // For filesystem evidence: compare the file name against the flag target.
      // For RAM evidence: the evidence name is "processName (PID N)", so check
      //   both the process name part and the raw target.
      // For network evidence: the evidence name is "PROTO src → dst", so we
      //   check whether the flag target (e.g. "ICMP to 185.220.101.47") has
      //   substrings that match the evidence name components.
      const eName = evidence.name.toLowerCase()
      const eType = evidence.type  // 'file' | 'process' | 'network'
      const fTarget = (f.target ?? '').toLowerCase()

      let targetMatch = false

      if (eType === 'file') {
        targetMatch =
          eName.includes(fTarget) ||
          fTarget.includes(eName.split('\\').pop() ?? eName)  // basename match
      } else if (eType === 'process') {
        // evidence name is "winlogon_helper.exe (PID 3580)"
        // flag target might be "winlogon_helper.exe" or "winlogon_helper"
        const procName = eName.split(' (pid')[0]
        targetMatch =
          procName.includes(fTarget) ||
          fTarget.includes(procName) ||
          sanitize(procName).includes(sanitize(fTarget))
      } else if (eType === 'network') {
        // evidence name is "ICMP 10.1.1.50 → 185.220.101.47"
        // flag target might be "ICMP to 185.220.101.47"
        // Match: does the evidence contain the IP from the flag target?
        const ipMatch = fTarget.match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/g) ?? []
        const protoMatch = fTarget.split(' ')[0]  // "ICMP", "DNS", etc.
        targetMatch =
          (ipMatch.length > 0 && ipMatch.some(ip => eName.includes(ip))) ||
          (protoMatch && eName.includes(protoMatch.toLowerCase()) && fTarget.length >= 4)
      }

      if (!targetMatch) return false

      // ── technique matching ─────────────────────────────────────────────────
      const fFinding = sanitize(f.finding)
      return q.includes(fFinding) || (fFinding.includes(q) && q.length > 3)
    })

    if (match) {
      submitFlag(match.id)
      setResult({ ok: true, msg: `✓ Confirmed: ${match.description}` })
      setTechniqueInput('')
      setSelectedEvidenceId('')
    } else {
      // Pass the best-guess flagId context so the engine can track per-flag deferred penalties.
      // If we can narrow it down to one flag by evidence alone, use that; otherwise 'unknown'.
      const evidenceOnlyMatch = scenario.flags.find(f => {
        if (flagsFound.find(ff => ff.flagId === f.id)) return false
        const fTarget = (f.target ?? '').toLowerCase()
        const eName = evidence.name.toLowerCase()
        if (evidence.type === 'file') return eName.includes(fTarget) || fTarget.includes(eName.split('\\').pop() ?? eName)
        if (evidence.type === 'process') return eName.split(' (pid')[0].includes(fTarget) || fTarget.includes(eName.split(' (pid')[0])
        return false
      })
      wrongSubmission(evidenceOnlyMatch?.id ?? 'unknown')
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
        <div style={{ marginLeft: 'auto' }}>
          <span style={{
            fontSize: '10px', fontWeight: 700,
            color: score >= 80 ? 'var(--green-main)' : score >= 50 ? 'var(--amber-main)' : 'var(--red-alert)',
          }}>
            {score} pts
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Progress (required flags only) */}
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
              Use the Tag button in Explorer, RAM, or Network views to collect evidence.
            </p>
            : taggedEvidence.map(item => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                background: 'var(--bg-raised)', border: '1px solid var(--border-dim)',
                borderRadius: 'var(--radius-sm)', padding: '7px 8px', marginBottom: 6,
              }}>
                <Tag size={10} style={{
                  color: item.type === 'network' ? 'var(--cyan-accent)'
                    : item.type === 'process' ? 'var(--red-alert)'
                      : 'var(--amber-main)',
                  marginTop: 1, flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </div>
                  {item.note && (
                    <div style={{ fontSize: '9px', color: 'var(--amber-dim)', marginTop: 2, lineHeight: 1.4 }}>{item.note}</div>
                  )}
                  <div style={{ fontSize: '8px', color: 'var(--text-ghost)', marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {item.type}
                  </div>
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
              const isBonus = flag?.required === false
              return flag ? (
                <div key={ff.flagId} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  background: isBonus ? 'rgba(0,229,204,0.06)' : 'rgba(0,200,100,0.06)',
                  border: `1px solid ${isBonus ? 'rgba(0,229,204,0.3)' : 'var(--green-muted)'}`,
                  borderRadius: 'var(--radius-sm)', padding: '7px 8px', marginBottom: 6,
                }}>
                  <CheckCircle size={10} style={{ color: isBonus ? 'var(--cyan-accent)' : 'var(--green-main)', marginTop: 1, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '10px', color: isBonus ? 'var(--cyan-accent)' : 'var(--green-main)' }}>
                      {flag.target}
                      {isBonus && <span style={{ fontSize: '8px', marginLeft: 5, opacity: 0.7 }}>BONUS</span>}
                    </div>
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
            Select a tagged artifact and identify the technique.
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
              placeholder="Identify the technique..."
              onEnter={handleSubmit}
            />
            <button
              onClick={handleSubmit}
              disabled={!selectedEvidenceId || !techniqueInput.trim()}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px',
                cursor: selectedEvidenceId && techniqueInput.trim() ? 'pointer' : 'not-allowed',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--green-dim)',
                background: 'rgba(0,200,100,0.08)',
                color: 'var(--green-main)',
                letterSpacing: '0.05em',
              }}
            >
              <Send size={11} /> Submit Finding
            </button>
          </div>

          {lastResult && (
            <div style={{
              marginTop: 8, padding: '8px 10px', borderRadius: 'var(--radius-sm)',
              background: lastResult.ok ? 'rgba(0,200,100,0.08)' : 'rgba(255,60,60,0.07)',
              border: `1px solid ${lastResult.ok ? 'var(--green-muted)' : 'var(--red-dim)'}`,
              fontSize: '11px',
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
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
            Wrong guesses are free if you find the answer yourself.
            They cost points only after you've used a hint.
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

// ── Sub-components ────────────────────────────────────────────────────────────

function CustomAutocomplete({ value, options, onChange, placeholder, onEnter }) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)

  if (value === '' && inputValue !== '') setInputValue('')

  const filtered = options.filter(o => o.toLowerCase().includes(inputValue.toLowerCase()))

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={inputValue}
        onChange={e => { setInputValue(e.target.value); onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onKeyDown={e => { if (e.key === 'Enter') { setOpen(false); onEnter && onEnter() } }}
        placeholder={placeholder}
        style={{
          fontFamily: 'var(--font-mono)', fontSize: '11px',
          background: 'var(--bg-raised)', color: 'var(--text-primary)',
          border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)',
          padding: '6px 8px', outline: 'none', width: '100%',
        }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--bg-surface)', border: '1px solid var(--green-dim)',
          borderTop: 'none', maxHeight: '150px', overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          borderBottomLeftRadius: 'var(--radius-sm)', borderBottomRightRadius: 'var(--radius-sm)',
        }}>
          {filtered.map(o => (
            <div
              key={o}
              onClick={() => { setInputValue(o); onChange(o); setOpen(false) }}
              style={{
                padding: '6px 8px', fontSize: '11px', fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)', cursor: 'pointer',
                borderBottom: '1px solid var(--border-dim)',
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

  // Color-code evidence type in the dropdown
  const typeColor = (type) =>
    type === 'network' ? 'var(--cyan-accent)'
      : type === 'process' ? 'var(--red-alert)'
        : 'var(--amber-main)'

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
          alignItems: 'center',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.name : placeholder}
        </span>
        <span style={{ fontSize: '8px', flexShrink: 0, marginLeft: 4 }}>▼</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--bg-surface)', border: '1px solid var(--green-dim)',
          borderTop: 'none', maxHeight: '150px', overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          borderBottomLeftRadius: 'var(--radius-sm)', borderBottomRightRadius: 'var(--radius-sm)',
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
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,200,100,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: '8px', color: typeColor(o.type), flexShrink: 0, textTransform: 'uppercase' }}>
                {o.type}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {o.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
