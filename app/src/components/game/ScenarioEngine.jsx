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
  preQuizAnswers: {},
  postQuizAnswers: {},
  preQuizScore: null,      // 0–100 or null (skipped)
  postQuizScore: null,
  quizSkipped: false,      // true when student opted to skip assessment
  preQuizStartTime: null,  // ms timestamp when pre-quiz phase began
  preQuizEndTime: null,
  postQuizStartTime: null,
  postQuizEndTime: null,
  startTime: null,
  endTime: null,
  wrongAttempts: 0,
  // Per-flag deferred penalty map: { [flagId]: count }
  // Wrongs accumulated before any hint is used are deferred.
  // If the player finds the flag without a hint → penalty is forgiven (cleared).
  // If the player later uses a hint and then finds the flag → pending wrongs fire.
  pendingWrongsByFlag: {},
  // Global "hints have been used at all" flag for cross-flag wrong submissions
  // (wrongs after the first hint is used anywhere cost immediately, like before)
  sessionLog: [],          // append-only audit trail
  foundConnections: [],    // [connectionId]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns true if the player has used at least one hint that is
 * specifically associated with the given flag, OR if any hint has been
 * used at all (conservative: once you've asked for help, wrong guesses
 * cost points immediately — this matches the spirit of the professor's
 * suggestion while keeping the implementation simple).
 */
