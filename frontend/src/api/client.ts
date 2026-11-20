import type {
  ExportPayload,
  Meta,
  Paginated,
  PaperDetail,
  PaperSummary,
  Question,
  QuestionFilters,
  QuestionUpdatePayload,
  DatabaseList,
  DatabaseSwitchResult,
  RandomPayload,
} from '../types'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function parseError(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data?.detail === 'string') return data.detail
    if (Array.isArray(data?.detail)) {
      return data.detail.map((item: { msg?: string }) => item.msg || '参数错误').join('；')
    }
  } catch {
    // ignore parse failure
  }
  return `请求失败（HTTP ${response.status}）`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init)
  if (!response.ok) throw new Error(await parseError(response))
  return response.json() as Promise<T>
}

function toQuery(params: object): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value)) {
      value.forEach((item) => search.append(key, String(item)))
    } else {
      search.set(key, String(value))
    }
  })
  return search.toString()
}

export const api = {
  meta: () => request<Meta>('/api/meta'),

  questions: (filters: QuestionFilters) =>
    request<Paginated<Question>>(`/api/questions?${toQuery(filters)}`),

  question: (id: number) => request<Question>(`/api/questions/${id}`),

  bulkQuestions: (ids: number[]) =>
    request<{ items: Question[] }>('/api/questions/bulk', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ ids }),
    }),

  randomQuestions: (payload: RandomPayload) =>
    request<{ items: Question[]; count: number }>('/api/questions/random', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    }),

  updateQuestion: (id: number, payload: QuestionUpdatePayload) =>
    request<{ message: string; question: Question }>(`/api/questions/${id}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    }),

  papers: (keyword: string, page: number, pageSize = 20) =>
    request<Paginated<PaperSummary>>(
      `/api/papers?${toQuery({ keyword, page, page_size: pageSize })}`,
    ),

  paper: (id: number) => request<PaperDetail>(`/api/papers/${id}`),

  databases: () => request<DatabaseList>('/api/databases'),

  switchDatabase: (path: string) =>
    request<DatabaseSwitchResult>('/api/databases/switch', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ path }),
    }),
}

function filenameFromDisposition(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback
  const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1])
    } catch {
      return utf8[1]
    }
  }
  const plain = disposition.match(/filename="?([^";]+)"?/i)
  return plain?.[1] || fallback
}

export async function downloadDocx(payload: ExportPayload): Promise<void> {
  const response = await fetch('/api/exports/docx', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(await parseError(response))
  const blob = await response.blob()
  const filename = filenameFromDisposition(
    response.headers.get('content-disposition'),
    `${payload.title || '试题'}.docx`,
  )
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
