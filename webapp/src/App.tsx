import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ConnectionStatus } from '@/components'
import { ProtectedRoute } from '@/components/auth'
import Login from '@/pages/Login'

function App() {
  return (
    <BrowserRouter>
      <ConnectionStatus />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  )
}

function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Welcome to Papa Bolotas POS System</h2>
        <p className="mb-2">The application is being set up...</p>
        <p className="text-sm text-gray-600">
          PWA features enabled - App works offline
        </p>
      </div>
    </div>
  )
}

export default App
