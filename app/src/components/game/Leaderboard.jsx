// Leaderboard.jsx — Local high-scores & past runs
import { useState } from 'react'
import { Trophy, Clock, Target, ChevronDown, ChevronRight, Trash2, TrendingUp } from 'lucide-react'
import { QUIZ_TIER_META } from './ScenarioEngine'

function fmtTime(s) {
  if (!s) return '—'
  const m = Math.floor(s / 60), sec = s % 60
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}



export default function Leaderboard({ loadLeaderboard }) {
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState(() => loadLeaderboard())

  const refresh = () => setEntries(loadLeaderboard())

  const handleClear = () => {
    try { localStorage.removeItem('cyt_leaderboard') } catch { }
    setEntries([])
  }

  if (entries.length === 0 && !open) return null

  return (
    <div style={{
      width: '100%', maxWidth: 760, flexShrink: 0,
      border: '1px solid var(--border-dim)',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--bg-surface)',
      overflow: 'hidden',
      marginTop: 16,
    }}>
      {/* Header */}
      <button
        onClick={() => { setOpen(o => !o); refresh() }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 20px', background: 'var(--bg-raised)',
          border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)',
        }}
      >
        <Trophy size={14} style={{ color: 'var(--amber-main)' }} />
        <span style={{ fontSize: '12px', color: 'var(--amber-main)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Leaderboard
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-ghost)', marginLeft: 4 }}>
          ({entries.length} {entries.length === 1 ? 'run' : 'runs'})
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {entries.length > 0 && (
            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
              Best: {entries[0]?.finalScore ?? '—'} pts
            </span>
          )}
          {open
            ? <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
            : <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
          }
        </div>
      </button>

      {/* Table */}
      {open && (
        <div style={{ padding: '12px 16px' }}>
          {entries.length === 0 ? (
            <p style={{ fontSize: '11px', color: 'var(--text-ghost)', textAlign: 'center', padding: '20px 0' }}>
              No completed runs yet. Finish a scenario to see your scores here.
            </p>
          ) : (
            <>
              <div style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-dim)' }}>
                      <td style={{ padding: '4px 8px 8px 0', width: 24 }}>#</td>
                      <td style={{ padding: '4px 8px 8px 0' }}>SCENARIO</td>
                      <td style={{ padding: '4px 8px 8px 0', textAlign: 'center' }}>SCORE</td>
                      <td style={{ padding: '4px 8px 8px 0', textAlign: 'center' }}>FLAGS</td>
                      <td style={{ padding: '4px 8px 8px 0', textAlign: 'center' }}>MASTERY</td>
                      <td style={{ padding: '4px 8px 8px 0', textAlign: 'right' }}>TIME</td>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, i) => {
                      const isGold = i === 0
                      return (
                        <tr key={e.id} style={{
                          borderBottom: '1px solid var(--bg-raised)',
                          color: isGold ? 'var(--amber-main)' : 'var(--text-secondary)',
                        }}>
                          <td style={{ padding: '6px 8px 6px 0', color: isGold ? 'var(--amber-main)' : 'var(--text-ghost)' }}>
                            {i + 1}
                          </td>
                          <td style={{ padding: '6px 8px 6px 0' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-primary)' }}>{e.scenarioTitle}</div>
                            <div style={{ fontSize: '9px', color: 'var(--text-ghost)', marginTop: 1 }}>
                              {new Date(e.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td style={{ padding: '6px 8px 6px 0', textAlign: 'center', fontWeight: 700, color: isGold ? 'var(--amber-main)' : 'var(--text-primary)' }}>
                            {e.finalScore}
                          </td>
                          <td style={{ padding: '6px 8px 6px 0', textAlign: 'center', color: e.flagsFound === e.totalFlags ? 'var(--green-main)' : 'var(--text-secondary)' }}>
                            {e.flagsFound}/{e.totalFlags}
                          </td>
                          <td style={{ padding: '6px 8px 6px 0', textAlign: 'center' }}>
                            {(() => {
                              const tierKey = e.quizTier ?? (e.knowledgeDelta == null ? 'skipped' : e.knowledgeDelta >= 100 ? 'mastered' : 'unchanged')
                              const meta = QUIZ_TIER_META[tierKey] ?? QUIZ_TIER_META.unchanged
                              return (
                                <span title={meta.label} style={{ color: meta.color, fontSize: '12px' }}>
                                  {meta.emoji}
                                </span>
                              )
                            })()}
                          </td>
                          <td style={{ padding: '6px 0 6px 0', textAlign: 'right', color: 'var(--text-muted)' }}>
                            {fmtTime(e.totalTimeSeconds)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Clear button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  onClick={handleClear}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: '9px', color: 'var(--text-ghost)', background: 'none',
                    border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                    padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--red-alert)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-ghost)' }}
                >
                  <Trash2 size={9} /> Clear history
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
