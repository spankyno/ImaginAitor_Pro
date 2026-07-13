import { BrowserRouter, Routes, Route } from 'react-router-dom'
import EditorPage from './pages/EditorPage'
import AboutPage from './pages/AboutPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EditorPage />} />
        <Route path="/acerca-de" element={<AboutPage />} />
      </Routes>
    </BrowserRouter>
  )
}
