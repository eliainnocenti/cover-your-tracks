// ScenarioEngine.jsx — Core game state machine
import { createContext, useContext, useReducer, useCallback } from 'react'

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
  sessionLog: [],          // append-only audit trail for professor dashboard
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
        sessionLog: [{ event: 'scenario_loaded', scenarioId: action.payload.id, ts: Date.now() }],
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
        sessionLog: [...state.sessionLog, { event: 'pre_quiz_done', score, ts: Date.now() }],
      }
    }

    case 'SET_VIEW':
      return { ...state, activeView: action.payload }

    case 'SELECT_NODE':
      return { ...state, selectedNode: action.payload }

    case 'TAG_EVIDENCE': {
      if (state.taggedEvidence.find(e => e.id === action.payload.id)) return state
      return { ...state, taggedEvidence: [...state.taggedEvidence, action.payload] }
    }

    case 'UNTAG_EVIDENCE':
      return { ...state, taggedEvidence: state.taggedEvidence.filter(e => e.id !== action.payload) }

    case 'USE_HINT': {
      const tier = action.payload
      const hint = state.scenario.hints.find(h => h.tier === tier)
      if (!hint || state.hintsUsed.includes(tier)) return state
      const newScore = Math.max(0, state.score - hint.cost)
      return {
        ...state,
        hintsUsed: [...state.hintsUsed, tier],
        score: newScore,
        sessionLog: [...state.sessionLog, { event: 'hint_used', tier, cost: hint.cost, ts: Date.now() }],
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
        sessionLog: [...state.sessionLog, { event: 'flag_found', flagId, points: flag.points, ts: Date.now() }],
      }
    }

    case 'WRONG_SUBMISSION':
      return {
        ...state,
        wrongAttempts: state.wrongAttempts + 1,
        score: Math.max(0, state.score - 5),
        sessionLog: [...state.sessionLog, { event: 'wrong_attempt', ts: Date.now() }],
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
        sessionLog: [...state.sessionLog, { event: 'post_quiz_done', score: postScore, bonus, ts: Date.now() }],
      }
    }

    case 'ADD_TERMINAL_LINE':
      return {
        ...state,
        terminalHistory: [...state.terminalHistory, { text: action.payload.text, type: action.payload.type, timestamp: Date.now() }],
      }

    case 'CLEAR_TERMINAL':
      return { ...state, terminalHistory: [] }

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
  const clearTerminal    = useCallback(()  => dispatch({ type: 'CLEAR_TERMINAL' }), [])
  const complete         = useCallback(()  => dispatch({ type: 'COMPLETE' }), [])

  // Derived metrics — available after endTime is set
  const metrics = state.endTime ? {
    scenarioId:         state.scenario?.id,
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
    sessionLog:         state.sessionLog,
  } : null

  return (
    <EngineContext.Provider value={{
      state, dispatch, metrics,
      loadScenario, submitPreQuiz, setView, selectNode,
      tagEvidence, untagEvidence, useHint, submitFlag,
      wrongSubmission, submitPostQuiz, addTerminalLine, clearTerminal, complete,
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
