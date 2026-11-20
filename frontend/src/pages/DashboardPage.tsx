import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookOpenCheck,
  Database,
  FileStack,
  Layers3,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { api } from '../api/client'
import { Loading } from '../components/Loading'
import type { Meta } from '../types'

export function DashboardPage() {
  const [meta, setMeta] = useState<Meta | null>(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    api.meta()
      .then((metaData) => {
        if (!active) return
        setMeta(metaData)
      })
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : '数据加载失败'))
    return () => {
      active = false
    }
  }, [])

  if (error) {
    return (
      <div className="error-panel">
        <strong>无法读取题库</strong>
        <p>{error}</p>
        <button type="button" className="primary-button" onClick={() => window.location.reload()}>
          重新加载
        </button>
      </div>
    )
  }
  if (!meta) return <Loading label="正在读取题库概览…" />

  const maxType = Math.max(...meta.qtypes.map((item) => item.count), 1)
  const totalDifficulty = meta.difficulties.reduce((sum, item) => sum + item.count, 0)
  const difficultyColors = ['#b5462f', '#d78d3b', '#4f7968', '#8a6f57', '#5f7385', '#9a4e5f']
  let accumulated = 0
  const gradient = meta.difficulties
    .map((item, index) => {
      const start = (accumulated / totalDifficulty) * 100
      accumulated += item.count
      const end = (accumulated / totalDifficulty) * 100
      return `${difficultyColors[index % difficultyColors.length]} ${start}% ${end}%`
    })
    .join(', ')

  const knowledgeGroups = [...meta.knowledge_tree]
    .map((group) => ({
      ...group,
      total: group.count,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const subject = (meta.database.file_name || '题库').replace(/\.(db|sqlite3?)$/i, '')

  const stats = [
    { label: '题库总量', value: meta.database.question_count.toLocaleString(), suffix: '道', icon: Database, tone: 'red' },
    { label: '试卷来源', value: meta.database.paper_count.toLocaleString(), suffix: '套', icon: FileStack, tone: 'gold' },
    { label: '知识点', value: meta.database.knowledge_count, suffix: '类', icon: Layers3, tone: 'jade' },
    { label: '题型', value: meta.qtypes.length, suffix: '种', icon: BookOpenCheck, tone: 'blue' },
  ]

  return (
    <div className="dashboard-page">
      <section className="hero-banner">
        <div className="hero-copy">
          <span className="eyebrow light">{subject} · 本地题库</span>
          <h2>从 {meta.database.question_count.toLocaleString()} 道题中，<br />快速组成一份好试卷。</h2>
          <p>检索、筛选、编辑、入篮与 DOCX 导出集中在同一工作流中完成。</p>
          <div className="hero-actions">
            <Link to="/questions" className="button-on-dark">
              开始选题
              <ArrowRight size={17} />
            </Link>
            <Link to="/compose" className="button-outline-light">
              <Sparkles size={17} />
              智能组卷
            </Link>
          </div>
        </div>
        <div className="hero-seal" aria-hidden="true">
          <span>{subject.slice(0, 1)}</span>
          <small>题库工作台</small>
        </div>
        <div className="hero-lines" aria-hidden="true" />
      </section>

      <section className="stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <article className="stat-card" key={stat.label}>
              <span className={`stat-icon ${stat.tone}`}><Icon size={21} /></span>
              <div>
                <small>{stat.label}</small>
                <strong>{stat.value}<em>{stat.suffix}</em></strong>
              </div>
            </article>
          )
        })}
      </section>

      <div className="dashboard-grid">
        <section className="panel type-panel">
          <header className="panel-header">
            <div>
              <span className="eyebrow">题型结构</span>
              <h2>题库内容分布</h2>
            </div>
            <TrendingUp size={20} />
          </header>
          <div className="bar-chart">
            {meta.qtypes.map((item, index) => (
              <div className="bar-row" key={item.id}>
                <span className="bar-label">{item.name}</span>
                <div className="bar-track">
                  <span
                    style={{
                      width: `${Math.max((item.count / maxType) * 100, 2)}%`,
                      animationDelay: `${index * 45}ms`,
                    }}
                  />
                </div>
                <strong>{item.count.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="panel difficulty-panel">
          <header className="panel-header">
            <div>
              <span className="eyebrow">难度画像</span>
              <h2>试题难度构成</h2>
            </div>
          </header>
          <div
            className="difficulty-donut"
            style={{ background: `conic-gradient(${gradient})` }}
            role="img"
            aria-label="不同难度试题占比"
          >
            <div>
              <strong>{meta.database.question_count.toLocaleString()}</strong>
              <small>全部试题</small>
            </div>
          </div>
          <div className="donut-legend">
            {meta.difficulties.map((item, index) => (
              <div key={item.id}>
                <span style={{ background: difficultyColors[index % difficultyColors.length] }} />
                <span>{item.name}</span>
                <strong>{Math.round((item.count / totalDifficulty) * 100)}%</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="dashboard-bottom">
        <section className="panel">
          <header className="panel-header">
            <div>
              <span className="eyebrow">知识网络</span>
              <h2>重点知识板块</h2>
            </div>
            <Link to="/questions" className="text-link">查看全部 <ArrowRight size={14} /></Link>
          </header>
          <div className="knowledge-overview">
            {knowledgeGroups.map((group, index) => (
              <button
                type="button"
                key={group.name}
                className="knowledge-group-row"
                onClick={() => navigate(`/questions?knowledge=${encodeURIComponent(group.key)}`)}
              >
                <span className="knowledge-rank">{String(index + 1).padStart(2, '0')}</span>
                <span className="knowledge-name">{group.name}</span>
                <span className="knowledge-track"><span style={{ width: `${Math.min(group.total / 40000 * 100, 100)}%` }} /></span>
                <strong>{group.total.toLocaleString()}</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <header className="panel-header">
            <div>
              <span className="eyebrow">最近录入</span>
              <h2>最新试卷</h2>
            </div>
            <Link to="/papers" className="text-link">试卷库 <ArrowRight size={14} /></Link>
          </header>
          <div className="recent-papers">
            {meta.recent_papers.map((paper) => (
              <Link to={`/papers?paper=${paper.id}`} className="recent-paper-row" key={paper.id}>
                <span className="paper-file-icon"><FileStack size={17} /></span>
                <span>
                  <strong>{paper.name}</strong>
                  <small>{paper.question_count} 道题 · 试卷 #{paper.id}</small>
                </span>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="service-banner online">
        <div>
          <span className="service-banner-dot" />
          <div>
            <strong>试卷导出</strong>
            <small>选择试题后即可导出为 Word，支持无答案、题后解析和卷末答案三种形式。</small>
          </div>
        </div>
        <div>
          <Link to="/basket" className="primary-button">
            打开试题篮
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <p className="database-footnote">
        题库共 {meta.database.question_count.toLocaleString()} 道试题 · 最近更新{' '}
        {meta.database.updated_at ? new Date(meta.database.updated_at).toLocaleDateString('zh-CN') : '—'}
      </p>
    </div>
  )
}
