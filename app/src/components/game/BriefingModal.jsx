// BriefingModal.jsx — Scenario introduction popup before pre-quiz
import { BookOpen, Shield, Target, ChevronRight, X } from 'lucide-react'

export default function BriefingModal({ scenario, onContinue }) {
  if (!scenario) return null

  const flagCount = scenario.flags?.length ?? 0
  const quizCount = scenario.preQuiz?.length ?? 0

  return (
    <div className="modal-backdrop" onClick={onContinue}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onContinue}
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: 4,
          }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(0,200,100,0.08)', border: '1px solid var(--green-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={18} style={{ color: 'var(--green-main)' }} />
          </div>
          <div>
            <div style={{
              fontSize: '10px', color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              Case File — {scenario.id?.replace('_', ' ').toUpperCase()}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--green-main)' }}>
              {scenario.title}
            </div>
          </div>
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: '12px', color: 'var(--text-secondary)',
          marginBottom: 16, paddingBottom: 16,
          borderBottom: '1px solid var(--border-dim)',
        }}>
          {scenario.subtitle}
        </div>

        {/* Narrative */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: '11px', color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <BookOpen size={12} /> Case Briefing
          </div>
          <p style={{
            fontSize: '13px', color: 'var(--text-primary)',
            lineHeight: 1.7, margin: 0,
          }}>
            {scenario.narrative}
          </p>
        </div>

        {/* Learning objective */}
        {scenario.learningObjective && (
          <div style={{
            marginBottom: 20, padding: '12px 14px',
            background: 'rgba(0,170,255,0.05)',
            border: '1px solid rgba(0,170,255,0.15)',
            borderRadius: 'var(--radius-md)',
          }}>
            <div style={{
              fontSize: '11px', color: 'var(--blue-accent)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Target size={12} /> Learning Objective
            </div>
            <p style={{
              fontSize: '12px', color: 'var(--text-secondary)',
              lineHeight: 1.6, margin: 0,
            }}>
              {scenario.learningObjective}
            </p>
          </div>
        )}

        {/* What's next strip */}
        <div style={{
          marginBottom: 24, padding: '12px 14px',
          background: 'var(--bg-raised)', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-dim)',
        }}>
          <div style={{
            fontSize: '11px', color: 'var(--amber-main)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
          }}>
            What happens next
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>1.</span> You'll answer a <strong style={{ color: 'var(--text-primary)' }}>{quizCount}-question pre-quiz</strong> to establish your baseline
            </div>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>2.</span> Then the <strong style={{ color: 'var(--text-primary)' }}>investigation environment</strong> opens — explore evidence and find flags
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>3.</span> After finding all <strong style={{ color: 'var(--text-primary)' }}>{flagCount} flags</strong>, a post-quiz measures what you learned
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          className="btn-submit"
          onClick={onContinue}
          style={{ fontSize: '13px', padding: '12px' }}
        >
          <ChevronRight size={15} />
          Begin Pre-Quiz
        </button>
      </div>
    </div>
  )
}
