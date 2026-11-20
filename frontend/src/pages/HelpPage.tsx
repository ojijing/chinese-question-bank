import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpenText,
  Check,
  Database,
  Download,
  FileText,
  RefreshCw,
  ShoppingBasket,
} from 'lucide-react'
import { api } from '../api/client'
import { useToast } from '../context/ToastContext'
import type { DatabaseList } from '../types'

function formatSize(size: number): string {
  if (size >= 1024 * 1024 * 1024) return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(size / 1024))} KB`
}

export function HelpPage() {
  const { showToast } = useToast()
  const [data, setData] = useState<DatabaseList | null>(null)
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => {
    api.databases()
      .then((result) => {
        setData(result)
        setSelected((current) => current || result.current)
      })
      .catch((reason) => showToast(reason instanceof Error ? reason.message : '题库列表加载失败', 'error'))
  }

  useEffect(() => {
    load()
  }, [])

  const switchDatabase = async () => {
    if (!selected || selected === data?.current) {
      showToast('请选择另一套题库', 'info')
      return
    }
    if (!window.confirm('切换题库后，当前试题篮中的题号可能不再对应新题库，是否继续？')) return
    setBusy(true)
    try {
      const result = await api.switchDatabase(selected)
      showToast(`${result.name} 切换成功`, 'success')
      window.setTimeout(() => window.location.reload(), 500)
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : '题库切换失败', 'error')
      setBusy(false)
    }
  }

  return (
    <div className="help-page">
      <section className="help-hero panel">
        <div>
          <span className="eyebrow">GETTING STARTED</span>
          <h2>题库使用指南</h2>
          <p>这里汇总了选题、组卷、试题篮整理和 Word 导出的完整流程。无需登录，打开即可使用。</p>
          <div className="help-actions">
            <a href="/api/config/export" className="secondary-button"><Download size={16} />下载题库参数表</a>
            <Link to="/basket" className="ghost-button"><ShoppingBasket size={16} />打开试题篮</Link>
          </div>
        </div>
      </section>

      <section className="panel database-switch-panel" data-testid="database-switch-panel">
        <header className="panel-header">
          <div>
            <span className="eyebrow">DATABASES</span>
            <h2><Database size={19} />切换题库</h2>
          </div>
          <button type="button" className="ghost-button" onClick={load} disabled={busy}>
            <RefreshCw size={15} className={busy ? 'spin' : ''} />
            刷新列表
          </button>
        </header>

        {!data ? (
          <p className="database-hint">正在读取可用题库…</p>
        ) : data.items.length === 0 ? (
          <p className="database-hint">尚未发现可切换的题库文件。</p>
        ) : (
          <div className="database-list">
            {data.items.map((item) => {
              const current = item.path === data.current
              return (
                <label
                  key={item.path}
                  className={`database-option ${selected === item.path ? 'selected' : ''} ${item.valid ? '' : 'invalid'}`}
                  data-testid={`database-option-${item.file}`}
                >
                  <input
                    type="radio"
                    name="database"
                    checked={selected === item.path}
                    onChange={() => setSelected(item.path)}
                    disabled={!item.valid}
                  />
                  <span className="database-option-icon"><Database size={18} /></span>
                  <span className="database-option-copy">
                    <strong>{item.name}</strong>
                    <small>
                      {item.valid
                        ? `${item.question_count.toLocaleString()} 道题 · ${formatSize(item.size)} · ${new Date(item.updated_at).toLocaleDateString('zh-CN')}`
                        : item.error}
                    </small>
                  </span>
                  {current && <span className="database-current"><Check size={13} />当前使用</span>}
                </label>
              )
            })}
          </div>
        )}

        <div className="database-actions">
          <button
            type="button"
            className="primary-button"
            onClick={switchDatabase}
            disabled={busy || !selected || selected === data?.current}
          >
            使用所选题库
          </button>
          <span>将新的题库文件放入数据目录后，点击“刷新列表”即可看到。</span>
        </div>
      </section>

      <div className="help-grid">
        <section className="panel help-main">
          <span className="eyebrow">WORKFLOW</span>
          <h2><BookOpenText size={20} />四步完成一份试卷</h2>
          <ol className="workflow-steps">
            <li>
              <span>01</span>
              <div><h3>筛选试题</h3><p>进入“题库检索”，通过关键词、题型、难度和左侧知识点树筛选。题目卡片可直接查看解析、编辑或加入试题篮。</p></div>
            </li>
            <li>
              <span>02</span>
              <div><h3>补充候选题目</h3><p>在“智能组卷”中设置数量、题型和难度，随机生成候选试题；也可以在“试卷浏览”中打开一套原卷，整卷加入试题篮。</p></div>
            </li>
            <li>
              <span>03</span>
              <div><h3>调整试题篮</h3><p>试题篮保存在浏览器中，无需登录。可在试题篮中拖拽题目、使用移动按钮或右侧题序目录调整顺序，导出时系统会自动按题型分组编号，导出完成后试题篮会自动清空。</p></div>
            </li>
            <li>
              <span>04</span>
              <div><h3>导出 Word 文档</h3><p>选择“仅试题”“题目后跟解析”或“答案放在卷末”，确认标题后即可下载 Word 文档。</p></div>
            </li>
          </ol>
        </section>

        <aside className="panel help-side">
          <span className="eyebrow">EXPORT TIPS</span>
          <h2><FileText size={20} />导出小贴士</h2>
          <ul className="help-tips">
            <li>导出前可在试题篮中调整顺序，系统会按题型分组并连续编号。</li>
            <li>需要随堂练习时选择“仅试题”，讲评课时可选择“题目后跟解析”。</li>
            <li>正式考试卷建议选择“答案放在卷末”，方便统一保管答案。</li>
            <li>下载后的 Word 文档可继续按学校模板调整页眉、页脚和字体。</li>
          </ul>
        </aside>
      </div>

      <section className="panel help-image-panel">
        <div>
          <span className="eyebrow">PARAMETERS</span>
          <h2><FileText size={20} />题库参数与知识点结构</h2>
          <p>题库参数表用于维护难度、题型与知识点分类，最多支持三级。下载后可查看分类和对应编号；调整名称时请保留编号不变。</p>
        </div>
        <img src="/static/help.png" alt="题库参数表示例" />
      </section>

      <section className="panel faq-panel">
        <span className="eyebrow">FAQ</span>
        <h2>常见问题</h2>
        <details>
          <summary>导出失败怎么办？</summary>
          <p>请先确认试题篮中已有题目，然后稍后重新导出；如果仍然失败，可刷新页面后重试。</p>
        </details>
        <details>
          <summary>编辑题目后会立即生效吗？</summary>
          <p>保存后，下一次筛选、查看或导出时都会使用新内容。</p>
        </details>
        <details>
          <summary>试题篮会跨浏览器同步吗？</summary>
          <p>不会。试题篮保存在当前浏览器中，同一浏览器刷新或重新打开后会保留。</p>
        </details>
        <details>
          <summary>切换题库后试题篮会变化吗？</summary>
          <p>试题篮中的题号会保留，但不同题库的题号含义可能不同。建议切换前先导出或清空当前试题篮。</p>
        </details>
      </section>
    </div>
  )
}
