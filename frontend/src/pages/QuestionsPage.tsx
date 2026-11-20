import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ChevronDown,
  ChevronRight,
  Filter,
  FolderOpen,
  Layers3,
  RotateCcw,
  Search,
  ShoppingBasket,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { api } from '../api/client'
import { EmptyState } from '../components/EmptyState'
import { Pagination } from '../components/Pagination'
import { QuestionCard } from '../components/QuestionCard'
import { SkeletonCards } from '../components/Loading'
import { useBasket } from '../context/BasketContext'
import { useToast } from '../context/ToastContext'
import type { KnowledgeNode, Meta, Question } from '../types'
import {
  findKnowledgeNode,
  flattenKnowledgeLeaves,
  knowledgeNodeContains,
} from '../utils/knowledge'

function KnowledgeNodeBlock({
  node,
  depth,
  selectedKey,
  onSelect,
}: {
  node: KnowledgeNode
  depth: number
  selectedKey: string
  onSelect: (node: KnowledgeNode) => void
}) {
  const [open, setOpen] = useState(depth < 2 || knowledgeNodeContains(node, selectedKey))
  const hasChildren = node.children.length > 0
  const active = selectedKey === node.key

  return (
    <div className={`knowledge-node depth-${depth}`} data-level={node.level}>
      <div className={`knowledge-node-row ${active ? 'active' : ''}`}>
        {hasChildren ? (
          <button
            type="button"
            className="knowledge-toggle"
            onClick={() => setOpen(!open)}
            aria-label={open ? '收起分类' : '展开分类'}
          >
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="knowledge-leaf-dot" />
        )}
        <button
          type="button"
          className="knowledge-select"
          data-testid={`knowledge-node-${node.key}`}
          onClick={() => onSelect(node)}
        >
          {hasChildren && <FolderOpen size={13} />}
          <span>{node.name}</span>
          <small>{node.count.toLocaleString()}</small>
        </button>
      </div>
      {hasChildren && open && (
        <div className="knowledge-node-children">
          {node.children.map((child) => (
            <KnowledgeNodeBlock
              key={child.key}
              node={child}
              depth={depth + 1}
              selectedKey={selectedKey}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function QuestionsPage() {
  const [searchParams] = useSearchParams()
  const [meta, setMeta] = useState<Meta | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const [page, setPage] = useState(1)
  const [keywordInput, setKeywordInput] = useState(searchParams.get('keyword') || '')
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '')
  const [qtype, setQtype] = useState(Number(searchParams.get('qtype') || 0))
  const [difficulty, setDifficulty] = useState(Number(searchParams.get('difficulty') || 0))
  const [selectedKey, setSelectedKey] = useState('')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const basket = useBasket()
  const { showToast } = useToast()

  useEffect(() => {
    let active = true
    api.meta()
      .then((data) => {
        if (!active) return
        setMeta(data)
        const raw = searchParams.get('knowledge')
        if (!raw) return
        if (/^\d+$/.test(raw)) {
          const leaf = flattenKnowledgeLeaves(data.knowledge_tree).find(
            (item) => item.knowledge_id === Number(raw),
          )
          if (leaf) setSelectedKey(leaf.key)
        } else if (findKnowledgeNode(data.knowledge_tree, raw)) {
          setSelectedKey(raw)
        }
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setKeyword(keywordInput.trim())
      setPage(1)
    }, 380)
    return () => window.clearTimeout(timer)
  }, [keywordInput])

  const selectedNode = useMemo(
    () => (selectedKey && meta ? findKnowledgeNode(meta.knowledge_tree, selectedKey) : null),
    [meta, selectedKey],
  )
  const selectedIds = selectedNode?.knowledge_ids || []

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    api.questions({
      keyword,
      qtype_id: qtype,
      difficulty_id: difficulty,
      knowledge_ids: selectedIds,
      page,
      page_size: 12,
      sort,
    })
      .then((data) => {
        if (!active) return
        setQuestions(data.items)
        setTotal(data.total)
        setPages(data.pages)
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : '加载失败')
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [keyword, qtype, difficulty, selectedKey, page, sort])

  const hasFilters = Boolean(keyword || qtype || difficulty || selectedKey)
  const resetFilters = () => {
    setKeywordInput('')
    setKeyword('')
    setQtype(0)
    setDifficulty(0)
    setSelectedKey('')
    setSort('newest')
    setPage(1)
  }

  const addPageToBasket = () => {
    const added = basket.addMany(questions.map((question) => question.id))
    showToast(added ? `已加入 ${added} 道试题` : '本页试题已全部在试题篮中', added ? 'success' : 'info')
  }

  return (
    <div className="questions-page">
      <button type="button" className="mobile-filter-button" onClick={() => setFiltersOpen(true)}>
        <Filter size={18} />
        筛选条件
        {hasFilters && <b>已启用</b>}
      </button>

      {filtersOpen && <button type="button" className="filter-scrim" onClick={() => setFiltersOpen(false)} aria-label="关闭筛选" />}

      <aside className={`filter-sidebar ${filtersOpen ? 'open' : ''}`}>
        <div className="filter-sidebar-head">
          <div>
            <span className="eyebrow">KNOWLEDGE</span>
            <h2><Layers3 size={18} />知识点筛选</h2>
          </div>
          <button type="button" className="icon-button mobile-only" onClick={() => setFiltersOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <button
          type="button"
          className={`all-knowledge-button ${!selectedKey ? 'active' : ''}`}
          onClick={() => { setSelectedKey(''); setPage(1); setFiltersOpen(false) }}
        >
          <span>全部知识点</span>
          <small>{meta?.database.question_count.toLocaleString() || '—'}</small>
        </button>
        <div className="knowledge-section-head">
          <Layers3 size={14} />
          <span>知识点分类</span>
        </div>
        <div className="knowledge-tree">
          {meta?.knowledge_tree.map((node) => (
            <KnowledgeNodeBlock
              key={node.key}
              node={node}
              depth={0}
              selectedKey={selectedKey}
              onSelect={(next) => {
                setSelectedKey(next.key)
                setPage(1)
                setFiltersOpen(false)
              }}
            />
          ))}
        </div>
        <p className="filter-sidebar-note">点击分类名称即可按该分类下的全部知识点筛选。</p>
      </aside>

      <section className="question-results">
        <div className="search-toolbar panel" data-testid="filter-sticky">
          <label className="search-box">
            <Search size={18} />
            <input
              data-testid="filter-keyword"
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="搜索题干关键词，如：桃花源记、修辞、病句…"
            />
            {keywordInput && (
              <button type="button" onClick={() => setKeywordInput('')} aria-label="清空搜索">
                <X size={16} />
              </button>
            )}
          </label>
          <div className="select-row">
            <label>
              <span>题型</span>
              <select
                data-testid="filter-qtype"
                value={qtype}
                onChange={(event) => { setQtype(Number(event.target.value)); setPage(1) }}
              >
                <option value={0}>全部题型</option>
                {meta?.qtypes.map((item) => <option key={item.id} value={item.id}>{item.name}（{item.count}）</option>)}
              </select>
            </label>
            <label>
              <span>难度</span>
              <select
                data-testid="filter-difficulty"
                value={difficulty}
                onChange={(event) => { setDifficulty(Number(event.target.value)); setPage(1) }}
              >
                <option value={0}>全部难度</option>
                {meta?.difficulties.map((item) => <option key={item.id} value={item.id}>{item.name}（{item.count}）</option>)}
              </select>
            </label>
            <label>
              <span>排序</span>
              <select value={sort} onChange={(event) => { setSort(event.target.value as 'newest' | 'oldest'); setPage(1) }}>
                <option value="newest">最新优先</option>
                <option value="oldest">最早优先</option>
              </select>
            </label>
          </div>
        </div>

        <div className="results-head">
          <div>
            <span className="eyebrow">SEARCH RESULT</span>
            <h2>
              共找到 <strong>{total.toLocaleString()}</strong> 道试题
              {selectedNode && <span className="result-focus">· {selectedNode.name}</span>}
            </h2>
          </div>
          <div className="results-actions">
            {hasFilters && (
              <button type="button" className="ghost-button" onClick={resetFilters}>
                <RotateCcw size={15} />
                清空筛选
              </button>
            )}
            <button type="button" className="secondary-button" onClick={addPageToBasket} disabled={!questions.length}>
              <ShoppingBasket size={16} />
              本页全部入篮
            </button>
          </div>
        </div>

        {hasFilters && (
          <div className="active-filters">
            <SlidersHorizontal size={14} />
            {keyword && <span>关键词：{keyword}</span>}
            {qtype > 0 && <span>题型：{meta?.qtypes.find((item) => item.id === qtype)?.name}</span>}
            {difficulty > 0 && <span>难度：{meta?.difficulties.find((item) => item.id === difficulty)?.name}</span>}
            {selectedNode && <span>知识点：{selectedNode.name}</span>}
          </div>
        )}

        {error && <div className="error-panel compact"><strong>加载失败</strong><p>{error}</p></div>}
        {loading ? (
          <SkeletonCards count={4} />
        ) : questions.length ? (
          <div className="question-list">
            {questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={(page - 1) * 12 + index + 1}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="没有找到符合条件的试题"
            description="尝试缩短关键词，或减少题型、难度和知识点筛选条件。"
            action={<button type="button" className="primary-button" onClick={resetFilters}>恢复全部试题</button>}
          />
        )}

        <Pagination page={page} pages={pages} onChange={(next) => { setPage(next); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
      </section>
    </div>
  )
}
