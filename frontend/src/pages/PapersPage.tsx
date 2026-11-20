import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BookOpen,
  Download,
  FileStack,
  LoaderCircle,
  Search,
  ShoppingBasket,
} from 'lucide-react'
import { api, downloadDocx } from '../api/client'
import { EmptyState } from '../components/EmptyState'
import { ExportDialog } from '../components/ExportDialog'
import { Pagination } from '../components/Pagination'
import { QuestionCard } from '../components/QuestionCard'
import { useBasket } from '../context/BasketContext'
import { useToast } from '../context/ToastContext'
import type { ExportMode, PaperDetail, PaperSummary } from '../types'

export function PapersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialPaper = Number(searchParams.get('paper') || 0)
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [papers, setPapers] = useState<PaperSummary[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const [page, setPage] = useState(1)
  const [listLoading, setListLoading] = useState(true)
  const [activeId, setActiveId] = useState(initialPaper)
  const [paper, setPaper] = useState<PaperDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [error, setError] = useState('')
  const basket = useBasket()
  const { showToast } = useToast()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setKeyword(keywordInput.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [keywordInput])

  useEffect(() => {
    let active = true
    setListLoading(true)
    api.papers(keyword, page)
      .then((data) => {
        if (!active) return
        setPapers(data.items)
        setTotal(data.total)
        setPages(data.pages)
        if (!activeId && data.items.length) {
          setActiveId(data.items[0].id)
          setSearchParams({ paper: String(data.items[0].id) }, { replace: true })
        }
      })
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : '试卷列表加载失败'))
      .finally(() => active && setListLoading(false))
    return () => {
      active = false
    }
  }, [keyword, page])

  useEffect(() => {
    if (!activeId) {
      setPaper(null)
      return
    }
    let active = true
    setDetailLoading(true)
    setError('')
    api.paper(activeId)
      .then((data) => active && setPaper(data))
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : '试卷内容加载失败'))
      .finally(() => active && setDetailLoading(false))
    return () => {
      active = false
    }
  }, [activeId])

  const selectPaper = (id: number) => {
    setActiveId(id)
    setSearchParams({ paper: String(id) }, { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const addAll = () => {
    if (!paper) return
    const added = basket.addMany(paper.questions.map((question) => question.id))
    showToast(added ? `已将 ${added} 道题加入试题篮` : '本试卷题目已全部在试题篮中', added ? 'success' : 'info')
  }

  const exportPaper = async (title: string, mode: ExportMode) => {
    if (!paper) return
    try {
      await downloadDocx({ title, question_ids: paper.questions.map((question) => question.id), mode })
      showToast('试卷 DOCX 已生成', 'success')
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : '导出失败', 'error')
      throw reason
    }
  }

  return (
    <div className="papers-page">
      <aside className="paper-sidebar panel">
        <div className="paper-sidebar-head">
          <span className="eyebrow">PAPER ARCHIVE</span>
          <h2><FileStack size={19} />试卷库</h2>
          <p>共 {total.toLocaleString()} 套试卷</p>
        </div>
        <label className="search-box small-search">
          <Search size={17} />
          <input value={keywordInput} onChange={(event) => setKeywordInput(event.target.value)} placeholder="搜索试卷名称…" />
        </label>
        {listLoading ? (
          <div className="paper-list-loading"><LoaderCircle size={19} className="spin" />正在读取试卷…</div>
        ) : (
          <div className="paper-list">
            {papers.map((item, index) => (
              <button
                type="button"
                key={item.id}
                className={activeId === item.id ? 'active' : ''}
                onClick={() => selectPaper(item.id)}
              >
                <span className="paper-list-index">{String((page - 1) * 20 + index + 1).padStart(3, '0')}</span>
                <span className="paper-list-copy">
                  <strong>{item.name}</strong>
                  <small>{item.question_count} 道题 · #{item.id}</small>
                </span>
              </button>
            ))}
            {!papers.length && <p className="paper-list-empty">没有匹配的试卷</p>}
          </div>
        )}
        <Pagination page={page} pages={pages} onChange={setPage} compact />
      </aside>

      <section className="paper-detail">
        {detailLoading ? (
          <div className="panel paper-loading"><LoaderCircle className="spin" size={24} />正在加载试卷内容…</div>
        ) : error ? (
          <div className="error-panel"><strong>无法打开试卷</strong><p>{error}</p></div>
        ) : !paper ? (
          <EmptyState title="选择一套试卷" description="从左侧试卷库中选择后，可查看原卷题目并加入试题篮。" />
        ) : (
          <>
            <header className="paper-detail-head">
              <div>
                <span className="eyebrow">PAPER #{paper.id}</span>
                <h2>{paper.name}</h2>
                <p><BookOpen size={15} />{paper.question_count} 道题 · 按原始题号顺序展示</p>
              </div>
              <div className="paper-detail-actions">
                <button type="button" className="secondary-button" onClick={addAll}>
                  <ShoppingBasket size={16} />
                  整卷入篮
                </button>
                <button type="button" className="primary-button" onClick={() => setExportOpen(true)}>
                  <Download size={16} />
                  导出试卷
                </button>
              </div>
            </header>

            <div className="paper-toc panel">
              <span className="eyebrow">QUICK INDEX</span>
              <div>
                {paper.questions.map((question, index) => (
                  <button
                    type="button"
                    key={question.id}
                    onClick={() => document.getElementById(`paper-q-${question.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <small>快速定位题目，下载时仍按完整试卷顺序排列。</small>
            </div>

            <div className="question-list">
              {paper.questions.map((question, index) => (
                <div id={`paper-q-${question.id}`} key={question.id}>
                  <QuestionCard question={question} index={index + 1} />
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {paper && (
        <ExportDialog
          open={exportOpen}
          title="导出整份试卷"
          defaultTitle={paper.name}
          questionCount={paper.question_count}
          onClose={() => setExportOpen(false)}
          onExport={exportPaper}
        />
      )}
    </div>
  )
}
