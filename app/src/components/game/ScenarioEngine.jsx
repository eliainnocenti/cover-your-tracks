// ScenarioEngine.jsx — Core game state machine
import { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react'

// ── Leaderboard helpers ───────────────────────────────────────────────────────
const LEADERBOARD_KEY = 'cyt_leaderboard'
const MAX_LEADERBOARD = 20

function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveToLeaderboard(entry) {
  try {
    const lb = loadLeaderboard()
    lb.push(entry)
    lb.sort((a, b) => b.finalScore - a.finalScore || a.totalTimeSeconds - b.totalTimeSeconds)
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(lb.slice(0, MAX_LEADERBOARD)))
  } catch { /* ignore storage errors */ }
}

// ── Chain of Custody helpers ──────────────────────────────────────────────────
function logEntry(action, detail, extra = {}) {
  return { ts: Date.now(), action, detail, ...extra }
}

// ── Initial state ─────────────────────────────────────────────────────────────
const initialState = {
  phase: 'landing',        // landing | pre_quiz | investigation | post_quiz | debrief | complete
  scenario: null,
  score: 100,
  hintsUsed: [],           // [tier numbers]
  flagsFound: [],          // [{ flagId, timestamp, attemptNumber }]
  taggedEvidence: [],      // [{ id, name, type, note, path }]
  terminalHistory: [],     // [{ text, type, timestamp }]
  activeView: 'explorer',  // explorer | terminal | hex | ram | network
  selectedNode: null,      // currently inspected filesystem node
  preQuizAnswers: {},      // { questionId: optionIndex }
  postQuizAnswers: {},
  preQuizScore: null,      // 0-100
  postQuizScore: null,
  startTime: null,
  endTime: null,
  wrongAttempts: 0,
  pendingWrongPenalty: 0,
  sessionLog: [],          // append-only audit trail for professor dashboard
  foundConnections: [],    // [connectionId] — cross-referenced evidence links
}

