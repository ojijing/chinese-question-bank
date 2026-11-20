import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Eye, FileText, LoaderCircle, Save, X } from 'lucide-react'
import { api } from '../api/client'
import { Loading } from '../components/Loading'
import { RichTextEditor } from '../components/RichTextEditor'
import { useToast } from '../context/ToastContext'
import type { Meta, Question, QuestionUpdatePayload } from '../types'
import { flattenKnowledgeLeaves } from '../utils/knowledge'

export function QuestionEditPage() {
  const { id } = useParams()
  const questionId = Number(id)
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [question, setQuestion] = useState<Question | null>(null)
  const [meta, setMeta] = useState<Meta | null>(null)
  const [form, setForm] = useState<QuestionUpdatePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([api.question(questionId), api.meta()])
      .then(([questionData, metaData]) => {
        if (!active) return
        setQuestion(questionData)
        setMeta(metaData)
        setForm({
          content: questionData.content,
          analysis: questionData.analysis,
          qtype_id: questionData.qtype.id || 1,
          difficulty_id: questionData.difficulty.id || 1,
          knowledge_id: questionData.knowledge.id || 1,
        })
      })
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : '试题加载失败'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [questionId])

  const knowledgeOptions = useMemo(() => {
    if (!meta) return []
    const seen = new Set<number>()
    return flattenKnowledgeLeaves(meta.knowledge_tree).flatMap((item) => {
      if (!item.knowledge_id || seen.has(item.knowledge_id)) return []
      seen.add(item.knowledge_id)
      return [{ id: item.knowledge_id, name: item.name, group: item.name }]
    })
  }, [meta])

  if (loading) return <Loading label="正在读取试题内容…" />
  if (error || !question || !form) {
    return (
      <div className="error-panel">
        <strong>试题无法打开</strong>
        <p>{error || '记录不存在'}</p>
        <button type="button" className="primary-button" onClick={() => navigate('/questions')}>返回题库</button>
      </div>
    )
  }

  const save = async () => {
    if (!form.content.replace(/<[^>]+>/g, '').trim()) {
      showToast('题干不能为空', 'error')
      return
    }
    setSaving(true)
    try {
      const result = await api.updateQuestion(questionId, form)
      setQuestion(result.question)
      showToast(`试题 ${questionId} 已保存`, 'success')
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : '保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="edit-page">
      <div className="page-heading-row">
        <button type="button" className="ghost-button" onClick={() => navigate(-1)}>
          <ArrowLeft size={17} />
          返回
        </button>
        <div>
          <span className="eyebrow">QUESTION EDITOR</span>
          <h2>编辑试题 <span>#{question.id}</span></h2>
        </div>
        <div className="heading-actions">
          <button type="button" className={preview ? 'secondary-button active' : 'ghost-button'} onClick={() => setPreview(!preview)}>
            <Eye size={17} />
            {preview ? '关闭预览' : '实时预览'}
          </button>
          <button type="button" className="primary-button" onClick={save} disabled={saving}>
            {saving ? <LoaderCircle size={17} className="spin" /> : <Save size={17} />}
            {saving ? '正在保存…' : '保存修改'}
          </button>
        </div>
      </div>

      <div className="edit-layout">
        <section className="panel edit-form-panel">
          <div className="form-section">
            <div className="form-section-head">
              <span>01</span>
              <div>
                <h3>题目属性</h3>
                <p>题型、难度与知识点会用于筛选和智能组卷。</p>
              </div>
            </div>
            <div className="form-grid three">
              <label className="field">
                <span>题型</span>
                <select value={form.qtype_id} onChange={(event) => setForm({ ...form, qtype_id: Number(event.target.value) })}>
                  {meta?.qtypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>难度</span>
                <select value={form.difficulty_id} onChange={(event) => setForm({ ...form, difficulty_id: Number(event.target.value) })}>
                  {meta?.difficulties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>知识点</span>
                <select value={form.knowledge_id} onChange={(event) => setForm({ ...form, knowledge_id: Number(event.target.value) })}>
                  {knowledgeOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.group} / {item.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-head">
              <span>02</span>
              <div>
                <h3>题干内容</h3>
                <p>支持加粗、下划线、列表、对齐与超链接，保存后立即生效。</p>
              </div>
            </div>
            <RichTextEditor
              label="题干内容"
              value={form.content}
              onChange={(content) => setForm({ ...form, content })}
              minHeight={280}
            />
          </div>

          <div className="form-section">
            <div className="form-section-head">
              <span>03</span>
              <div>
                <h3>解析与答案</h3>
                <p>导出时可选择题目后跟解析，或把答案统一放在卷末。</p>
              </div>
            </div>
            <RichTextEditor
              label="解析内容"
              value={form.analysis}
              onChange={(analysis) => setForm({ ...form, analysis })}
              minHeight={180}
            />
          </div>
        </section>

        <aside className="edit-sidebar">
          <div className="panel question-meta-panel">
            <span className="eyebrow">SOURCE</span>
            <h3><BookOpen size={18} />来源试卷</h3>
            <p>{question.paper.name}</p>
            <div className="meta-list">
              <div><span>试题 ID</span><strong>{question.id}</strong></div>
              <div><span>原题型</span><strong>{question.qtype.name}</strong></div>
              <div><span>原难度</span><strong>{question.difficulty.name}</strong></div>
              <div><span>原知识点</span><strong>{question.knowledge.name}</strong></div>
            </div>
          </div>
          <div className="panel tips-panel">
            <FileText size={20} />
            <h3>编辑提示</h3>
            <ul>
              <li>请保留题目中的公式、图片和表格格式。</li>
              <li>保存前建议打开实时预览检查图片、表格与空格。</li>
              <li>导出时会自动整理题号并分页。</li>
            </ul>
          </div>
        </aside>
      </div>

      {preview && (
        <div className="preview-drawer">
          <header>
            <div>
              <span className="eyebrow">LIVE PREVIEW</span>
              <h2>学生看到的题目样式</h2>
            </div>
            <button type="button" className="icon-button" onClick={() => setPreview(false)}><X size={19} /></button>
          </header>
          <div className="exam-paper-preview">
            <h1>{question.paper.name}</h1>
            <div className="preview-question">
              <span className="preview-number">{question.id}.</span>
              <div className="rich-content" dangerouslySetInnerHTML={{ __html: form.content }} />
            </div>
            {form.analysis && (
              <div className="answer-panel">
                <span className="answer-label">解析</span>
                <div className="rich-content" dangerouslySetInnerHTML={{ __html: form.analysis }} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
