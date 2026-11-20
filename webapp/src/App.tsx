import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConnectionStatus } from '@/components'
import { ProtectedRoute } from '@/components/auth'
import { AppLayout } from '@/components/layout'
import Login from '@/pages/Login'
import POS from '@/pages/POS'
import Stock from '@/pages/Stock'
import Reports from '@/pages/Reports'
import Settings from '@/pages/Settings'

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
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Default route redirects to POS */}
          <Route index element={<Navigate to="/pos" replace />} />
          <Route path="pos" element={<POS />} />
          <Route path="stock" element={<Stock />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
