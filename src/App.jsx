// App.jsx — Game shell + phase router
import { useState } from 'react';

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

// ─── Top-level shell ──────────────────────────────────────────────────────────
export default function App() {
  return (
    <ScenarioProvider>
      <div className="min-h-screen bg-gray-950 text-gray-300" style={{ fontFamily: "var(--font-mono)" }}>
        <GameRouter />
      </div>
    </ScenarioProvider>
  );
}

function GameRouter() {
  const { state, loadScenario } = useEngine();
  const { phase, scenario } = state;

  // Briefing modal state — shows after selecting a scenario, before quiz
  const [showBriefing, setShowBriefing] = useState(false);
  const [pendingScenario, setPendingScenario] = useState(null);

  // Tutorial overlay state — shows after quiz, before investigation
  const [showTutorial, setShowTutorial] = useState(false);
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
    <div className="min-h-screen flex flex-col">
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
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <div className="flex-1 overflow-auto">
        <Debrief onNext={() => dispatch({ type: 'COMPLETE' })} />
      </div>
    </div>
  );
}

function InvestigationScreen() {
  const { state } = useEngine();
  const { scenario } = state;

  return (
    <div className="flex flex-col h-screen">
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
        <div className="ml-auto">
          <DomainBadge domain={scenario.domain} />
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
    </div>
  );
}

function CompleteScreen() {
  const { dispatch } = useEngine();
  return (
    <div className="flex items-center justify-center min-h-screen">
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
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-green-600 font-mono text-sm animate-pulse">Loading case file...</p>
    </div>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function TopBar() {
  const { state } = useEngine();
  const { scenario, score, phase } = state;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-green-900/40 bg-gray-900">
      <div className="flex items-center gap-3">
        <span style={{ color: 'var(--green-main)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.12em' }}>
          COVER YOUR TRACKS
        </span>
        <span className="text-gray-700 text-xs font-mono">|</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Anti-Forensics Detection Lab</span>
      </div>
      <div className="flex items-center gap-4">
        <PhaseIndicator phase={phase} />
        {phase === 'investigation' && (
          <span style={{ color: 'var(--green-main)', fontSize: '13px' }}>
            Score: <span style={{ fontWeight: 700 }}>{score}</span>
          </span>
        )}
      </div>
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
