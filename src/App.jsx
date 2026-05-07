// App.jsx — Game shell + phase router
import { useEffect } from 'react';

import { ScenarioProvider, useEngine } from './components/game/ScenarioEngine';
import EvidenceNavigator from './components/game/EvidenceNavigator';
import InvestigatorNotebook from './components/game/InvestigatorNotebook';
import Quiz from './components/game/Quiz';
import Debrief from './components/game/Debrief';
import Landing from './components/game/Landing';

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

  // Landing screen — scenario selection
  if (phase === 'landing') {
    return (
      <Landing onStart={(scenarioId) => {
        const data = ALL_SCENARIOS[scenarioId];
        if (data) loadScenario(data);
      }} />
    );
  }

  if (!scenario) return <LoadingScreen />;

  if (phase === 'pre_quiz') return <QuizScreen type="pre" />;
  if (phase === 'post_quiz') return <QuizScreen type="post" />;
  if (phase === 'debrief') return <DebriefScreen />;
  if (phase === 'complete') return <CompleteScreen />;
  return <InvestigationScreen />;
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
          <span className="text-green-600 text-xs font-mono">CASE</span>
          <span className="text-green-400 text-xs font-mono font-bold">{scenario.id.toUpperCase()}</span>
        </div>
        <div className="h-3 w-px bg-gray-700" />
        <span className="text-gray-300 text-xs font-mono font-bold">{scenario.title}</span>
        <div className="h-3 w-px bg-gray-700" />
        <span className="text-gray-500 text-xs font-mono">{scenario.subtitle}</span>
        <div className="ml-auto">
          <DomainBadge domain={scenario.domain} />
        </div>
      </div>

      {/* Narrative */}
      <div className="bg-gray-900/40 border-b border-gray-800/50 px-4 py-2">
        <p className="text-gray-500 text-xs font-mono leading-relaxed">{scenario.narrative}</p>
      </div>

      {/* 2-panel layout */}
      <div className="flex-1 overflow-hidden grid grid-cols-[1fr_340px] gap-3 p-3">
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
        <span className="text-green-400 text-xs font-mono font-bold tracking-widest">
          COVER YOUR TRACKS
        </span>
        <span className="text-gray-700 text-xs font-mono">|</span>
        <span className="text-gray-500 text-xs font-mono">Anti-Forensics Detection Lab</span>
      </div>
      <div className="flex items-center gap-4">
        <PhaseIndicator phase={phase} />
        {phase === 'investigation' && (
          <span className="text-green-400 text-xs font-mono">
            Score: <span className="font-bold">{score}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function PhaseIndicator({ phase }) {
  const labels = {
    landing: { label: 'Select Case', color: 'text-gray-400' },
    pre_quiz: { label: 'Pre-Quiz', color: 'text-blue-400' },
    investigation: { label: 'Investigation', color: 'text-green-400' },
    post_quiz: { label: 'Post-Quiz', color: 'text-yellow-400' },
    debrief: { label: 'Debrief', color: 'text-purple-400' },
    complete: { label: 'Complete', color: 'text-green-400' },
  };
  const p = labels[phase] ?? { label: phase, color: 'text-gray-400' };
  return <span className={`text-xs font-mono ${p.color}`}>{p.label}</span>;
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
    <span className={`text-xs font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${colors[domain] ?? 'text-gray-400'}`}>
      {domain}
    </span>
  );
}
