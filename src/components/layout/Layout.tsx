// PENDIENTE (tarea F1): encabezado, pie y botón de cuenta. Este esqueleto solo pinta el contenido.
import { Outlet } from 'react-router';
export default function Layout() {
  return <div className="min-h-screen bg-surface"><main><Outlet /></main></div>;
}
