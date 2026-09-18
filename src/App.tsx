import { BrowserRouter, Route, Routes } from 'react-router'
import {
  RedirectIfAuthed,
  RequireAuth,
} from '@/features/auth/components/require-auth'
import { ForgotPasswordPage } from '@/routes/forgot-password'
import { HomePage } from '@/routes/home'
import { LoginPage } from '@/routes/login'
import { ResetPasswordPage } from '@/routes/reset-password'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RedirectIfAuthed />}>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/olvide-mi-contrasena"
            element={<ForgotPasswordPage />}
          />
        </Route>

        <Route path="/restablecer-contrasena" element={<ResetPasswordPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/" element={<HomePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
