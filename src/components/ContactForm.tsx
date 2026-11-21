import { Mail, MapPin, MessageCircle } from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { repo } from '../data';
import { Button } from './ui/Button';
import { TextArea, TextField } from './ui/Field';
import { errorMessage } from './ui/States';

interface Values { name: string; email: string; subject: string; message: string }
type Errors = Partial<Record<keyof Values, string>>;

const EMPTY: Values = { name: '', email: '', subject: '', message: '' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validate(v: Values): Errors {
  const errors: Errors = {};
  if (v.name.trim().length < 2) errors.name = 'Escribe tu nombre (mínimo 2 letras).';
  if (!EMAIL_RE.test(v.email.trim())) errors.email = 'Escribe un correo válido, por ejemplo nombre@correo.com.';
  if (v.subject.trim().length < 2) errors.subject = 'Escribe un asunto (mínimo 2 letras).';
  if (v.message.trim().length < 5) errors.message = 'Escribe tu mensaje (mínimo 5 letras).';
  return errors;
}

const ITEMS = [
  { icon: Mail, text: 'Escríbenos con este formulario' },
  { icon: MapPin, text: 'Guayaquil, Ecuador' },
  { icon: MessageCircle, text: 'Respuesta en 1–2 días hábiles' },
];

/** Formulario de contacto con validación en el cliente y envío al repositorio. */
export function ContactForm({ id }: { id?: string }) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const set = (key: keyof Values) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length > 0) return;
    setSending(true);
    try {
      await repo.sendContact({
        name: values.name.trim(),
        email: values.email.trim(),
        subject: values.subject.trim(),
        message: values.message.trim(),
      });
      setSent(true);
      setValues(EMPTY);
    } catch (error) {
      setServerError(errorMessage(error));
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setSent(false);
    setErrors({});
    setServerError(null);
  };

  return (
    <section id={id} className="mx-auto max-w-6xl px-4 py-16">
      <div className="grid overflow-hidden rounded-[1.75rem] bg-white shadow-2xl shadow-navy-900/10 md:grid-cols-[1fr_1.2fr]">
        <div className="bg-brand-blue p-8 text-white md:p-10">
          <p className="eyebrow !text-white/80">Hablemos</p>
          <h2 className="display mt-3 text-3xl text-white md:text-4xl">¿Tienes una consulta o sugerencia?</h2>
          <p className="mt-4 text-white/85">
            Cuéntanos qué necesitas. Leemos cada mensaje y te respondemos por correo.
          </p>
          <ul className="mt-8 flex flex-col gap-4">
            {ITEMS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 font-semibold">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-8 md:p-10">
          {sent ? (
            <div role="status" className="flex h-full flex-col justify-center">
              <h3 className="display text-2xl text-navy-900">¡Gracias! Te responderemos en 1–2 días hábiles.</h3>
              <div className="mt-6">
                <Button variant="secondary" onClick={reset}>Enviar otro mensaje</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="flex flex-col gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField label="Nombre" autoComplete="name" value={values.name} onChange={set('name')} error={errors.name} />
                <TextField label="Correo electrónico" type="email" autoComplete="email" value={values.email} onChange={set('email')} error={errors.email} />
              </div>
              <TextField label="Asunto" value={values.subject} onChange={set('subject')} error={errors.subject} />
              <TextArea label="Mensaje" rows={5} value={values.message} onChange={set('message')} error={errors.message} />
              {serverError ? (
                <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{serverError}</p>
              ) : null}
              <div>
                <Button type="submit" variant="primary" disabled={sending}>
                  {sending ? 'Enviando…' : 'Enviar mensaje'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export default ContactForm;
