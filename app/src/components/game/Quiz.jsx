// Quiz.jsx
import { useState } from 'react'
import { Brain, CheckCircle, XCircle, ChevronRight } from 'lucide-react'
import { useEngine } from './ScenarioEngine'

export default function Quiz({ type }) {
  const { state, submitPreQuiz, submitPostQuiz } = useEngine()
  const questions = type === 'pre' ? state.scenario.preQuiz : state.scenario.postQuiz
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const allAnswered = questions.every(q => answers[q.id] !== undefined)
  const correct = submitted ? questions.filter(q => answers[q.id] === q.correct).length : null

  const handleSubmit = () => {
    setSubmitted(true)
    setTimeout(() => {
      type === 'pre' ? submitPreQuiz(answers) : submitPostQuiz(answers)
    }, 2400)
  }

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Brain size={18} style={{ color: 'var(--green-main)' }} />
        <div>
          <div style={{ color: 'var(--green-main)', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {type === 'pre' ? 'Pre-Investigation Assessment' : 'Post-Investigation Assessment'}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: 3 }}>
            {type === 'pre'
              ? 'Establish your baseline before beginning the case.'
              : 'Confirm your understanding of the techniques you uncovered.'}
          </div>
        </div>
      </div>

      {/* Score banner */}
      {submitted && correct !== null && (
        <div style={{
          marginBottom: 20, padding: '10px 14px', borderRadius: 'var(--radius-md)',
          background: correct === questions.length ? 'rgba(0,200,100,0.08)' : 'rgba(255,184,0,0.07)',
          border: `1px solid ${correct === questions.length ? 'var(--green-muted)' : 'var(--amber-dim)'}`,
          color: correct === questions.length ? 'var(--green-main)' : 'var(--amber-main)',
          fontSize: '13px',
        }}>
          {correct}/{questions.length} correct
          {type === 'post' && <span style={{ color: 'var(--text-muted)', marginLeft: 12 }}>Loading debrief...</span>}
        </div>
      )}

      {/* Questions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {questions.map((q, qi) => (
          <QuestionCard
            key={q.id} question={q} index={qi}
            selected={answers[q.id]}
            submitted={submitted}
            onChange={v => !submitted && setAnswers(a => ({ ...a, [q.id]: v }))}
          />
        ))}
      </div>

      {/* Submit */}
      {!submitted && (
        <button
          className="btn-submit"
          style={{ marginTop: 28 }}
          onClick={handleSubmit}
          disabled={!allAnswered}
        >
          <ChevronRight size={13} />
          {allAnswered
            ? (type === 'pre' ? '▶ Submit and Begin Investigation' : '▶ Submit and View Results')
            : `Answer all ${questions.length} questions to continue`}
        </button>
      )}
    </div>
  )
}

function QuestionCard({ question, index, selected, submitted, onChange }) {
  const isCorrect = submitted && selected === question.correct
  const isWrong = submitted && selected !== undefined && selected !== question.correct

  return (
    <div style={{
      border: `1px solid ${submitted && isCorrect ? 'var(--green-muted)' : submitted && isWrong ? 'var(--red-dim)' : 'var(--border-dim)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '14px',
      background: submitted && isCorrect ? 'rgba(0,200,100,0.04)' : submitted && isWrong ? 'rgba(255,60,60,0.04)' : 'var(--bg-raised)',
      transition: 'border-color 0.2s',
    }}>
      <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 12 }}>
        <span style={{ color: 'var(--green-dim)', marginRight: 8 }}>Q{index + 1}.</span>
        {question.question}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {question.options.map((opt, oi) => {
          const isSelected = selected === oi
          const isAnswer = question.correct === oi
          let cls = ''
          if (submitted) {
            if (isAnswer) cls = 'correct'
            else if (isSelected) cls = 'wrong'
            else cls = 'dimmed'
          } else if (isSelected) cls = 'selected'

          return (
            <button key={oi} className={`quiz-opt ${cls}`} onClick={() => onChange(oi)} disabled={submitted}>
              <span style={{
                width: 18, height: 18, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {submitted && isAnswer
                  ? <CheckCircle size={13} style={{ color: 'var(--green-main)' }} />
                  : submitted && isSelected && !isAnswer
                    ? <XCircle size={13} style={{ color: 'var(--red-alert)' }} />
                    : <span style={{ fontSize: '9px', border: '1px solid currentColor', borderRadius: 2, width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {String.fromCharCode(65 + oi)}
                    </span>
                }
              </span>
              {opt}
            </button>
          )
        })}
      </div>
      {submitted && (
        <div style={{
          marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-dim)',
          fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6,
        }}>
          <span style={{ color: 'var(--text-muted)' }}>Explanation: </span>
          {question.explanation}
        </div>
      )}
    </div>
  )
}