// ── Reducer ───────────────────────────────────────────────────────────────────
function engineReducer(state, action) {
  switch (action.type) {

    case 'LOAD_SCENARIO':
      return {
        ...initialState,
        phase: 'pre_quiz',
        scenario: action.payload,
        startTime: Date.now(),
        sessionLog: [
          logEntry('SESSION_START', `Investigation session opened — Case: ${action.payload.title} [${action.payload.id}]`),
          logEntry('EVIDENCE_LOADED', `Evidence set mounted (domain: ${action.payload.domain})`),
        ],
      }

    case 'SUBMIT_PRE_QUIZ': {
      const answers = action.payload
      const qs = state.scenario.preQuiz
      const correct = qs.filter(q => answers[q.id] === q.correct).length
      const score = Math.round((correct / qs.length) * 100)
      return {
        ...state,
        preQuizAnswers: answers,
        preQuizScore: score,
        phase: 'investigation',
        sessionLog: [...state.sessionLog,
          logEntry('PRE_ASSESSMENT', `Pre-quiz completed — Score: ${score}% (${correct}/${qs.length})`, { score }),
          logEntry('INVESTIGATION_START', 'Investigation phase started — evidence access granted'),
        ],
      }
    }

    case 'SET_VIEW':
      return {
        ...state,
        activeView: action.payload,
        sessionLog: [...state.sessionLog,
          logEntry('VIEW_CHANGED', `Switched to ${action.payload.toUpperCase()} view`),
        ],
      }

    case 'SELECT_NODE':
      return {
        ...state,
        selectedNode: action.payload,
        sessionLog: [...state.sessionLog,
          logEntry('EVIDENCE_ACCESS', `Inspected: ${action.payload?.name ?? 'unknown'} — ${action.payload?.path ?? ''}`),
        ],
      }

    case 'TAG_EVIDENCE': {
      if (state.taggedEvidence.find(e => e.id === action.payload.id)) return state
      return {
        ...state,
        taggedEvidence: [...state.taggedEvidence, action.payload],
        sessionLog: [...state.sessionLog,
          logEntry('EVIDENCE_TAGGED', `Tagged evidence: ${action.payload.name}${action.payload.note ? ` — "${action.payload.note}"` : ''}`),
        ],
      }
    }

    case 'UNTAG_EVIDENCE':
      return {
        ...state,
        taggedEvidence: state.taggedEvidence.filter(e => e.id !== action.payload),
        sessionLog: [...state.sessionLog,
          logEntry('EVIDENCE_UNTAGGED', `Removed tag: ${action.payload}`),
        ],
      }

    case 'USE_HINT': {
      const tier = action.payload
      const hint = state.scenario.hints.find(h => h.tier === tier)
      if (!hint || state.hintsUsed.includes(tier)) return state
      const queuedPenalty = state.pendingWrongPenalty * 5
      const newScore = Math.max(0, state.score - hint.cost - queuedPenalty)
      return {
        ...state,
        hintsUsed: [...state.hintsUsed, tier],
        score: newScore,
        pendingWrongPenalty: 0,
        sessionLog: [...state.sessionLog,
          logEntry('HINT_USED', `Requested Tier ${tier} hint (cost: −${hint.cost} pts, score: ${newScore})`, { tier, cost: hint.cost }),
          ...(queuedPenalty > 0 ? [logEntry('WRONG_ATTEMPT_PENALTY', `Deferred wrong answers applied (−${queuedPenalty} pts)`, { penalty: queuedPenalty })] : []),
        ],
      }
    }

    case 'SUBMIT_FLAG': {
      const { flagId } = action.payload
      const flag = state.scenario.flags.find(f => f.id === flagId)
      if (!flag || state.flagsFound.find(f => f.flagId === flagId)) return state
      const newFound = [...state.flagsFound, { flagId, timestamp: Date.now(), attemptNumber: state.wrongAttempts + 1 }]
      const allDone = newFound.length === state.scenario.flags.length
      return {
        ...state,
        flagsFound: newFound,
        score: state.score + flag.points,
        phase: allDone ? 'post_quiz' : 'investigation',
        sessionLog: [...state.sessionLog,
          logEntry('FLAG_FOUND', `✓ Confirmed finding: ${flag.target} — ${flag.finding} (+${flag.points} pts)`, { flagId, points: flag.points }),
          ...(allDone ? [logEntry('ALL_FLAGS_FOUND', 'All forensic findings identified — proceeding to post-assessment')] : []),
        ],
      }
    }

    case 'WRONG_SUBMISSION':
      if (state.hintsUsed.length > 0) {
        return {
          ...state,
          wrongAttempts: state.wrongAttempts + 1,
          score: Math.max(0, state.score - 5),
          sessionLog: [...state.sessionLog,
            logEntry('WRONG_ATTEMPT', `✗ Incorrect submission (attempt #${state.wrongAttempts + 1}, −5 pts)`),
          ],
        }
      }
      return {
        ...state,
        wrongAttempts: state.wrongAttempts + 1,
        pendingWrongPenalty: state.pendingWrongPenalty + 1,
        sessionLog: [...state.sessionLog,
          logEntry('WRONG_ATTEMPT', `✗ Incorrect submission (attempt #${state.wrongAttempts + 1}, penalty deferred)`),
        ],
      }

    case 'SUBMIT_POST_QUIZ': {
      const answers = action.payload
      const qs = state.scenario.postQuiz
      const correct = qs.filter(q => answers[q.id] === q.correct).length
      const postScore = Math.round((correct / qs.length) * 100)
      const bonus = Math.round(postScore * 0.2)
      return {
        ...state,
        postQuizAnswers: answers,
        postQuizScore: postScore,
        score: state.score + bonus,
        phase: 'debrief',
        endTime: Date.now(),
        sessionLog: [...state.sessionLog,
          logEntry('POST_ASSESSMENT', `Post-quiz completed — Score: ${postScore}% (${correct}/${qs.length}), bonus: +${bonus} pts`, { score: postScore, bonus }),
          logEntry('INVESTIGATION_END', 'Investigation session concluded — generating debrief'),
        ],
      }
    }

    case 'ADD_TERMINAL_LINE':
      return {
        ...state,
        terminalHistory: [...state.terminalHistory, { text: action.payload.text, type: action.payload.type, timestamp: Date.now() }],
      }

    case 'ADD_TERMINAL_CMD':
      return {
        ...state,
        sessionLog: [...state.sessionLog,
          logEntry('TERMINAL_CMD', `$ ${action.payload}`),
        ],
      }

    case 'CLEAR_TERMINAL':
      return { ...state, terminalHistory: [] }

    case 'REGISTER_CONNECTION': {
      const { connectionId, description, points, evidence1, evidence2 } = action.payload
      if (state.foundConnections.includes(connectionId)) return state
      return {
        ...state,
        foundConnections: [...state.foundConnections, connectionId],
        score: state.score + points,
        sessionLog: [...state.sessionLog,
          logEntry('CONNECTION_FOUND', `🔗 Cross-referenced: ${evidence1} ↔ ${evidence2} — ${description} (+${points} pts)`, { connectionId, points }),
        ],
      }
    }

    case 'COMPLETE':
      return { ...state, phase: 'complete' }

    default:
      return state
  }
}

// ── Context ───────────────────────────────────────────────────────────────────
const EngineContext = createContext(null)

