import { useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  BookOpenCheck,
  Download,
  FileText,
  GripVertical,
  ListChecks,
  LoaderCircle,
  Move,
  ShoppingBasket,
  Trash2,
} from 'lucide-react'
import { api, downloadDocx } from '../api/client'
import { EmptyState } from '../components/EmptyState'
import { ExportDialog } from '../components/ExportDialog'
import { Loading } from '../components/Loading'
import { Modal } from '../components/Modal'
import { QuestionCard } from '../components/QuestionCard'
import { useBasket } from '../context/BasketContext'
import { useToast } from '../context/ToastContext'
import type { ExportMode, Question } from '../types'

function defaultTitle(): string {
  const now = new Date()
  return `${now.getFullYear()}年${now.getMonth() + 1}月自组语文试题`
}

export function BasketPage() {
  const basket = useBasket()
  const { showToast } = useToast()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [paperTitle, setPaperTitle] = useState(defaultTitle)
  const [dragId, setDragId] = useState<number | null>(null)
  const [overId, setOverId] = useState<number | null>(null)
  const [moveId, setMoveId] = useState<number | null>(null)
  const [moveTarget, setMoveTarget] = useState(1)
  const tocRefs = useRef(new Map<number, HTMLDivElement>())
  const tocRects = useRef(new Map<number, DOMRect>())
  const basketKey = basket.ids.join(',')

  useLayoutEffect(() => {
    const activeIds = new Set(basket.ids)
    tocRefs.current.forEach((_, id) => {
      if (!activeIds.has(id)) tocRefs.current.delete(id)
    })
    basket.ids.forEach((id) => {
      const element = tocRefs.current.get(id)
      if (!element) return
      const nextRect = element.getBoundingClientRect()
      const previousRect = tocRects.current.get(id)
      if (previousRect && Math.abs(previousRect.top - nextRect.top) > 1) {
        element.animate(
          [
            { transform: `translateY(${previousRect.top - nextRect.top}px)` },
            { transform: 'translateY(0)' },
          ],
          { duration: 320, easing: 'cubic-bezier(0.22, 0.8, 0.3, 1)' },
        )
      }
      tocRects.current.set(id, nextRect)
    })
    tocRects.current.forEach((_, id) => {
      if (!activeIds.has(id)) tocRects.current.delete(id)
    })
  }, [basketKey])

  useEffect(() => {
    if (!basket.ids.length) {
      setQuestions([])
      return
    }
    let active = true
    setLoading(true)
    api.bulkQuestions(basket.ids)
      .then((data) => active && setQuestions(data.items))
      .catch((reason) => active && showToast(reason instanceof Error ? reason.message : '试题篮加载失败', 'error'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [basket.ids.join(','), showToast])

  const typeStats = useMemo(() => {
    const counts = new Map<string, number>()
    questions.forEach((question) => counts.set(question.qtype.name, (counts.get(question.qtype.name) || 0) + 1))
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [questions])

  const questionById = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions],
  )

  const clearBasket = () => {
    if (!window.confirm('确定清空试题篮中的全部题目吗？')) return
    basket.clear()
    showToast('试题篮已清空', 'info')
  }

  const handleDragStart = (event: DragEvent<HTMLElement>, id: number) => {
    setDragId(id)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(id))
  }

  const handleDragOver = (event: DragEvent<HTMLElement>, id: number) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (overId !== id) setOverId(id)
  }

  const handleDrop = (event: DragEvent<HTMLElement>, targetId: number) => {
    event.preventDefault()
    const sourceId = dragId ?? Number(event.dataTransfer.getData('text/plain'))
    if (!sourceId || sourceId === targetId) return
    const from = basket.ids.indexOf(sourceId)
    const target = basket.ids.indexOf(targetId)
    if (from < 0 || target < 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const placeAfter = event.clientY > rect.top + rect.height / 2
    let destination = target + (placeAfter ? 1 : 0)
    if (from < destination) destination -= 1
    basket.moveTo(sourceId, destination)
    showToast('题序已调整', 'success')
    setDragId(null)
    setOverId(null)
  }

  const handleDragEnd = () => {
    setDragId(null)
    setOverId(null)
  }

  const openMove = (id: number) => {
    setMoveId(id)
    setMoveTarget(basket.ids.indexOf(id) + 1)
  }

  const confirmMove = () => {
    if (moveId === null) return
    const target = Math.max(1, Math.min(basket.count, moveTarget || 1))
    basket.moveTo(moveId, target - 1)
    showToast(`试题已移动到第 ${target} 题`, 'success')
    setMoveId(null)
  }

  const exportBasket = async (title: string, mode: ExportMode) => {
    try {
      await downloadDocx({ title, question_ids: basket.ids, mode })
      basket.clear()
      showToast('Word 文档已生成，试题篮已清空', 'success')
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : '导出失败', 'error')
      throw reason
    }
  }

  if (!basket.ids.length) {
    return (
      <div className="basket-empty-page">
        <EmptyState
          title="试题篮还是空的"
          description="从题库检索、试卷浏览或智能组卷中添加试题，然后在这里调整顺序并导出。"
          action={<Link to="/questions" className="primary-button"><ShoppingBasket size={17} />去题库选题</Link>}
        />
      </div>
    )
  }

  return (
    <div className="basket-page">
      <section className="basket-items">
        <div className="results-head basket-head">
          <div>
            <span className="eyebrow">SELECTED QUESTIONS</span>
            <h2>已选 <strong>{basket.count}</strong> 道试题</h2>
            <p>可直接拖动题目调整顺序，也可使用上移、下移或“移动到”按钮精确调整。</p>
          </div>
          <button type="button" className="danger-button" onClick={clearBasket}>
            <Trash2 size={16} />
            清空试题篮
          </button>
        </div>

        {loading ? (
          <Loading label="正在加载试题篮…" />
        ) : (
          <div className="question-list">
            {basket.ids.map((id, index) => {
              const question = questionById.get(id)
              return question ? (
                <div id={`basket-q-${id}`} key={id}>
                  <QuestionCard
                    question={question}
                    index={index + 1}
                    bucketMode
                    dragging={dragId === id}
                    dragOver={overId === id && dragId !== id}
                    onDragStart={(event) => handleDragStart(event, id)}
                    onDragOver={(event) => handleDragOver(event, id)}
                    onDrop={(event) => handleDrop(event, id)}
                    onDragEnd={handleDragEnd}
                    onRemove={() => basket.remove(id)}
                    onMoveUp={() => basket.move(id, -1)}
                    onMoveDown={() => basket.move(id, 1)}
                    onMoveOpen={() => openMove(id)}
                    canMoveUp={index > 0}
                    canMoveDown={index < basket.ids.length - 1}
                  />
                </div>
              ) : null
            })}
          </div>
        )}
      </section>

      <aside className="floating-basket-panel" data-testid="floating-basket-panel">
        <div className="floating-basket-head">
          <span className="eyebrow">FLOATING BASKET</span>
          <h2><ShoppingBasket size={19} />试题篮 <b>{basket.count}</b></h2>
          <small>题序目录与导出操作都在这里完成。</small>
        </div>
        <section className="panel basket-toc-panel">
          <div className="toc-head">
            <span className="eyebrow">QUESTION INDEX</span>
            <h2><ListChecks size={18} />题序目录</h2>
            <small>拖动或使用按钮调整顺序，点击题号快速定位。</small>
          </div>
          <div className="basket-toc-list">
            {basket.ids.map((id, index) => {
              const question = questionById.get(id)
              return (
                <div
                  key={id}
                  ref={(element) => {
                    if (element) tocRefs.current.set(id, element)
                    else tocRefs.current.delete(id)
                  }}
                  className={`toc-row ${dragId === id ? 'dragging' : ''} ${overId === id && dragId !== id ? 'drag-over' : ''}`}
                  draggable
                  onDragStart={(event) => handleDragStart(event, id)}
                  onDragOver={(event) => handleDragOver(event, id)}
                  onDrop={(event) => handleDrop(event, id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => document.getElementById(`basket-q-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                >
                  <span className="toc-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="toc-copy">
                    <strong>{question?.qtype.name || '试题'}</strong>
                    <small>试题 #{id}</small>
                  </span>
                  <span className="toc-actions">
                    <button type="button" title="上移" disabled={index === 0} onClick={(event) => { event.stopPropagation(); basket.move(id, -1) }}>
                      <ArrowUp size={13} />
                    </button>
                    <button type="button" title="下移" disabled={index === basket.ids.length - 1} onClick={(event) => { event.stopPropagation(); basket.move(id, 1) }}>
                      <ArrowDown size={13} />
                    </button>
                    <button type="button" title="移动到" onClick={(event) => { event.stopPropagation(); openMove(id) }}>
                      <Move size={13} />
                    </button>
                  </span>
                  <GripVertical className="toc-grip" size={15} />
                </div>
              )
            })}
          </div>
        </section>

        <section className="panel basket-summary">
          <span className="eyebrow">BASKET SUMMARY</span>
          <h2><Download size={19} />导出试卷</h2>
          <label className="field">
            <span>试卷标题</span>
            <input value={paperTitle} onChange={(event) => setPaperTitle(event.target.value)} />
          </label>

          <div className="basket-stats">
            <div className="basket-total">
              <span><ListChecks size={18} />题目总数</span>
              <strong>{questions.length}<small>道</small></strong>
            </div>
            <div className="type-stat-list">
              {typeStats.map(([name, count]) => (
                <div key={name}>
                  <span>{name}</span>
                  <span className="type-stat-track"><span style={{ width: `${count / Math.max(questions.length, 1) * 100}%` }} /></span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="basket-checklist">
            <p><BookOpenCheck size={15} />导出前检查</p>
            <ul>
              <li>已选试题会按题型分组，组内保持当前顺序。</li>
              <li>可选择无答案、题后跟解析或卷末答案。</li>
              <li>导出完成后会自动下载 Word 文档并清空试题篮。</li>
            </ul>
          </div>

          <button type="button" className="primary-button full-width" onClick={() => setExportOpen(true)} disabled={!questions.length}>
            <FileText size={18} />
            选择格式并导出
          </button>
          {loading && <p className="summary-loading"><LoaderCircle size={14} className="spin" />正在同步题目信息…</p>}
        </section>
      </aside>

      <ExportDialog
        open={exportOpen}
        title="导出试题篮"
        defaultTitle={paperTitle}
        questionCount={questions.length}
        onClose={() => setExportOpen(false)}
        onExport={exportBasket}
      />

      <Modal
        open={moveId !== null}
        title="移动题目位置"
        eyebrow="题序调整"
        onClose={() => setMoveId(null)}
        size="sm"
        footer={
          <>
            <button type="button" className="ghost-button" onClick={() => setMoveId(null)}>取消</button>
            <button type="button" className="primary-button" onClick={confirmMove}>确认移动</button>
          </>
        }
      >
        <p className="move-description">将当前试题移动到试卷中的指定位置。</p>
        <label className="field">
          <span>目标题序（共 {basket.count} 题）</span>
          <input
            type="number"
            min={1}
            max={basket.count}
            value={moveTarget}
            onChange={(event) => setMoveTarget(Number(event.target.value) || 1)}
          />
        </label>
        <div className="move-shortcuts">
          <button type="button" className="ghost-button" onClick={() => setMoveTarget(1)}>移到开头</button>
          <button type="button" className="ghost-button" onClick={() => setMoveTarget(basket.count)}>移到末尾</button>
        </div>
      </Modal>
    </div>
  )
}
