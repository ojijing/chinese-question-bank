import { useEffect, useMemo, useState } from 'react'
import {
  BookOpenCheck,
  Check,
  Dices,
  LoaderCircle,
  Minus,
  Plus,
  ShoppingBasket,
  Sparkles,
  Target,
  WandSparkles,
} from 'lucide-react'
import { api } from '../api/client'
import { EmptyState } from '../components/EmptyState'
import { Loading } from '../components/Loading'
import { QuestionCard } from '../components/QuestionCard'
import { useBasket } from '../context/BasketContext'
import { useToast } from '../context/ToastContext'
import type { Meta, Question, RandomPayload } from '../types'
import { flattenKnowledgeLeaves } from '../utils/knowledge'

function toggleValue(list: number[], value: number): number[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

export function ComposePage() {
  const [meta, setMeta] = useState<Meta | null>(null)
  const [count, setCount] = useState(10)
  const [qtypeIds, setQtypeIds] = useState<number[]>([])
  const [difficultyIds, setDifficultyIds] = useState<number[]>([])
  const [knowledgeId, setKnowledgeId] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [excludeBasket, setExcludeBasket] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [busy, setBusy] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [error, setError] = useState('')
  const basket = useBasket()
  const { showToast } = useToast()

  useEffect(() => {
    api.meta().then(setMeta).catch((reason) => setError(reason instanceof Error ? reason.message : '参数加载失败'))
  }, [])

  const knowledgeOptions = useMemo(() => {
    if (!meta) return []
    const seen = new Set<number>()
    return flattenKnowledgeLeaves(meta.knowledge_tree).flatMap((item) => {
      if (!item.knowledge_id || seen.has(item.knowledge_id)) return []
      seen.add(item.knowledge_id)
      return [{ id: item.knowledge_id, name: item.name, group: item.name }]
    })
  }, [meta])

  if (!meta) {
    return error ? <div className="error-panel"><strong>无法加载组卷参数</strong><p>{error}</p></div> : <Loading />
  }

  const generate = async () => {
    setBusy(true)
    setError('')
    const payload: RandomPayload = {
      count,
      qtype_ids: qtypeIds,
      difficulty_ids: difficultyIds,
      knowledge_ids: knowledgeId ? [knowledgeId] : [],
      keyword: keyword.trim(),
      exclude_ids: excludeBasket ? basket.ids : [],
    }
    try {
      const result = await api.randomQuestions(payload)
      setQuestions(result.items)
      setHasGenerated(true)
      if (result.count < count) showToast(`题库中符合条件的试题不足，已抽取 ${result.count} 道`, 'info')
      else showToast(`已生成 ${result.count} 道备选试题`, 'success')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '组卷失败')
    } finally {
      setBusy(false)
    }
  }

  const applyPreset = (preset: 'basic' | 'standard' | 'advanced') => {
    if (preset === 'basic') {
      setCount(15)
      setDifficultyIds([2, 3])
    } else if (preset === 'standard') {
      setCount(20)
      setDifficultyIds([])
    } else {
      setCount(10)
      setDifficultyIds([5, 6])
    }
  }

  const addAll = () => {
    const added = basket.addMany(questions.map((question) => question.id))
    showToast(added ? `已将 ${added} 道题加入试题篮` : '这些试题已经在试题篮中', added ? 'success' : 'info')
  }

  return (
    <div className="compose-page">
      <section className="compose-intro">
        <div>
          <span className="eyebrow">SMART COMPOSER</span>
          <h2>让题库按照你的教学目标，随机生成一份候选试卷。</h2>
          <p>不选择题型或难度时，将默认从全部范围中抽取。生成结果可逐题查看，也可整体加入试题篮后调整顺序。</p>
        </div>
        <span className="compose-illustration"><WandSparkles size={54} /></span>
      </section>

      <div className="compose-layout">
        <section className="panel compose-form">
          <header className="panel-header">
            <div>
              <span className="eyebrow">SETTINGS</span>
              <h2>抽题条件</h2>
            </div>
            <Target size={20} />
          </header>

          <div className="preset-row">
            <button type="button" onClick={() => applyPreset('basic')}><BookOpenCheck size={16} />基础巩固</button>
            <button type="button" onClick={() => applyPreset('standard')}><Dices size={16} />综合练习</button>
            <button type="button" onClick={() => applyPreset('advanced')}><Sparkles size={16} />能力提升</button>
          </div>

          <div className="form-section compact-section">
            <div className="form-section-head">
              <span>01</span>
              <div><h3>试题数量</h3><p>最多一次抽取 100 道。</p></div>
            </div>
            <div className="count-stepper">
              <button type="button" onClick={() => setCount(Math.max(1, count - 1))}><Minus size={17} /></button>
              <input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(event) => setCount(Math.min(100, Math.max(1, Number(event.target.value) || 1)))}
              />
              <button type="button" onClick={() => setCount(Math.min(100, count + 1))}><Plus size={17} /></button>
              <span>道题</span>
            </div>
          </div>

          <div className="form-section compact-section">
            <div className="form-section-head">
              <span>02</span>
              <div><h3>题型范围</h3><p>可多选；不选表示全部题型。</p></div>
            </div>
            <div className="choice-chip-grid">
              {meta.qtypes.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={qtypeIds.includes(item.id) ? 'choice-chip selected' : 'choice-chip'}
                  onClick={() => setQtypeIds(toggleValue(qtypeIds, item.id))}
                >
                  {qtypeIds.includes(item.id) && <Check size={14} />}
                  {item.name}
                  <small>{item.count.toLocaleString()}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="form-section compact-section">
            <div className="form-section-head">
              <span>03</span>
              <div><h3>难度范围</h3><p>可多选；不选表示全难度。</p></div>
            </div>
            <div className="choice-chip-grid difficulty-choices">
              {meta.difficulties.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={difficultyIds.includes(item.id) ? 'choice-chip selected' : 'choice-chip'}
                  onClick={() => setDifficultyIds(toggleValue(difficultyIds, item.id))}
                >
                  {difficultyIds.includes(item.id) && <Check size={14} />}
                  {item.name}
                  <small>{item.count.toLocaleString()}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>限定知识点</span>
              <select value={knowledgeId} onChange={(event) => setKnowledgeId(Number(event.target.value))}>
                <option value={0}>不限知识点</option>
                {knowledgeOptions.map((item) => <option key={item.id} value={item.id}>{item.group} / {item.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>题干关键词</span>
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="可选，如：名著、文言文…" />
            </label>
          </div>

          <label className="switch-row">
            <input type="checkbox" checked={excludeBasket} onChange={(event) => setExcludeBasket(event.target.checked)} />
            <span className="switch-track"><span /></span>
            <span>排除试题篮中已有的题目</span>
          </label>

          {error && <div className="form-error">{error}</div>}
          <button type="button" className="primary-button generate-button" onClick={generate} disabled={busy}>
            {busy ? <LoaderCircle size={19} className="spin" /> : <Dices size={19} />}
            {busy ? '正在随机抽题…' : `随机抽取 ${count} 道试题`}
          </button>
        </section>

        <section className="compose-results">
          <div className="results-head compact-results-head">
            <div>
              <span className="eyebrow">CANDIDATES</span>
              <h2>{hasGenerated ? `候选试题 · ${questions.length} 道` : '候选试题'}</h2>
            </div>
            {questions.length > 0 && (
              <button type="button" className="secondary-button" onClick={addAll}>
                <ShoppingBasket size={16} />
                全部加入试题篮
              </button>
            )}
          </div>

          {!hasGenerated ? (
            <EmptyState
              title="等待生成试题"
              description="在左侧设置条件后点击“随机抽取”，候选题目会显示在这里。"
            />
          ) : questions.length === 0 ? (
            <EmptyState
              title="没有符合条件的试题"
              description="请放宽题型、难度或知识点条件后重新抽取。"
              action={<button type="button" className="primary-button" onClick={generate}>重新抽取</button>}
            />
          ) : (
            <div className="question-list compact-list">
              {questions.map((question, index) => (
                <QuestionCard key={question.id} question={question} index={index + 1} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
