import { useEffect, useState } from 'react'
import { FileText, LoaderCircle } from 'lucide-react'
import type { ExportMode } from '../types'
import { Modal } from './Modal'

interface ExportDialogProps {
  open: boolean
  title: string
  defaultTitle: string
  questionCount: number
  onClose: () => void
  onExport: (title: string, mode: ExportMode) => Promise<void>
}

const options: { value: ExportMode; title: string; description: string }[] = [
  { value: 'none', title: '仅试题', description: '试卷中不出现答案与解析' },
  { value: 'inline', title: '题目后跟解析', description: '每道题后立即附上解析' },
  { value: 'end', title: '答案放在卷末', description: '题目结束后统一附参考答案' },
]

export function ExportDialog({
  open,
  title,
  defaultTitle,
  questionCount,
  onClose,
  onExport,
}: ExportDialogProps) {
  const [mode, setMode] = useState<ExportMode>('none')
  const [documentTitle, setDocumentTitle] = useState(defaultTitle)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setMode('none')
      setDocumentTitle(defaultTitle)
      setBusy(false)
    }
  }, [open, defaultTitle])

  const submit = async () => {
    setBusy(true)
    try {
      await onExport(documentTitle.trim() || defaultTitle, mode)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title={title}
      eyebrow="DOCX 导出"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ghost-button" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button type="button" className="primary-button" onClick={submit} disabled={busy}>
            {busy ? <LoaderCircle size={17} className="spin" /> : <FileText size={17} />}
            {busy ? '正在转换…' : `导出 ${questionCount} 道题`}
          </button>
        </>
      }
    >
      <label className="field">
        <span>文档标题</span>
        <input value={documentTitle} onChange={(event) => setDocumentTitle(event.target.value)} />
      </label>
      <fieldset className="export-mode-fieldset">
        <legend>答案形式</legend>
        {options.map((option) => (
          <label className={`export-option ${mode === option.value ? 'selected' : ''}`} key={option.value}>
            <input
              type="radio"
              name="export-mode"
              value={option.value}
              checked={mode === option.value}
              onChange={() => setMode(option.value)}
            />
            <span>
              <strong>{option.title}</strong>
              <small>{option.description}</small>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="info-note">
        导出完成后会自动下载 Word 文件，可在浏览器下载记录中找到。
      </div>
    </Modal>
  )
}
