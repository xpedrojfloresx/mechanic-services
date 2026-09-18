import { BrowserRouter, Route, Routes } from 'react-router'
import { AppLayout } from '@/components/app-layout'
import {
  RedirectIfAuthed,
  RequireAuth,
} from '@/features/auth/components/require-auth'
import { ClienteDetallePage } from '@/routes/cliente-detalle'
import { ClienteFormPage } from '@/routes/cliente-form-page'
import { ClientesPage } from '@/routes/clientes'
import { ForgotPasswordPage } from '@/routes/forgot-password'
import { HomePage } from '@/routes/home'
import { IngresoPage } from '@/routes/ingreso-page'
import { LoginPage } from '@/routes/login'
import { NotFoundPage } from '@/routes/not-found'
import { RecibirPage } from '@/routes/recibir'
import { RecordatorioNuevoPage } from '@/routes/recordatorio-nuevo'
import { RecordatoriosPage } from '@/routes/recordatorios'
import { ResetPasswordPage } from '@/routes/reset-password'
import { ServicioDetallePage } from '@/routes/servicio-detalle'
import { ServicioEditarPage } from '@/routes/servicio-editar-page'
import { ServicioNuevoPage } from '@/routes/servicio-nuevo'
import { ServiciosPage } from '@/routes/servicios'
import { VehiculoCambiarClientePage } from '@/routes/vehiculo-cambiar-cliente'
import { VehiculoDetallePage } from '@/routes/vehiculo-detalle'
import { VehiculoFormPage } from '@/routes/vehiculo-form-page'

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
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/recibir" element={<RecibirPage />} />
            <Route path="/recordatorios" element={<RecordatoriosPage />} />
            <Route
              path="/recordatorios/nuevo"
              element={<RecordatorioNuevoPage />}
            />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/servicios" element={<ServiciosPage />} />
            <Route path="/servicios/nuevo" element={<ServicioNuevoPage />} />
            <Route path="/servicios/:id" element={<ServicioDetallePage />} />
            <Route
              path="/servicios/:id/editar"
              element={<ServicioEditarPage />}
            />
            <Route path="/clientes/nuevo" element={<ClienteFormPage />} />
            <Route path="/clientes/:id" element={<ClienteDetallePage />} />
            <Route path="/clientes/:id/editar" element={<ClienteFormPage />} />
            <Route path="/vehiculos/nuevo" element={<VehiculoFormPage />} />
            <Route path="/vehiculos/:id" element={<VehiculoDetallePage />} />
            <Route path="/vehiculos/:id/ingreso" element={<IngresoPage />} />
            <Route
              path="/vehiculos/:id/cambiar-cliente"
              element={<VehiculoCambiarClientePage />}
            />
            <Route
              path="/vehiculos/:id/editar"
              element={<VehiculoFormPage />}
            />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
