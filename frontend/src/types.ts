export interface Reference {
  id: number | null
  name: string
}

export interface Question {
  id: number
  content: string
  analysis: string
  difficulty: Reference
  knowledge: Reference
  qtype: Reference
  paper: Reference
}

export interface CountOption {
  id: number
  name: string
  count: number
}

export interface KnowledgeNode {
  key: string
  name: string
  level: number
  count: number
  knowledge_id: number | null
  knowledge_ids: number[]
  children: KnowledgeNode[]
}

export interface PaperSummary {
  id: number
  name: string
  question_count: number
}

export interface PaperDetail extends PaperSummary {
  questions: Question[]
}

export interface Meta {
  database: {
    file_name: string
    question_count: number
    max_id: number
    paper_count: number
    knowledge_count: number
    size: number
    size_label: string
    updated_at: string | null
  }
  qtypes: CountOption[]
  difficulties: CountOption[]
  knowledge_tree: KnowledgeNode[]
  recent_papers: PaperSummary[]
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface QuestionFilters {
  keyword?: string
  qtype_id?: number
  difficulty_id?: number
  knowledge_id?: number
  knowledge_ids?: number[]
  page?: number
  page_size?: number
  sort?: 'newest' | 'oldest'
}

export interface RandomPayload {
  count: number
  qtype_ids: number[]
  difficulty_ids: number[]
  knowledge_ids: number[]
  keyword: string
  exclude_ids: number[]
}

export type ExportMode = 'none' | 'inline' | 'end'

export interface ExportPayload {
  title: string
  question_ids: number[]
  mode: ExportMode
  subtitle?: string
}


export interface QuestionUpdatePayload {
  content: string
  analysis: string
  qtype_id: number
  difficulty_id: number
  knowledge_id: number
}

export interface DatabaseInfo {
  path: string
  file: string
  name: string
  question_count: number
  size: number
  updated_at: string
  valid: boolean
  error: string | null
}

export interface DatabaseList {
  current: string
  items: DatabaseInfo[]
}

export interface DatabaseSwitchResult {
  message: string
  current: string
  name: string
  question_count: number
}
