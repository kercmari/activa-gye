import PageHeader from '../components/ui/PageHeader';
import { LinkButton } from '../components/ui/Button';

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'Qué datos guardamos',
    body: [
      'Los datos de tu cuenta (nombre, correo, fecha de nacimiento y, si los das, sexo, teléfono, sector, objetivo y nivel de actividad).',
      'Tus favoritos, tu progreso y las solicitudes de plan nutricional que envíes.',
    ],
  },
  {
    title: 'Para qué los usamos',
    body: [
      'Para mostrarte lugares y guías adaptadas a ti, guardar lo que marcas como favorito y acompañar tu progreso.',
      'No vendemos tus datos ni los usamos para publicidad.',
    ],
  },
  {
    title: 'Tu foto (opcional)',
    body: [
      'Puedes subir una foto para tu plan nutricional. Solo si tienes 18 años o más y das tu consentimiento.',
      'La foto se envía de forma privada a un servicio de IA (Groq) solo para generar tu guía, y la puede ver el nutricionista que revisa tu caso.',
    ],
  },
  {
    title: 'Quién ve tus datos',
    body: [
      'Tú siempre. El nutricionista y el administrador solo ven lo necesario para atender tu solicitud.',
      'Nadie más tiene acceso a tus datos personales.',
    ],
  },
  {
    title: 'Cómo borrar tu cuenta',
    body: [
      'Entra a Mi perfil, luego a Editar perfil y elige "Borrar mi cuenta". Se eliminan tus datos de la cuenta.',
    ],
  },
  {
    title: 'Aviso de salud',
    body: [
      'Orientación general. No reemplaza a un profesional de la salud. Antes de empezar una actividad o un cambio de alimentación, consulta a tu médico.',
    ],
  },
];

export default function PrivacidadPage() {
  return (
    <>
      <PageHeader eyebrow="Privacidad y términos" title="Cuidamos tus datos" subtitle="Esto es lo que guardamos, para qué y cómo puedes controlarlo." />

      <div className="mx-auto max-w-3xl space-y-10 px-4 py-16">
        <div role="note" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900">
          Versión de prueba: por ahora tus datos se guardan solo en este navegador.
        </div>

        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="display text-2xl text-navy-900">{section.title}</h2>
            <div className="mt-3 space-y-3 text-slate-600">
              {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </section>
        ))}

        <div>
          <LinkButton to="/contacto" variant="secondary">Tengo una pregunta</LinkButton>
        </div>
      </div>
    </>
  );
}
