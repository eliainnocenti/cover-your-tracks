// Debrief.jsx
import { BookOpen, TrendingUp, TrendingDown, Clock, Target, Lightbulb, Award, ChevronRight, Minus, Link2, Shield } from 'lucide-react'
import { useEngine } from './ScenarioEngine'
import { QUIZ_TIER_META } from './ScenarioEngine'
import ChainOfCustody from './ChainOfCustody'

export default function Debrief({ onNext }) {
  const { state, metrics } = useEngine()
  const { scenario } = state
  if (!scenario) return null
  const d = scenario.debriefing
  const quizSkipped = metrics?.quizSkipped
  const tierMeta = QUIZ_TIER_META[metrics?.quizTier ?? 'skipped']

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <BookOpen size={18} style={{ color: 'var(--green-main)' }} />
        <div>
          <div style={{ color: 'var(--green-main)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Case Debrief
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: 3 }}>{scenario.title}</div>
        </div>
      </div>

      {/* Metrics grid */}
      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <MetricCard icon={<Award size={13} style={{ color: 'var(--amber-main)' }} />} label="Final Score"
            value={metrics.finalScore}
            valueColor={metrics.finalScore >= 80 ? 'var(--green-main)' : metrics.finalScore >= 50 ? 'var(--amber-main)' : 'var(--red-alert)'}
          />
          <MetricCard icon={<Clock size={13} style={{ color: 'var(--blue-accent)' }} />} label="Time"
            value={fmtTime(metrics.totalTimeSeconds)} valueColor="var(--blue-accent)"
          />
          <MetricCard
            icon={<span style={{ fontSize: 15 }}>{tierMeta.emoji}</span>}
            label="Quiz Mastery"
            value={tierMeta.label}
            sub={quizSkipped
              ? 'Assessment skipped'
              : `${metrics.preQuizScore ?? 0}% → ${metrics.postQuizScore ?? 0}%`
            }
            valueColor={tierMeta.color}
          />
          <MetricCard icon={<Target size={13} style={{ color: 'var(--green-main)' }} />} label="Flags Found"
            value={metrics.bonusFlagsFound > 0
              ? `${metrics.flagsFound}/${metrics.totalFlags} +${metrics.bonusFlagsFound}★`
              : `${metrics.flagsFound}/${metrics.totalFlags}`
            } valueColor="var(--green-main)"
          />
          <MetricCard icon={<Lightbulb size={13} style={{ color: 'var(--amber-main)' }} />} label="Hints Used"
            value={metrics.hintsUsedCount}
            valueColor={metrics.hintsUsedCount === 0 ? 'var(--green-main)' : 'var(--amber-main)'}
          />
          <MetricCard icon={<span style={{ color: 'var(--red-alert)', fontSize: 13 }}>✗</span>} label="Wrong Attempts"
            value={metrics.wrongAttempts}
            valueColor={metrics.wrongAttempts === 0 ? 'var(--green-main)' : 'var(--red-alert)'}
          />
        </div>
      )}

      {/* Penalty explainer (D4) */}
      {metrics && metrics.wrongAttempts > 0 && (
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--radius-md)',
          background: 'rgba(255,60,60,0.04)', border: '1px solid var(--red-dim)',
          fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 1.6,
        }}>
          <span style={{ color: 'var(--red-alert)', fontWeight: 700 }}>Penalty breakdown:</span>{' '}
          {metrics.hintsUsedCount > 0
            ? `You had ${metrics.wrongAttempts} wrong attempt${metrics.wrongAttempts !== 1 ? 's' : ''}. `
            + `Guesses made after your first hint cost -5 pts each. `
            + `Any guesses you made before using hints were forgiven if you found the answer yourself.`
            : `You had ${metrics.wrongAttempts} wrong attempt${metrics.wrongAttempts !== 1 ? 's' : ''}, `
            + `but since you never used a hint, all penalties were forgiven. Well done!`
          }
        </div>
      )}

      {/* Chain of Custody audit trail */}
      {metrics?.sessionLog && (
        <ChainOfCustody
          sessionLog={metrics.sessionLog}
          startTime={state.startTime}
        />
      )}

      {/* Forensic Chain of Custody Review Card */}
      {(() => {
        const filesTagged = state.taggedEvidence?.filter(e => e.type === 'file') || []
        const filesAnalyzedCount = filesTagged.filter(f => state.analyzedFiles?.includes(f.path)).length
        const custodyPercent = filesTagged.length > 0
          ? Math.round((filesAnalyzedCount / filesTagged.length) * 100)
          : 100

        return (
          <div style={{
            border: `1px solid ${custodyPercent === 100 ? 'var(--green-muted)' : 'var(--amber-dim)'}`,
            borderRadius: 'var(--radius-md)',
            background: custodyPercent === 100 ? 'rgba(0,200,100,0.04)' : 'rgba(255,184,0,0.04)',
            padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={12} style={{ color: custodyPercent === 100 ? 'var(--green-main)' : 'var(--amber-main)' }} />
                <span style={{ fontSize: '9px', color: custodyPercent === 100 ? 'var(--green-main)' : 'var(--amber-main)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                  Forensic Custody Review
                </span>
              </div>
              <span style={{
                fontSize: '9px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                background: custodyPercent === 100 ? 'rgba(0,200,100,0.12)' : 'rgba(255,184,0,0.12)',
                color: custodyPercent === 100 ? 'var(--green-main)' : 'var(--amber-main)',
                border: `1px solid ${custodyPercent === 100 ? 'var(--green-dim)' : 'var(--amber-dim)'}`
              }}>
                {custodyPercent === 100 ? '[ SECURE CUSTODY — 100% ]' : `[ UNVERIFIED CUSTODY — ${custodyPercent}% ]`}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {custodyPercent === 100 ? (
                <span>Excellent work! You verified all submitted file findings using low-level terminal diagnostics (<code>stat</code>, <code>istat</code>, <code>zsteg</code>, <code>exiftool</code>, or <code>blkls</code>) before documenting them in your notebook. The chain of custody is structurally intact and court-admissible.</span>
              ) : (
                <span>Warning: You submitted file evidence without performing low-level terminal verification. In real-world digital forensics, GUI file attributes can be easily altered or spoofed. Always run terminal commands to verify deep sector structures and MFT records.</span>
              )}
            </div>
          </div>
        )
      })()}

      {/* Cross-reference connections summary */}
      {metrics?.connectionsFound > 0 && (
        <div style={{
          border: '1px solid rgba(0,229,204,0.2)', borderRadius: 'var(--radius-md)',
          background: 'rgba(0,229,204,0.04)', padding: '12px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Link2 size={12} style={{ color: 'var(--cyan-accent)' }} />
            <span style={{ fontSize: '9px', color: 'var(--cyan-accent)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
              Evidence Connections
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            You discovered <b style={{ color: 'var(--cyan-accent)' }}>{metrics.connectionsFound}/{metrics.totalConnections}</b> cross-evidence links,
            demonstrating an ability to correlate findings across different forensic domains.
          </div>
        </div>
      )}

      {/* Technical debrief */}
      <div className="panel">
        <div className="panel-header">
          <span style={{ fontSize: '9px', color: 'var(--green-main)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
            Technical Breakdown — {d.title}
          </span>
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <DebriefSection title="How it works">{d.concept}</DebriefSection>
          <DebriefSection title="Real-world tools">{d.realWorldTool}</DebriefSection>
          <DebriefSection title="Case connection">{d.caseConnection}</DebriefSection>
          <DebriefSection title="Further reading">
            <span style={{ color: 'var(--green-dim)' }}>{d.furtherReading}</span>
          </DebriefSection>
        </div>
      </div>

      {/* Professor note */}
      <div style={{
        border: '1px solid var(--blue-dim)', borderRadius: 'var(--radius-md)',
        background: 'rgba(0,170,255,0.04)', padding: '12px 14px',
      }}>
        <div style={{ fontSize: '9px', color: 'var(--blue-accent)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
          📊 Assessment Record
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {metrics?.quizSkipped ? (
            <span>Assessment: <b style={{ color: 'var(--text-muted)' }}>Skipped</b></span>
          ) : (
            <>
              Pre-quiz: <b style={{ color: 'var(--text-primary)' }}>{metrics?.preQuizScore ?? '—'}%</b>
              {metrics?.preQuizDurationSeconds != null && (
                <span style={{ color: 'var(--text-muted)' }}> ({fmtTime(metrics.preQuizDurationSeconds)})</span>
              )}
              {' → '}
              Post-quiz: <b style={{ color: 'var(--text-primary)' }}>{metrics?.postQuizScore ?? '—'}%</b>
              {metrics?.postQuizDurationSeconds != null && (
                <span style={{ color: 'var(--text-muted)' }}> ({fmtTime(metrics.postQuizDurationSeconds)})</span>
              )}
              {' · '}
              Mastery: <b style={{ color: tierMeta.color }}>{tierMeta.label}</b>
            </>
          )}
          &nbsp;|&nbsp;
          Score: <b style={{ color: 'var(--text-primary)' }}>{metrics?.finalScore ?? '—'}</b> &nbsp;|&nbsp;
          Duration: <b style={{ color: 'var(--text-primary)' }}>{metrics ? fmtTime(metrics.totalTimeSeconds) : '—'}</b>
        </div>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: 4 }}>
          Metrics persist in session and can be exported for instructor review.
        </div>
      </div>

      <button className="btn-submit" onClick={onNext}>
        Continue <ChevronRight size={13} />
      </button>
    </div>
  )
}

function MetricCard({ icon, label, value, sub, valueColor }) {
  return (
    <div className="metric-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {icon}
        <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      </div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: valueColor ?? 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function DebriefSection({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{title}</div>
      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{children}</p>
    </div>
  )
}

function fmtTime(s) {
  if (!s) return '—'
  const m = Math.floor(s / 60), sec = s % 60
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}
