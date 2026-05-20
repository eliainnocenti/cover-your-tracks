// TutorialOverlay.jsx — Interactive step-by-step guide before investigation
import { useState } from 'react'
import {
  Folder, Terminal, Binary, Cpu, Network,
  BookOpen, Flag, Lightbulb, ChevronRight, ChevronLeft, X
} from 'lucide-react'

const STEPS = [
  {
    icon: Folder,
    title: 'File Explorer',
    color: 'var(--green-main)',
    description: 'Browse the filesystem tree on the left panel. Click any file to inspect its metadata — timestamps, sizes, permissions, and magic bytes. Look for anomalies between $STANDARD_INFORMATION and $FILE_NAME attributes.',
  },
  {
    icon: Terminal,
    title: 'Forensic Terminal',
    color: 'var(--green-main)',
    description: 'Switch to the Terminal tab to run forensic commands. Available tools: stat, istat, cat, strings, xxd (hex dump), hash, ls, and cd. Use these to dig deeper into suspicious files. Press ↑/↓ to navigate command history.',
  },
  {
    icon: Binary,
    title: 'HEX / RAM / Network Views',
    color: 'var(--blue-accent)',
    description: 'The HEX tab shows raw file bytes. The RAM tab displays process dumps (pslist vs psscan). The Network tab shows packet captures. Not every scenario uses all views — focus on the domain mentioned in the case brief.',
  },
  {
    icon: BookOpen,
    title: "Investigator's Notebook",
    color: 'var(--amber-main)',
    description: 'The right panel is your notebook. Tag evidence you find suspicious using the 🏷 button on file details. Then describe your finding in the text box and click "Submit Finding". Each correct flag earns points.',
  },
  {
    icon: Flag,
    title: 'Flags and Scoring',
    color: 'var(--red-alert)',
    description: 'Each scenario has hidden flags — tampered files, suspicious processes, covert channels. Find all flags to complete the investigation. Wrong submissions cost 5 points. Your base score starts at 100.',
  },
  {
    icon: Lightbulb,
    title: 'Hints',
    color: 'var(--amber-main)',
    description: "Stuck? Use the hint system — 3 tiers of increasing detail. Tier 1 gives a nudge (-10 pts), Tier 2 is more specific (-20 pts), and Tier 3 is very direct (-30 pts). Wrong submissions only cost points if you end up using a hint later.",
  },
]

export default function TutorialOverlay({ scenario, onDismiss }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  return (
    <div className="tutorial-backdrop" onClick={onDismiss}>
      <div className="tutorial-card" onClick={e => e.stopPropagation()}>
        {/* Skip button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{
            fontSize: '10px', color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>
            Investigation Guide — Step {step + 1}/{STEPS.length}
          </span>
          <button
            onClick={onDismiss}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'var(--font-mono)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            Skip <X size={12} />
          </button>
        </div>

        {/* Step content */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', margin: '0 auto 16px',
            background: `${current.color}11`,
            border: `1px solid ${current.color}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={22} style={{ color: current.color }} />
          </div>
          <h3 style={{
            fontSize: '16px', fontWeight: 700, color: current.color,
            margin: '0 0 10px', fontFamily: 'var(--font-mono)',
          }}>
            {current.title}
          </h3>
          <p style={{
            fontSize: '13px', color: 'var(--text-secondary)',
            lineHeight: 1.7, margin: 0, textAlign: 'left',
          }}>
            {step === 0 && scenario?.id !== 'scenario_01'
              ? 'Browse the filesystem tree on the left panel. Click any file to inspect its metadata — timestamps, sizes, permissions, and magic bytes.'
              : current.description}
          </p>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            style={{
              background: 'var(--bg-raised)', border: '1px solid var(--border-dim)',
              borderRadius: 'var(--radius-md)', padding: '8px 16px',
              cursor: step === 0 ? 'not-allowed' : 'pointer',
              opacity: step === 0 ? 0.3 : 1,
              color: 'var(--text-secondary)', fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              display: 'flex', alignItems: 'center', gap: 4,
              transition: 'all 0.15s',
            }}
          >
            <ChevronLeft size={13} /> Back
          </button>

          <button
            onClick={isLast ? onDismiss : () => setStep(s => s + 1)}
            className="btn-submit"
            style={{ flex: 1, maxWidth: 220, fontSize: '12px', padding: '8px 16px' }}
          >
            {isLast ? (
              <>▶ Start Investigation</>
            ) : (
              <>Next <ChevronRight size={13} /></>
            )}
          </button>
        </div>

        {/* Step dots */}
        <div className="tutorial-step-indicator">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`tutorial-dot ${i === step ? 'active' : i < step ? 'done' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
