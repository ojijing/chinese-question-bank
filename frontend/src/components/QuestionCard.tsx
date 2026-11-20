import { useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  BookOpenCheck,
  Download,
  Eye,
  EyeOff,
  FilePenLine,
  GripVertical,
  LoaderCircle,
  Move,
  Plus,
  Trash2,
} from 'lucide-react'
import { downloadDocx } from '../api/client'
import { useBasket } from '../context/BasketContext'
import { useToast } from '../context/ToastContext'
import type { Question } from '../types'

interface QuestionCardProps {
  question: Question
  index: number
  bucketMode?: boolean
  onRemove?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onMoveOpen?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
  dragging?: boolean
  dragOver?: boolean
  onDragStart?: (event: DragEvent<HTMLElement>) => void
  onDragOver?: (event: DragEvent<HTMLElement>) => void
  onDrop?: (event: DragEvent<HTMLElement>) => void
  onDragEnd?: (event: DragEvent<HTMLElement>) => void
}

export function QuestionCard({
  question,
  index,
  bucketMode = false,
  onRemove,
  onMoveUp,
  onMoveDown,
  onMoveOpen,
  canMoveUp = false,
  canMoveDown = false,
  dragging = false,
  dragOver = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: QuestionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const basket = useBasket()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const inBasket = basket.has(question.id)

  const toggleBasket = () => {
    const added = basket.toggle(question.id)
    showToast(added ? `试题 ${question.id} 已加入试题篮` : `试题 ${question.id} 已移出试题篮`, 'success')
  }

  const downloadOne = async () => {
    setDownloading(true)
    try {
      await downloadDocx({
        title: `试题 ${question.id}`,
        question_ids: [question.id],
        mode: 'inline',
      })
      showToast('DOCX 已生成', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '导出失败', 'error')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <article
      className={`question-card ${dragging ? 'dragging' : ''} ${dragOver ? 'drag-over' : ''}`}
      draggable={bucketMode}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="question-accent" />
      <div className="question-card-head">
        {bucketMode && (
          <span
            className="drag-grip"
            title="拖动调整题序"
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <GripVertical size={17} />
          </span>
        )}
        <div className="question-index">
          <span>{String(index).padStart(2, '0')}</span>
          <small>题号 {question.id}</small>
        </div>
        <div className="question-tags">
          <span className="tag tag-type">{question.qtype.name}</span>
          <span className="tag tag-difficulty" data-level={question.difficulty.id}>
            {question.difficulty.name}
          </span>
          <span className="tag tag-knowledge">{question.knowledge.name}</span>
        </div>
        {bucketMode && (
          <div className="reorder-buttons" aria-label="调整顺序">
            <button
              type="button"
              className="icon-button small"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              title="上移"
            >
              <ArrowUp size={15} />
            </button>
            <button
              type="button"
              className="icon-button small"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              title="下移"
            >
              <ArrowDown size={15} />
            </button>
            <button
              type="button"
              className="icon-button small"
              onClick={onMoveOpen}
              title="移动到指定位置"
            >
              <Move size={15} />
            </button>
          </div>
        )}
      </div>

      <div className={`question-html ${expanded ? 'expanded' : 'collapsed'}`}>
        <div dangerouslySetInnerHTML={{ __html: question.content }} />
      </div>

      <button type="button" className="text-button expand-button" onClick={() => setExpanded(!expanded)}>
        {expanded ? '收起题干' : '展开完整题干'}
      </button>

      {showAnswer && (
        <div className="answer-panel">
          <span className="answer-label">解析</span>
          <div className="rich-content" dangerouslySetInnerHTML={{ __html: question.analysis || '<p>暂无解析</p>' }} />
        </div>
      )}

      <div className="question-card-foot">
        <div className="question-source">
          <BookOpenCheck size={15} />
          <span>{question.paper.name}</span>
        </div>
        <div className="question-actions">
          <button type="button" className="ghost-button" onClick={() => setShowAnswer(!showAnswer)}>
            {showAnswer ? <EyeOff size={16} /> : <Eye size={16} />}
            {showAnswer ? '收起解析' : '查看解析'}
          </button>
          <button type="button" className="ghost-button" onClick={downloadOne} disabled={downloading}>
            {downloading ? <LoaderCircle size={16} className="spin" /> : <Download size={16} />}
            下载
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => navigate(`/questions/${question.id}/edit`)}
          >
            <FilePenLine size={16} />
            编辑
          </button>
          {bucketMode ? (
            <button type="button" className="danger-button" onClick={onRemove}>
              <Trash2 size={16} />
              移出
            </button>
          ) : (
            <button
              type="button"
              className={inBasket ? 'secondary-button active' : 'primary-button small'}
              onClick={toggleBasket}
            >
              {inBasket ? <Trash2 size={16} /> : <Plus size={16} />}
              {inBasket ? '移出试题篮' : '加入试题篮'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
