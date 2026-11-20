import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  pages: number
  onChange: (page: number) => void
  compact?: boolean
}

function pageNumbers(page: number, pages: number): (number | 'ellipsis')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1)
  const values: (number | 'ellipsis')[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(pages - 1, page + 1)
  if (start > 2) values.push('ellipsis')
  for (let value = start; value <= end; value += 1) values.push(value)
  if (end < pages - 1) values.push('ellipsis')
  values.push(pages)
  return values
}

export function Pagination({ page, pages, onChange, compact = false }: PaginationProps) {
  if (pages <= 1) return null
  return (
    <nav className={`pagination ${compact ? 'pagination-compact' : ''}`} aria-label="分页">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="上一页">
        <ChevronLeft size={16} />
        上一页
      </button>
      {!compact &&
        pageNumbers(page, pages).map((value, index) =>
          value === 'ellipsis' ? (
            <span className="pagination-ellipsis" key={`e-${index}`}>
              …
            </span>
          ) : (
            <button
              type="button"
              className={value === page ? 'active' : ''}
              onClick={() => onChange(value)}
              key={value}
            >
              {value}
            </button>
          ),
        )}
      <span className="pagination-current">
        {page} / {pages}
      </span>
      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="下一页">
        下一页
        <ChevronRight size={16} />
      </button>
    </nav>
  )
}
