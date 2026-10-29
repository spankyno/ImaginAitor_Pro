import { BrowserRouter, Routes, Route } from 'react-router-dom'
import EditorPage from './pages/EditorPage'
import AboutPage from './pages/AboutPage'
import { ErrorBoundary } from './components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<EditorPage />} />
          <Route path="/acerca-de" element={<AboutPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
