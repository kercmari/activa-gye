import { Outlet } from 'react-router';
import Header from './Header';
import Footer from './Footer';

/** Marco de todas las páginas: encabezado, contenido y pie. */
export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:font-bold focus:text-navy-900 focus:shadow-lg"
      >
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
