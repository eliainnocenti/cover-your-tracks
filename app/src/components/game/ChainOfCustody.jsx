// ChainOfCustody.jsx — Forensic audit trail visualization
import { useState } from 'react'
import { ScrollText, ChevronDown, ChevronRight, Shield, Clock } from 'lucide-react'

// Action type → visual config
const ACTION_STYLES = {
  SESSION_START:       { color: 'var(--green-main)',   icon: '⚡' },
  EVIDENCE_LOADED:     { color: 'var(--green-dim)',    icon: '📁' },
  PRE_ASSESSMENT:      { color: 'var(--blue-accent)',  icon: '📝' },
  INVESTIGATION_START: { color: 'var(--green-main)',   icon: '🔍' },
  INVESTIGATION_END:   { color: 'var(--green-main)',   icon: '✔' },
  VIEW_CHANGED:        { color: 'var(--text-ghost)',   icon: '◇',  dim: true },
  EVIDENCE_ACCESS:     { color: 'var(--text-muted)',   icon: '📄', dim: true },
  EVIDENCE_TAGGED:     { color: 'var(--amber-main)',   icon: '🏷' },
  EVIDENCE_UNTAGGED:   { color: 'var(--text-muted)',   icon: '✕',  dim: true },
  HINT_USED:           { color: 'var(--amber-main)',   icon: '💡' },
  FLAG_FOUND:          { color: 'var(--green-main)',   icon: '✓' },
  ALL_FLAGS_FOUND:     { color: 'var(--green-glow)',   icon: '★' },
  WRONG_ATTEMPT:       { color: 'var(--red-alert)',    icon: '✗' },
  POST_ASSESSMENT:     { color: 'var(--blue-accent)',  icon: '📝' },
  TERMINAL_CMD:        { color: 'var(--text-muted)',   icon: '$',  dim: true },
  CONNECTION_FOUND:    { color: 'var(--cyan-accent)',  icon: '🔗' },
}

function fmtTs(ts, startTime) {
  const elapsed = Math.round((ts - startTime) / 1000)
  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  return `+${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function ChainOfCustody({ sessionLog, startTime, compact = false }) {
  const [expanded, setExpanded] = useState(!compact)
  const [showMinor, setShowMinor] = useState(false)

  if (!sessionLog || sessionLog.length === 0) return null

  // Filter minor actions unless toggled
  const displayLog = showMinor
    ? sessionLog
    : sessionLog.filter(e => !ACTION_STYLES[e.action]?.dim)

  return (
    <div style={{
      border: '1px solid var(--border-dim)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--bg-surface)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', background: 'var(--bg-raised)',
          border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)',
          borderBottom: expanded ? '1px solid var(--border-dim)' : 'none',
        }}
      >
        <Shield size={12} style={{ color: 'var(--green-main)' }} />
        <span style={{ fontSize: '9px', color: 'var(--green-main)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
          Chain of Custody
        </span>
        <span style={{ fontSize: '9px', color: 'var(--text-ghost)', marginLeft: 'auto' }}>
          {sessionLog.length} entries
        </span>
        {expanded
          ? <ChevronDown size={11} style={{ color: 'var(--text-muted)' }} />
          : <ChevronRight size={11} style={{ color: 'var(--text-muted)' }} />
        }
      </button>

      {/* Body */}
      {expanded && (
        <div style={{ padding: '8px 0' }}>
          {/* Toggle minor entries */}
          <div style={{ padding: '0 14px 8px', borderBottom: '1px solid var(--bg-raised)' }}>
            <button
              onClick={() => setShowMinor(s => !s)}
              style={{
                fontSize: '9px', color: 'var(--text-muted)', background: 'none',
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                padding: 0,
              }}
            >
              {showMinor ? '◉ Showing all actions' : '○ Show minor actions (views, navigation)'}
            </button>
          </div>

          {/* Entries */}
          <div style={{ maxHeight: compact ? 280 : 400, overflowY: 'auto', padding: '4px 0' }}>
            {displayLog.map((entry, i) => {
              const style = ACTION_STYLES[entry.action] ?? { color: 'var(--text-muted)', icon: '·' }
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '4px 14px',
                  opacity: style.dim ? 0.5 : 1,
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,200,100,0.03)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  {/* Timestamp */}
                  <span style={{
                    fontSize: '9px', color: 'var(--text-ghost)', fontFamily: 'var(--font-mono)',
                    flexShrink: 0, width: 52, textAlign: 'right', marginTop: 1,
                  }}>
                    {fmtTs(entry.ts, startTime)}
                  </span>

                  {/* Timeline dot */}
                  <span style={{
                    fontSize: '10px', width: 16, textAlign: 'center', flexShrink: 0, marginTop: 0,
                  }}>
                    {style.icon}
                  </span>

                  {/* Description */}
                  <span style={{
                    fontSize: '10px', color: style.color, lineHeight: 1.5,
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {entry.detail}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Inline version for investigation screen sidebar
export function ChainOfCustodyInline({ sessionLog, startTime }) {
  return (
    <ChainOfCustody
      sessionLog={sessionLog}
      startTime={startTime}
      compact={true}
    />
  )
}
