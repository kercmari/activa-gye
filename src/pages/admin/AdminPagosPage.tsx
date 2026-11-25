import { Navigate } from 'react-router';

/** Admin → Pagos fue reemplazado por Admin → Suscripciones. Esta ruta solo redirige. */
export default function AdminPagosPage() {
  return <Navigate to="/admin/suscripciones" replace />;
}
