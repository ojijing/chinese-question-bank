import { type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  BookOpenText,
  FileStack,
  HelpCircle,
  LayoutDashboard,
  ShoppingBasket,
  Sparkles,
} from 'lucide-react'
import { useBasket } from '../context/BasketContext'

const navigation = [
  { to: '/', label: '数据总览', icon: LayoutDashboard, end: true },
  { to: '/questions', label: '题库检索', icon: BookOpenText },
  { to: '/compose', label: '智能组卷', icon: Sparkles },
  { to: '/papers', label: '试卷浏览', icon: FileStack },
  { to: '/help', label: '使用说明', icon: HelpCircle },
]

const routeCopy: Record<string, { title: string; subtitle: string }> = {
  '/': { title: '数据总览', subtitle: '掌握题库结构，快速开始组卷' },
  '/questions': { title: '题库检索', subtitle: '按题型、难度与知识点精准筛选' },
  '/compose': { title: '智能组卷', subtitle: '设定条件，从题库中随机抽题' },
  '/papers': { title: '试卷浏览', subtitle: '浏览原试卷结构，一键加入试题篮' },
  '/basket': { title: '试题篮', subtitle: '调整顺序、检查试卷并导出 Word' },
  '/help': { title: '使用说明', subtitle: '快速了解选题、组卷与导出操作' },
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const basket = useBasket()
  const isDashboard = location.pathname === '/'
  const isBasketPage = location.pathname === '/basket'

  const copy =
    Object.entries(routeCopy).find(([path]) =>
      path === '/' ? location.pathname === '/' : location.pathname.startsWith(path),
    )?.[1] || routeCopy['/']

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-title">
          <span className="eyebrow">语文题库 · 工作台</span>
          <h1>{copy.title}</h1>
        </div>

        <nav className="top-navigation" aria-label="主导航">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="topbar-meta">
          <span className="topbar-subtitle">{copy.subtitle}</span>
        </div>
      </header>

      <main className="page-content">{children}</main>

      {!isDashboard && !isBasketPage && (
        <NavLink to="/basket" className="floating-basket" aria-label={`试题篮，${basket.count} 道题`}>
          <ShoppingBasket size={20} />
          <span>试题篮</span>
          <b>{basket.count}</b>
        </NavLink>
      )}
    </div>
  )
}