function hintsUsedForFlag(hintsUsed) {
  return hintsUsed.length > 0
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
        preQuizStartTime: Date.now(),
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
        preQuizEndTime: Date.now(),
        phase: 'investigation',
        sessionLog: [...state.sessionLog,
        logEntry('PRE_ASSESSMENT', `Pre-quiz completed — Score: ${score}% (${correct}/${qs.length})`, { score }),
        logEntry('INVESTIGATION_START', 'Investigation phase started — evidence access granted'),
        ],
      }
    }

    case 'SKIP_QUIZ':
      return {
        ...state,
        quizSkipped: true,
        preQuizScore: null,
        postQuizScore: null,
        preQuizEndTime: Date.now(),
        phase: 'investigation',
        sessionLog: [...state.sessionLog,
        logEntry('PRE_ASSESSMENT_SKIPPED', 'Pre-quiz skipped — Knowledge Delta will not be measured, post-quiz bonus forfeited'),
        logEntry('INVESTIGATION_START', 'Investigation phase started — evidence access granted'),
        ],
      }

    case 'RESET':
      return initialState

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
      const newScore = Math.max(0, state.score - hint.cost)
      return {
        ...state,
        hintsUsed: [...state.hintsUsed, tier],
        score: newScore,
        sessionLog: [...state.sessionLog,
        logEntry('HINT_USED', `Requested Tier ${tier} hint (cost: −${hint.cost} pts, score: ${newScore})`, { tier, cost: hint.cost }),
        ],
      }
    }

    case 'SUBMIT_FLAG': {
      const { flagId } = action.payload
      const flag = state.scenario.flags.find(f => f.id === flagId)
      if (!flag || state.flagsFound.find(f => f.flagId === flagId)) return state

      const newFound = [...state.flagsFound, { flagId, timestamp: Date.now(), attemptNumber: state.wrongAttempts + 1 }]

      // Per-flag deferred penalty logic:
      // - If NO hints have been used at all → this flag was found autonomously.
      //   Forgive any pending wrongs for this flag (clear them, no score hit).
      // - If hints HAVE been used → apply pending wrongs for this flag now.
      const pendingForThisFlag = state.pendingWrongsByFlag[flagId] ?? 0
      const hintsPreviouslyUsed = state.hintsUsed.length > 0
      let scoreDelta = flag.points
      let newPendingByFlag = { ...state.pendingWrongsByFlag }
      const extraLogs = []

      if (pendingForThisFlag > 0) {
        if (hintsPreviouslyUsed) {
          // Deferred penalty fires: player needed hints AND had wrong guesses
          const penalty = pendingForThisFlag * 5
          scoreDelta -= penalty
          extraLogs.push(
            logEntry('WRONG_ATTEMPT_PENALTY',
              `Deferred wrong-guess penalty applied for ${flag.target}: −${penalty} pts (${pendingForThisFlag} wrong attempts × 5)`,
              { penalty, flagId })
          )
        } else {
          // Player found it autonomously — forgive the wrong guesses
          extraLogs.push(
            logEntry('WRONG_ATTEMPT_FORGIVEN',
              `Wrong-guess penalty forgiven for ${flag.target} — found without hints (${pendingForThisFlag} attempts pardoned)`,
              { forgiven: pendingForThisFlag, flagId })
          )
        }
        delete newPendingByFlag[flagId]
      }

      // Advance phase only when all *required* flags are found.
      // A flag is optional when its JSON has `required: false`.
      const requiredFlags = state.scenario.flags.filter(f => f.required !== false)
      const requiredFound = newFound.filter(ff =>
        requiredFlags.some(rf => rf.id === ff.flagId)
      )
      const allRequiredDone = requiredFound.length === requiredFlags.length

      const newScore = Math.max(0, state.score + scoreDelta)

      return {
        ...state,
        flagsFound: newFound,
        score: newScore,
        pendingWrongsByFlag: newPendingByFlag,
        phase: allRequiredDone
          ? (state.quizSkipped ? 'debrief' : 'post_quiz')
          : 'investigation',
        ...(allRequiredDone && state.quizSkipped ? { endTime: Date.now() } : {}),
        sessionLog: [...state.sessionLog,
        logEntry('FLAG_FOUND', `✓ Confirmed finding: ${flag.target} — ${flag.finding} (+${flag.points} pts)`, { flagId, points: flag.points }),
        ...extraLogs,
        ...(allRequiredDone ? [logEntry('ALL_FLAGS_FOUND',
          state.quizSkipped
            ? 'All required forensic findings identified — assessment was skipped, proceeding to debrief'
            : 'All required forensic findings identified — proceeding to post-assessment'
        )] : []),
        ],
      }
    }

    case 'WRONG_SUBMISSION': {
      const { flagId } = action.payload  // which flag the wrong guess was for
      const hintsPreviouslyUsed = state.hintsUsed.length > 0

      if (hintsPreviouslyUsed) {
        // Once any hint has been used, wrong guesses cost immediately
        return {
          ...state,
          wrongAttempts: state.wrongAttempts + 1,
          score: Math.max(0, state.score - 5),
          sessionLog: [...state.sessionLog,
          logEntry('WRONG_ATTEMPT', `✗ Incorrect submission (attempt #${state.wrongAttempts + 1}, −5 pts immediately — hints have been used)`),
          ],
        }
      }

      // No hints used yet — defer per flag
      const currentPending = state.pendingWrongsByFlag[flagId] ?? 0
      return {
        ...state,
        wrongAttempts: state.wrongAttempts + 1,
        pendingWrongsByFlag: {
          ...state.pendingWrongsByFlag,
          [flagId]: currentPending + 1,
        },
        sessionLog: [...state.sessionLog,
        logEntry('WRONG_ATTEMPT', `✗ Incorrect submission for ${flagId} (attempt #${state.wrongAttempts + 1}, penalty deferred — no hints used yet)`),
        ],
      }
    }

    case 'START_POST_QUIZ':
      return { ...state, postQuizStartTime: Date.now() }

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
        postQuizEndTime: Date.now(),
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

  const loadScenario = useCallback(s => dispatch({ type: 'LOAD_SCENARIO', payload: s }), [])
  const submitPreQuiz = useCallback(a => dispatch({ type: 'SUBMIT_PRE_QUIZ', payload: a }), [])
  const skipQuiz = useCallback(() => dispatch({ type: 'SKIP_QUIZ' }), [])
  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])
  const setView = useCallback(v => dispatch({ type: 'SET_VIEW', payload: v }), [])
  const selectNode = useCallback(n => dispatch({ type: 'SELECT_NODE', payload: n }), [])
  const tagEvidence = useCallback(i => dispatch({ type: 'TAG_EVIDENCE', payload: i }), [])
  const untagEvidence = useCallback(id => dispatch({ type: 'UNTAG_EVIDENCE', payload: id }), [])
  const useHint = useCallback(t => dispatch({ type: 'USE_HINT', payload: t }), [])
  const submitFlag = useCallback(id => dispatch({ type: 'SUBMIT_FLAG', payload: { flagId: id } }), [])
  // wrongSubmission now requires the flagId context so deferred penalty is per-flag
  const wrongSubmission = useCallback((flagId = 'unknown') => dispatch({ type: 'WRONG_SUBMISSION', payload: { flagId } }), [])
  const startPostQuiz = useCallback(() => dispatch({ type: 'START_POST_QUIZ' }), [])
  const submitPostQuiz = useCallback(a => dispatch({ type: 'SUBMIT_POST_QUIZ', payload: a }), [])
  const addTerminalLine = useCallback((text, type = 'output') => dispatch({ type: 'ADD_TERMINAL_LINE', payload: { text, type } }), [])
  const addTerminalCmd = useCallback(cmd => dispatch({ type: 'ADD_TERMINAL_CMD', payload: cmd }), [])
  const clearTerminal = useCallback(() => dispatch({ type: 'CLEAR_TERMINAL' }), [])
  const complete = useCallback(() => dispatch({ type: 'COMPLETE' }), [])
  const registerConnection = useCallback(c => dispatch({ type: 'REGISTER_CONNECTION', payload: c }), [])

  // Derived metrics — available after endTime is set
  const rawDelta = (state.postQuizScore ?? 0) - (state.preQuizScore ?? 0)
  const metrics = state.endTime ? {
    scenarioId: state.scenario?.id,
    scenarioTitle: state.scenario?.title,
    totalTimeSeconds: Math.round((state.endTime - state.startTime) / 1000),
    finalScore: state.score,
    quizSkipped: state.quizSkipped,
    preQuizScore: state.preQuizScore,
    postQuizScore: state.postQuizScore,
    knowledgeDelta: state.quizSkipped ? null : Math.max(0, rawDelta),
    hintsUsedCount: state.hintsUsed.length,
    wrongAttempts: state.wrongAttempts,
    flagsFound: state.flagsFound.length,
    totalFlags: state.scenario?.flags.filter(f => f.required !== false).length ?? 0,
    completionRate: state.scenario
      ? Math.round((state.flagsFound.filter(ff =>
          state.scenario.flags.filter(f => f.required !== false).some(rf => rf.id === ff.flagId)
        ).length / state.scenario.flags.filter(f => f.required !== false).length) * 100)
      : 0,
    bonusFlagsFound: state.flagsFound.filter(ff =>
      state.scenario?.flags.some(f => f.id === ff.flagId && f.required === false)
    ).length,
    totalBonusFlags: state.scenario?.flags.filter(f => f.required === false).length ?? 0,
    connectionsFound: state.foundConnections.length,
    totalConnections: state.scenario?.connections?.length ?? 0,
    // Quiz timing
    preQuizDurationSeconds: state.preQuizStartTime && state.preQuizEndTime
      ? Math.round((state.preQuizEndTime - state.preQuizStartTime) / 1000) : null,
    postQuizDurationSeconds: state.postQuizStartTime && state.postQuizEndTime
      ? Math.round((state.postQuizEndTime - state.postQuizStartTime) / 1000) : null,
    sessionLog: state.sessionLog,
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
      loadScenario, submitPreQuiz, skipQuiz, reset, setView, selectNode,
      tagEvidence, untagEvidence, useHint, submitFlag,
      wrongSubmission, startPostQuiz, submitPostQuiz, addTerminalLine, addTerminalCmd,
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