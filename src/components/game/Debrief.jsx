// Debrief.jsx
import { BookOpen, TrendingUp, TrendingDown, Clock, Target, Lightbulb, Award, ChevronRight, Minus } from 'lucide-react'
import { useEngine } from './ScenarioEngine'

export default function Debrief({ onNext }) {
  const { state, metrics } = useEngine()
  const { scenario } = state
  const d = scenario.debriefing
  const delta = metrics?.knowledgeDelta ?? 0

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
            icon={delta > 0 ? <TrendingUp size={13} style={{ color: 'var(--green-main)' }} /> : delta < 0 ? <TrendingDown size={13} style={{ color: 'var(--red-alert)' }} /> : <Minus size={13} style={{ color: 'var(--text-muted)' }} />}
            label="Knowledge Δ"
            value={delta > 0 ? `+${delta}%` : `${delta}%`}
            sub={`${metrics.preQuizScore}% → ${metrics.postQuizScore}%`}
            valueColor={delta > 0 ? 'var(--green-main)' : delta < 0 ? 'var(--red-alert)' : 'var(--text-muted)'}
          />
          <MetricCard icon={<Target size={13} style={{ color: 'var(--green-main)' }} />} label="Flags Found"
            value={`${metrics.flagsFound}/${metrics.totalFlags}`} valueColor="var(--green-main)"
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
          Pre-quiz: <b style={{ color: 'var(--text-primary)' }}>{metrics?.preQuizScore ?? '—'}%</b> →
          Post-quiz: <b style={{ color: 'var(--text-primary)' }}>{metrics?.postQuizScore ?? '—'}%</b> &nbsp;|&nbsp;
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
