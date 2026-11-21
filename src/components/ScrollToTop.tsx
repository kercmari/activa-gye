/** Al cambiar de página, sube al inicio (salvo que el enlace tenga #ancla). */
import { useEffect } from 'react';
import { useLocation } from 'react-router';
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}
