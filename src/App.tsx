/**
 * MAPA DE RUTAS (dueño: orquestador). Las tareas NO editan este archivo: solo reemplazan sus páginas.
 * Coincide con la tabla §7 del diseño (docs/superpowers/specs/2026-11-21-activa-gye-design.md).
 */
import { BrowserRouter, Route, Routes } from 'react-router';
import { AuthProvider } from './auth/AuthContext';
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
import NutricionPage from './pages/NutricionPage';
import NutricionNuevaPage from './pages/NutricionNuevaPage';
import NutricionDetallePage from './pages/NutricionDetallePage';
import AdminHomePage from './pages/admin/AdminHomePage';
import AdminLugaresPage from './pages/admin/AdminLugaresPage';
import AdminLugarPage from './pages/admin/AdminLugarPage';
import AdminNutricionPage from './pages/admin/AdminNutricionPage';
import AdminNutricionDetallePage from './pages/admin/AdminNutricionDetallePage';
import AdminMensajesPage from './pages/admin/AdminMensajesPage';
import AdminUsuariosPage from './pages/admin/AdminUsuariosPage';

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
        <Route path="nutricion" element={<NutricionPage />} />

        <Route element={<RequireGuest />}>
          <Route path="ingresar" element={<IngresarPage />} />
          <Route path="registro" element={<RegistroPage />} />
          <Route path="recuperar" element={<RecuperarPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="perfil" element={<PerfilPage />} />
          <Route path="perfil/editar" element={<PerfilEditarPage />} />
          <Route path="nutricion/nueva" element={<NutricionNuevaPage />} />
          <Route path="nutricion/:id" element={<NutricionDetallePage />} />
        </Route>

        <Route element={<RequireRole roles={['nutricionista', 'admin']} />}>
          <Route path="admin" element={<AdminHomePage />} />
          <Route path="admin/nutricion" element={<AdminNutricionPage />} />
          <Route path="admin/nutricion/:id" element={<AdminNutricionDetallePage />} />
        </Route>
        <Route element={<RequireRole roles={['admin']} />}>
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
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
