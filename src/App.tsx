/**
 * MAPA DE RUTAS (dueño: orquestador). Las tareas NO editan este archivo: solo reemplazan sus páginas.
 * Coincide con §8 de docs/superpowers/specs/2026-11-21-activa-gye-fases-backend-design.md
 * y §4 de docs/superpowers/specs/2026-11-21-semana-gratis-design.md.
 */
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AuthProvider } from './auth/AuthContext';
import { SettingsProvider } from './auth/SettingsContext';
import { RequireAuth, RequireGuest, RequireRole } from './auth/guards';
import Layout from './components/layout/Layout';
import ScrollToTop from './components/ScrollToTop';
import HomePage from './pages/HomePage';
import ConocenosPage from './pages/ConocenosPage';
import ContactoPage from './pages/ContactoPage';
import PrivacidadPage from './pages/PrivacidadPage';
import NotFoundPage from './pages/NotFoundPage';
import SinAccesoPage from './pages/SinAccesoPage';
import DeportesPage from './pages/DeportesPage';
import DeportePage from './pages/DeportePage';
import LugaresPage from './pages/LugaresPage';
import LugarPage from './pages/LugarPage';
import CompararPage from './pages/CompararPage';
import IngresarPage from './pages/IngresarPage';
import RegistroPage from './pages/RegistroPage';
import RecuperarPage from './pages/RecuperarPage';
import PerfilPage from './pages/PerfilPage';
import PerfilEditarPage from './pages/PerfilEditarPage';
import MiPanelPage from './pages/panel/MiPanelPage';
import ReportePage from './pages/panel/ReportePage';
import NotificacionesPage from './pages/NotificacionesPage';
import TableroPage from './pages/nutri/TableroPage';
import SolicitudesPage from './pages/nutri/SolicitudesPage';
import PacientePage from './pages/nutri/PacientePage';
import SuscripcionPage from './pages/nutri/SuscripcionPage';
import AdminHomePage from './pages/admin/AdminHomePage';
import AdminLugaresPage from './pages/admin/AdminLugaresPage';
import AdminLugarPage from './pages/admin/AdminLugarPage';
import AdminFasesPage from './pages/admin/AdminFasesPage';
import AdminDatosLugaresPage from './pages/admin/AdminDatosLugaresPage';
import AdminPagosPage from './pages/admin/AdminPagosPage';
import AdminMensajesPage from './pages/admin/AdminMensajesPage';
import AdminUsuariosPage from './pages/admin/AdminUsuariosPage';
import AdminPlantillasPage from './pages/admin/AdminPlantillasPage';
import AdminPlantillaPage from './pages/admin/AdminPlantillaPage';
import AdminGuiaPage from './pages/admin/AdminGuiaPage';
import AdminSuscripcionesPage from './pages/admin/AdminSuscripcionesPage';
import AdminPlanesPage from './pages/admin/AdminPlanesPage';
import GuiaPage from './pages/GuiaPage';
import PlanShell from './components/plan/PlanShell';
import HoyPage from './pages/plan/HoyPage';
import AgendaPage from './pages/plan/AgendaPage';
import ProgresoPage from './pages/plan/ProgresoPage';
import SuscribirmePage from './pages/plan/SuscribirmePage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="conocenos" element={<ConocenosPage />} />
        <Route path="contacto" element={<ContactoPage />} />
        <Route path="privacidad" element={<PrivacidadPage />} />
        <Route path="sin-acceso" element={<SinAccesoPage />} />
        <Route path="deportes" element={<DeportesPage />} />
        <Route path="deportes/:slug" element={<DeportePage />} />
        <Route path="lugares" element={<LugaresPage />} />
        <Route path="lugares/:id" element={<LugarPage />} />
        <Route path="comparar" element={<CompararPage />} />
        <Route path="nutricion" element={<Navigate to="/" replace />} />
        <Route path="guia" element={<GuiaPage />} />

        <Route element={<RequireGuest />}>
          <Route path="ingresar" element={<IngresarPage />} />
          <Route path="registro" element={<RegistroPage />} />
          <Route path="recuperar" element={<RecuperarPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="perfil" element={<PerfilPage />} />
          <Route path="perfil/editar" element={<PerfilEditarPage />} />
          <Route path="mi-panel" element={<MiPanelPage />} />
          <Route path="mi-panel/reporte" element={<ReportePage />} />
          <Route path="notificaciones" element={<NotificacionesPage />} />
          <Route path="mi-plan" element={<PlanShell />}>
            <Route index element={<Navigate to="hoy" replace />} />
            <Route path="hoy" element={<HoyPage />} />
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="progreso" element={<ProgresoPage />} />
            <Route path="suscripcion" element={<SuscribirmePage />} />
          </Route>
        </Route>

        <Route element={<RequireRole roles={['nutricionista', 'admin']} />}>
          <Route path="nutri" element={<TableroPage />} />
          <Route path="nutri/solicitudes" element={<SolicitudesPage />} />
          <Route path="nutri/pacientes/:id" element={<PacientePage />} />
          <Route path="nutri/suscripcion" element={<SuscripcionPage />} />
          <Route path="admin/plantillas" element={<AdminPlantillasPage />} />
          <Route path="admin/plantillas/:id" element={<AdminPlantillaPage />} />
          <Route path="admin/guia" element={<AdminGuiaPage />} />
        </Route>
        <Route element={<RequireRole roles={['admin']} />}>
          <Route path="admin" element={<AdminHomePage />} />
          <Route path="admin/fases" element={<AdminFasesPage />} />
          <Route path="admin/datos-lugares" element={<AdminDatosLugaresPage />} />
          <Route path="admin/pagos" element={<AdminPagosPage />} />
          <Route path="admin/suscripciones" element={<AdminSuscripcionesPage />} />
          <Route path="admin/planes" element={<AdminPlanesPage />} />
          <Route path="admin/lugares" element={<AdminLugaresPage />} />
          <Route path="admin/lugares/nuevo" element={<AdminLugarPage />} />
          <Route path="admin/lugares/:id" element={<AdminLugarPage />} />
          <Route path="admin/mensajes" element={<AdminMensajesPage />} />
          <Route path="admin/usuarios" element={<AdminUsuariosPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </SettingsProvider>
  );
}
