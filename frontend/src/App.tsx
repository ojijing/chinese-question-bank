import { useEffect } from 'react'
import { BrowserRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { BasketProvider } from './context/BasketContext'
import { ToastProvider } from './context/ToastContext'
import { BasketPage } from './pages/BasketPage'
import { ComposePage } from './pages/ComposePage'
import { DashboardPage } from './pages/DashboardPage'
import { HelpPage } from './pages/HelpPage'
import { PapersPage } from './pages/PapersPage'
import { QuestionEditPage } from './pages/QuestionEditPage'
import { QuestionsPage } from './pages/QuestionsPage'

function ScrollToTop() {
  const location = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])
  return null
}

function ShellLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

function NotFound() {
  return (
    <div className="error-panel">
      <strong>页面不存在</strong>
      <p>请从左侧导航重新进入题库功能。</p>
      <a href="/" className="primary-button">返回总览</a>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <BasketProvider>
          <ScrollToTop />
          <Routes>
            <Route element={<ShellLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="questions" element={<QuestionsPage />} />
              <Route path="questions/:id/edit" element={<QuestionEditPage />} />
              <Route path="compose" element={<ComposePage />} />
              <Route path="papers" element={<PapersPage />} />
              <Route path="basket" element={<BasketPage />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BasketProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
