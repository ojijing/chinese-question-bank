import { useEffect, useRef } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  Underline,
  Undo2,
} from 'lucide-react'

interface RichTextEditorProps {
  label: string
  value: string
  onChange: (value: string) => void
  minHeight?: number
  hint?: string
}

type Command = 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList' | 'justifyLeft' | 'justifyCenter' | 'justifyRight' | 'undo' | 'redo'

export function RichTextEditor({ label, value, onChange, minHeight = 220, hint }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (editor.innerHTML !== value) editor.innerHTML = value
  }, [value, label])

  const run = (command: Command) => {
    editorRef.current?.focus()
    document.execCommand(command)
    if (editorRef.current) onChange(editorRef.current.innerHTML)
  }

  const addLink = () => {
    const url = window.prompt('请输入链接地址', 'https://')
    if (!url) return
    editorRef.current?.focus()
    document.execCommand('createLink', false, url)
    if (editorRef.current) onChange(editorRef.current.innerHTML)
  }

  return (
    <div className="rich-editor">
      <div className="field-label-row">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </div>
      <div className="editor-toolbar">
        <button type="button" onClick={() => run('bold')} title="加粗"><Bold size={16} /></button>
        <button type="button" onClick={() => run('italic')} title="斜体"><Italic size={16} /></button>
        <button type="button" onClick={() => run('underline')} title="下划线"><Underline size={16} /></button>
        <span className="toolbar-divider" />
        <button type="button" onClick={() => run('insertUnorderedList')} title="无序列表"><List size={16} /></button>
        <button type="button" onClick={() => run('insertOrderedList')} title="有序列表"><ListOrdered size={16} /></button>
        <span className="toolbar-divider" />
        <button type="button" onClick={() => run('justifyLeft')} title="左对齐"><AlignLeft size={16} /></button>
        <button type="button" onClick={() => run('justifyCenter')} title="居中"><AlignCenter size={16} /></button>
        <button type="button" onClick={() => run('justifyRight')} title="右对齐"><AlignRight size={16} /></button>
        <span className="toolbar-divider" />
        <button type="button" onClick={addLink} title="插入链接"><Link2 size={16} /></button>
        <button type="button" onClick={() => run('undo')} title="撤销"><Undo2 size={16} /></button>
        <button type="button" onClick={() => run('redo')} title="重做"><Redo2 size={16} /></button>
      </div>
      <div
        ref={editorRef}
        className="editor-surface rich-content"
        contentEditable
        suppressContentEditableWarning
        style={{ minHeight }}
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        data-placeholder="请输入内容…"
      />
    </div>
  )
}
