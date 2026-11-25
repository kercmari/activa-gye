import ContactForm from '../components/ContactForm';
import PageHeader from '../components/ui/PageHeader';
import { useSettings } from '../auth/SettingsContext';
import { contactMailto } from '../lib/mailto';

export default function ContactoPage() {
  const { settings } = useSettings();
  return (
    <>
      <PageHeader eyebrow="Contacto" title="Escríbenos" subtitle="¿Tienes una consulta o sugerencia? Cuéntanos." />
      <ContactForm />
      <p className="mx-auto mt-8 max-w-6xl px-4 text-center">
        <a href={contactMailto(settings.admin_email)} className="font-bold text-brand-blue underline">
          Escribir a la administración
        </a>
      </p>
    </>
  );
}
