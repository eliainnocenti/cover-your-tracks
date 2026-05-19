// App.jsx — Game shell + phase router
import { useState, createContext, useContext } from 'react';

import { ScenarioProvider, useEngine } from './components/game/ScenarioEngine';
import EvidenceNavigator from './components/game/EvidenceNavigator';
import InvestigatorNotebook from './components/game/InvestigatorNotebook';
import Quiz from './components/game/Quiz';
import Debrief from './components/game/Debrief';
import Landing from './components/game/Landing';
import BriefingModal from './components/game/BriefingModal';
import TutorialOverlay from './components/game/TutorialOverlay';

import scenario01 from './data/scenarios/scenario_01_timestomper.json';
import scenario02 from './data/scenarios/scenario_02_slackspace.json';
import scenario03 from './data/scenarios/scenario_03_ram_injection.json';
import scenario04 from './data/scenarios/scenario_04_dns_tunnel.json';
import scenario05 from './data/scenarios/scenario_05_steganography.json';
import scenario06 from './data/scenarios/scenario_06_boss_level.json';

// All scenarios index
const ALL_SCENARIOS = {
  scenario_01: scenario01,
  scenario_02: scenario02,
  scenario_03: scenario03,
  scenario_04: scenario04,
  scenario_05: scenario05,
  scenario_06: scenario06,
};

// ── Tutorial context (shared between GameRouter and TopBar) ───────────────────
const TutorialContext = createContext(null)

// ─── Top-level shell ──────────────────────────────────────────────────────────
export default function App() {
  const [showTutorial, setShowTutorial] = useState(false)

  return (
    <ScenarioProvider>
      <TutorialContext.Provider value={{ showTutorial, setShowTutorial }}>
        <div className="h-screen bg-gray-950 text-gray-300 flex flex-col overflow-hidden" style={{ fontFamily: "var(--font-mono)" }}>
          <GameRouter />
        </div>
      </TutorialContext.Provider>
    </ScenarioProvider>
  );
}

function GameRouter() {
  const { state, loadScenario } = useEngine();
  const { phase, scenario } = state;
  const { showTutorial, setShowTutorial } = useContext(TutorialContext);

  // Briefing modal state — shows after selecting a scenario, before quiz
  const [showBriefing, setShowBriefing] = useState(false);
  const [pendingScenario, setPendingScenario] = useState(null);

  // Tutorial tracking — shows once per scenario on first investigation entry
  const [tutorialShownForScenario, setTutorialShownForScenario] = useState(null);

  // Detect when we enter investigation phase — show tutorial if not yet shown
  if (
    phase === 'investigation' &&
    scenario &&
    scenario.id !== tutorialShownForScenario &&
    !showTutorial
  ) {
    setShowTutorial(true);
    setTutorialShownForScenario(scenario.id);
  }

  // Landing screen — scenario selection
  if (phase === 'landing') {
    return (
      <>
        <Landing onStart={(scenarioId) => {
          const data = ALL_SCENARIOS[scenarioId];
          if (data) {
            setPendingScenario(data);
            setShowBriefing(true);
          }
        }} />

        {/* Briefing modal overlay */}
        {showBriefing && pendingScenario && (
          <BriefingModal
            scenario={pendingScenario}
            onContinue={() => {
              setShowBriefing(false);
              loadScenario(pendingScenario);
              setPendingScenario(null);
            }}
            onClose={() => {
              setShowBriefing(false);
              setPendingScenario(null);
            }}
          />
        )}
      </>
    );
  }

  if (!scenario) return <LoadingScreen />;

  if (phase === 'pre_quiz') return <QuizScreen type="pre" />;
  if (phase === 'post_quiz') return <QuizScreen type="post" />;
  if (phase === 'debrief') return <DebriefScreen />;
  if (phase === 'complete') return <CompleteScreen />;

  return (
    <>
      <InvestigationScreen />

      {/* Tutorial overlay */}
      {showTutorial && (
        <TutorialOverlay
          scenario={scenario}
          onDismiss={() => setShowTutorial(false)}
        />
      )}
    </>
  );
}

