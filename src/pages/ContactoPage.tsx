import ContactForm from '../components/ContactForm';
import PageHeader from '../components/ui/PageHeader';

export default function ContactoPage() {
  return (
    <>
      <PageHeader eyebrow="Contacto" title="Escríbenos" subtitle="¿Tienes una consulta o sugerencia? Cuéntanos." />
      <ContactForm />
    </>
  );
}
