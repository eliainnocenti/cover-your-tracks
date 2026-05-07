import { useState } from 'react'
import { Shield, ChevronRight, Clock, Target, Layers, Info, Github, Linkedin, Mail, X } from 'lucide-react'
import { useEngine } from './ScenarioEngine'
import Leaderboard from './Leaderboard'

const SCENARIOS_META = [
  { id: 'scenario_01', title: 'The Timestomper', subtitle: 'Filesystem — MAC Time Manipulation', domain: 'filesystem', difficulty: 1, minutes: 15 },
  { id: 'scenario_02', title: 'Ghosts in the Sectors', subtitle: 'Filesystem — Slack Space Exploitation', domain: 'filesystem', difficulty: 2, minutes: 20 },
  { id: 'scenario_03', title: 'Ghost in the Machine', subtitle: 'RAM — Process Injection Detection', domain: 'ram', difficulty: 3, minutes: 20 },
  { id: 'scenario_04', title: 'The Whispering DNS', subtitle: 'Network — DNS Tunneling Exfiltration', domain: 'network', difficulty: 3, minutes: 20 },
  { id: 'scenario_05', title: 'Hidden in Plain Sight', subtitle: 'Steganography — LSB Detection', domain: 'steganography', difficulty: 4, minutes: 25 },
  { id: 'scenario_06', title: 'The Last Stand', subtitle: 'Combined — Boss Level', domain: 'combined', difficulty: 5, minutes: 35 },
]

const DOMAIN_COLORS = {
  filesystem: { color: '#00aaff', bg: 'rgba(0,170,255,0.08)', border: 'rgba(0,170,255,0.2)' },
  ram: { color: '#a855f7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)' },
  network: { color: '#00e5cc', bg: 'rgba(0,229,204,0.08)', border: 'rgba(0,229,204,0.2)' },
  steganography: { color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
  combined: { color: '#ff3c3c', bg: 'rgba(255,60,60,0.08)', border: 'rgba(255,60,60,0.2)' },
}

export default function Landing({ onStart }) {
  const { loadLeaderboard } = useEngine()
  const [showAbout, setShowAbout] = useState(false)
  return (
    <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 48 }} className="boot-text">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,200,100,0.15) 0%, transparent 70%)',
            border: '1px solid var(--green-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(0,200,100,0.2)',
          }}>
            <Shield size={28} style={{ color: 'var(--green-main)' }} />
          </div>
        </div>
        <h1 style={{
          fontSize: '28px', fontWeight: 700, letterSpacing: '0.08em',
          color: 'var(--green-main)', textTransform: 'uppercase', margin: '0 0 8px',
        }} className="glow-green">
          Cover Your Tracks
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', letterSpacing: '0.1em', margin: '0 0 8px' }}>
          Anti-Forensics Detection Lab
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-ghost)', maxWidth: 440, lineHeight: 1.7, margin: '0 auto' }}>
          A serious game for the Computer Forensics & Cyber Crime Analysis course.<br />
          Detect anti-forensic techniques across filesystem, memory, and network domains.
        </p>
      </div>

      {/* Scenario grid */}
      <div style={{ width: '100%', maxWidth: 760, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {SCENARIOS_META.map((s, i) => {
          const dc = DOMAIN_COLORS[s.domain] ?? DOMAIN_COLORS.filesystem
          const available = true  // all scenarios are playable
          return (
            <button
              key={s.id}
              onClick={() => available && onStart(s.id)}
              style={{
                background: 'var(--bg-surface)', border: `1px solid ${available ? dc.border : 'var(--border-dim)'}`,
                borderRadius: 'var(--radius-lg)', padding: '18px 20px', textAlign: 'left',
                cursor: available ? 'pointer' : 'not-allowed', opacity: available ? 1 : 0.45,
                transition: 'all 0.2s', fontFamily: 'var(--font-mono)',
              }}
              onMouseEnter={e => { if (available) e.currentTarget.style.background = dc.bg }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface)' }}
            >
              {/* Domain badge + difficulty */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{
                  fontSize: '10px', color: dc.color, background: dc.bg,
                  border: `1px solid ${dc.border}`, borderRadius: 3,
                  padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.1em',
                }}>
                  {s.domain}
                </span>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <span key={n} className={`diff-pip ${n <= s.difficulty ? 'active' : ''}`} />
                  ))}
                </div>
              </div>

              {/* Title */}
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                {String(i + 1).padStart(2, '0')}. {s.title}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.4 }}>
                {s.subtitle}
              </div>

              {/* Meta row */}
              <div style={{ display: 'flex', gap: 16, fontSize: '11px', color: 'var(--text-ghost)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={9} /> {s.minutes} min
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Target size={9} /> Available
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Leaderboard */}
      <Leaderboard loadLeaderboard={loadLeaderboard} />

      {/* Footer About Link */}
      <div style={{ marginTop: 40, marginBottom: 20 }}>
        <button
          onClick={() => setShowAbout(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-ghost)', fontSize: '11px', fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase', letterSpacing: '0.1em'
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-ghost)'}
        >
          <Info size={12} /> About & Credits
        </button>
      </div>

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </div>
  )
}

function AboutModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={16} style={{ color: 'var(--green-main)' }} />
            <h2 style={{ fontSize: '14px', margin: 0, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>About the Project</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            <X size={16} />
          </button>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
          <p style={{ margin: '0 0 12px' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Cover Your Tracks</strong> is an interactive serious game developed for the Computer Forensics & Cyber Crime Analysis course at Politecnico di Torino.
          </p>
          <p style={{ margin: 0 }}>
            It is designed to teach students how to identify advanced anti-forensic techniques through a simulated investigation environment.
          </p>
        </div>

        <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Author</div>
          <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700 }}>Elia Innocenti</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            <a href="mailto:elia.innocenti@studenti.polito.it" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '11px', fontFamily: 'var(--font-mono)' }} onMouseEnter={e => e.currentTarget.style.color='var(--text-primary)'} onMouseLeave={e => e.currentTarget.style.color='var(--text-secondary)'}>
              <Mail size={12} /> elia.innocenti@studenti.polito.it
            </a>
            <a href="https://github.com/eliainnocenti/cover-your-tracks" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '11px', fontFamily: 'var(--font-mono)' }} onMouseEnter={e => e.currentTarget.style.color='var(--text-primary)'} onMouseLeave={e => e.currentTarget.style.color='var(--text-secondary)'}>
              <Github size={12} /> github.com/eliainnocenti
            </a>
            <a href="https://www.linkedin.com/in/eliainnocenti/" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '11px', fontFamily: 'var(--font-mono)' }} onMouseEnter={e => e.currentTarget.style.color='var(--text-primary)'} onMouseLeave={e => e.currentTarget.style.color='var(--text-secondary)'}>
              <Linkedin size={12} /> linkedin.com/in/eliainnocenti
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