export function ScenarioProvider({ children }) {
  const [state, dispatch] = useReducer(engineReducer, initialState)

  const loadScenario     = useCallback(s  => dispatch({ type: 'LOAD_SCENARIO',      payload: s }), [])
  const submitPreQuiz    = useCallback(a  => dispatch({ type: 'SUBMIT_PRE_QUIZ',    payload: a }), [])
  const setView          = useCallback(v  => dispatch({ type: 'SET_VIEW',           payload: v }), [])
  const selectNode       = useCallback(n  => dispatch({ type: 'SELECT_NODE',        payload: n }), [])
  const tagEvidence      = useCallback(i  => dispatch({ type: 'TAG_EVIDENCE',       payload: i }), [])
  const untagEvidence    = useCallback(id => dispatch({ type: 'UNTAG_EVIDENCE',     payload: id }), [])
  const useHint          = useCallback(t  => dispatch({ type: 'USE_HINT',           payload: t }), [])
  const submitFlag       = useCallback(id => dispatch({ type: 'SUBMIT_FLAG',        payload: { flagId: id } }), [])
  const wrongSubmission  = useCallback(()  => dispatch({ type: 'WRONG_SUBMISSION' }), [])
  const submitPostQuiz   = useCallback(a  => dispatch({ type: 'SUBMIT_POST_QUIZ',   payload: a }), [])
  const addTerminalLine  = useCallback((text, type = 'output') => dispatch({ type: 'ADD_TERMINAL_LINE', payload: { text, type } }), [])
  const addTerminalCmd   = useCallback(cmd => dispatch({ type: 'ADD_TERMINAL_CMD',   payload: cmd }), [])
  const clearTerminal    = useCallback(()  => dispatch({ type: 'CLEAR_TERMINAL' }), [])
  const complete         = useCallback(()  => dispatch({ type: 'COMPLETE' }), [])
  const registerConnection = useCallback(c => dispatch({ type: 'REGISTER_CONNECTION', payload: c }), [])

  // Derived metrics — available after endTime is set
  const metrics = state.endTime ? {
    scenarioId:         state.scenario?.id,
    scenarioTitle:      state.scenario?.title,
    totalTimeSeconds:   Math.round((state.endTime - state.startTime) / 1000),
    finalScore:         state.score,
    preQuizScore:       state.preQuizScore ?? 0,
    postQuizScore:      state.postQuizScore ?? 0,
    knowledgeDelta:     (state.postQuizScore ?? 0) - (state.preQuizScore ?? 0),
    hintsUsedCount:     state.hintsUsed.length,
    wrongAttempts:      state.wrongAttempts,
    flagsFound:         state.flagsFound.length,
    totalFlags:         state.scenario?.flags.length ?? 0,
    completionRate:     state.scenario
      ? Math.round((state.flagsFound.length / state.scenario.flags.length) * 100)
      : 0,
    connectionsFound:   state.foundConnections.length,
    totalConnections:   state.scenario?.connections?.length ?? 0,
    sessionLog:         state.sessionLog,
  } : null

  // Save to leaderboard exactly once when entering debrief phase
  const prevPhaseRef = useRef(null)
  useEffect(() => {
    if (state.phase === 'debrief' && prevPhaseRef.current !== 'debrief' && metrics) {
      saveToLeaderboard({
        id: `run_${Date.now()}`,
        scenarioId: metrics.scenarioId,
        scenarioTitle: metrics.scenarioTitle,
        finalScore: metrics.finalScore,
        preQuizScore: metrics.preQuizScore,
        postQuizScore: metrics.postQuizScore,
        knowledgeDelta: metrics.knowledgeDelta,
        flagsFound: metrics.flagsFound,
        totalFlags: metrics.totalFlags,
        hintsUsed: metrics.hintsUsedCount,
        wrongAttempts: metrics.wrongAttempts,
        totalTimeSeconds: metrics.totalTimeSeconds,
        connectionsFound: metrics.connectionsFound,
        timestamp: new Date().toISOString(),
      })
    }
    prevPhaseRef.current = state.phase
  }, [state.phase])

  return (
    <EngineContext.Provider value={{
      state, dispatch, metrics,
      loadScenario, submitPreQuiz, setView, selectNode,
      tagEvidence, untagEvidence, useHint, submitFlag,
      wrongSubmission, submitPostQuiz, addTerminalLine, addTerminalCmd,
      clearTerminal, complete, registerConnection,
      loadLeaderboard,
    }}>
      {children}
    </EngineContext.Provider>
  )
}

export function useEngine() {
  const ctx = useContext(EngineContext)
  if (!ctx) throw new Error('useEngine must be used inside ScenarioProvider')
  return ctx
}