// ─── Screen components ────────────────────────────────────────────────────────
function QuizScreen({ type }) {
  return (
    <div className="h-full flex flex-col">
      <TopBar />
      <div className="flex-1 overflow-auto">
        <Quiz type={type} />
      </div>
    </div>
  );
}

function DebriefScreen() {
  const { dispatch } = useEngine();
  return (
    <div className="h-full flex flex-col">
      <TopBar />
      <div className="flex-1 overflow-auto">
        <Debrief onNext={() => dispatch({ type: 'COMPLETE' })} />
      </div>
    </div>
  );
}

function InvestigationScreen() {
  const { state, reset } = useEngine();
  const { scenario } = state;
  const [showResignConfirm, setShowResignConfirm] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <TopBar />

      {/* Scenario brief strip */}
      <div className="bg-gray-900/80 border-b border-green-900/30 px-4 py-2.5 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--green-dim)', fontSize: '12px' }}>CASE</span>
          <span style={{ color: 'var(--green-main)', fontSize: '12px', fontWeight: 700 }}>{scenario.id.toUpperCase()}</span>
        </div>
        <div className="h-3 w-px bg-gray-700" />
        <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 700 }}>{scenario.title}</span>
        <div className="h-3 w-px bg-gray-700" />
        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{scenario.subtitle}</span>
        <div className="ml-auto flex items-center gap-3">
          <DomainBadge domain={scenario.domain} />
          <button
            onClick={() => setShowResignConfirm(true)}
            title="Resign from investigation"
            style={{
              background: 'none', border: '1px solid var(--red-dim)',
              borderRadius: 'var(--radius-md)', padding: '3px 10px',
              color: 'var(--red-alert)', fontSize: '10px', fontFamily: 'var(--font-mono)',
              cursor: 'pointer', opacity: 0.7, transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.target.style.opacity = '1'}
            onMouseLeave={e => e.target.style.opacity = '0.7'}
          >
            Resign
          </button>
        </div>
      </div>

      {/* Narrative */}
      <div className="bg-gray-900/40 border-b border-gray-800/50 px-4 py-2.5">
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.6, margin: 0 }}>
          {scenario.narrative}
        </p>
      </div>

      {/* 2-panel layout */}
      <div className="flex-1 overflow-hidden grid grid-cols-[1fr_360px] gap-3 p-3">
        <EvidenceNavigator />
        <InvestigatorNotebook />
      </div>

      {/* Resign confirmation dialog */}
      {showResignConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={() => setShowResignConfirm(false)}>
          <div style={{
            background: 'var(--bg-raised)', border: '1px solid var(--border-dim)',
            borderRadius: 'var(--radius-md)', padding: 24, maxWidth: 380,
            fontFamily: 'var(--font-mono)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '13px', color: 'var(--red-alert)', fontWeight: 700, marginBottom: 12 }}>
              🚨 Resign from Investigation?
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
              Your progress will be lost. You'll return to the scenario selection screen.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowResignConfirm(false)}
                style={{
                  background: 'var(--bg-raised)', border: '1px solid var(--border-dim)',
                  borderRadius: 'var(--radius-md)', padding: '6px 16px',
                  color: 'var(--text-secondary)', fontSize: '11px', fontFamily: 'var(--font-mono)', cursor: 'pointer',
                }}
              >Continue Investigation</button>
              <button
                onClick={() => { setShowResignConfirm(false); reset() }}
                style={{
                  background: 'rgba(255,60,60,0.1)', border: '1px solid var(--red-dim)',
                  borderRadius: 'var(--radius-md)', padding: '6px 16px',
                  color: 'var(--red-alert)', fontSize: '11px', fontFamily: 'var(--font-mono)', cursor: 'pointer',
                }}
              >Resign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CompleteScreen() {
  const { dispatch } = useEngine();
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center font-mono space-y-4">
        <div className="text-5xl">🔍</div>
        <h1 className="text-green-400 text-xl font-bold">Case Closed</h1>
        <p className="text-gray-500 text-sm">You've completed this scenario.</p>
        <button
          onClick={() => dispatch({ type: 'LOAD_SCENARIO', payload: null }) || window.location.reload()}
          className="mt-4 px-6 py-2 border border-green-700 text-green-400 text-xs rounded hover:bg-green-950/40 transition-colors"
        >
          Back to Scenario Select
        </button>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-green-600 font-mono text-sm animate-pulse">Loading case file...</p>
    </div>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function TopBar() {
  const { state, reset } = useEngine();
  const { scenario, score, phase } = state;
  const tutorialCtx = useContext(TutorialContext);
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-green-900/40 bg-gray-900">
      <div className="flex items-center gap-3">
        {/* Back arrow — pre_quiz only */}
        {phase === 'pre_quiz' && (
          <button
            onClick={() => setShowBackConfirm(true)}
            title="Back to scenario select"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
              transition: 'color 0.15s', padding: 0, marginRight: 4,
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          </button>
        )}
        <span style={{ color: 'var(--green-main)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.12em' }}>
          COVER YOUR TRACKS
        </span>
        <span className="text-gray-700 text-xs font-mono">|</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Anti-Forensics Detection Lab</span>
      </div>
      <div className="flex items-center gap-4">
        <PhaseIndicator phase={phase} />
        {phase === 'investigation' && (
          <>
            {/* Help button — reopen tutorial */}
            <button
              onClick={() => tutorialCtx?.setShowTutorial(true)}
              title="Reopen investigation guide"
              style={{
                background: 'none', border: '1px solid var(--border-dim)',
                borderRadius: 'var(--radius-md)', padding: '2px 8px',
                color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'var(--font-mono)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--green-main)'; e.currentTarget.style.borderColor = 'var(--green-dim)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-dim)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
              Guide
            </button>
            <span style={{ color: 'var(--green-main)', fontSize: '13px' }}>
              Score: <span style={{ fontWeight: 700 }}>{score}</span>
            </span>
          </>
        )}
      </div>

      {/* Back confirmation dialog */}
      {showBackConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={() => setShowBackConfirm(false)}>
          <div style={{
            background: 'var(--bg-raised)', border: '1px solid var(--border-dim)',
            borderRadius: 'var(--radius-md)', padding: 24, maxWidth: 340,
            fontFamily: 'var(--font-mono)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700, marginBottom: 12 }}>
              Leave this scenario?
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
              You'll return to the scenario selection screen.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowBackConfirm(false)}
                style={{
                  background: 'var(--bg-raised)', border: '1px solid var(--border-dim)',
                  borderRadius: 'var(--radius-md)', padding: '6px 16px',
                  color: 'var(--text-secondary)', fontSize: '11px', fontFamily: 'var(--font-mono)', cursor: 'pointer',
                }}
              >Stay</button>
              <button
                onClick={() => { setShowBackConfirm(false); reset() }}
                style={{
                  background: 'rgba(0,200,100,0.08)', border: '1px solid var(--green-muted)',
                  borderRadius: 'var(--radius-md)', padding: '6px 16px',
                  color: 'var(--green-main)', fontSize: '11px', fontFamily: 'var(--font-mono)', cursor: 'pointer',
                }}
              >Leave</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PhaseIndicator({ phase }) {
  const labels = {
    landing: { label: 'Select Case', color: 'var(--text-muted)' },
    pre_quiz: { label: 'Pre-Quiz', color: 'var(--blue-accent)' },
    investigation: { label: 'Investigation', color: 'var(--green-main)' },
    post_quiz: { label: 'Post-Quiz', color: 'var(--amber-main)' },
    debrief: { label: 'Debrief', color: 'var(--purple-accent)' },
    complete: { label: 'Complete', color: 'var(--green-main)' },
  };
  const p = labels[phase] ?? { label: phase, color: 'var(--text-muted)' };
  return <span style={{ fontSize: '12px', color: p.color }}>{p.label}</span>;
}

function DomainBadge({ domain }) {
  const colors = {
    filesystem: 'bg-blue-950/40 text-blue-400 border-blue-800/40',
    ram: 'bg-purple-950/40 text-purple-400 border-purple-800/40',
    network: 'bg-cyan-950/40 text-cyan-400 border-cyan-800/40',
    combined: 'bg-red-950/40 text-red-400 border-red-800/40',
    steganography: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
  };
  return (
    <span className={`font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${colors[domain] ?? 'text-gray-400'}`}
      style={{ fontSize: '11px' }}>
      {domain}
    </span>
  );
}
