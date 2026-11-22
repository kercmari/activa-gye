import { useState, type FormEvent } from 'react';
import { repo } from '../../data';
import { Button } from '../ui/Button';
import { TextField } from '../ui/Field';
import { errorMessage } from '../ui/States';

interface Props {
  patientId: string;
  /** Se llama tras crear la factura, para que la lista de cobros se recargue. */
  onCreated: () => void;
}

/** Formulario «Nueva factura» para cobrar una consulta al paciente. */
export default function InvoiceForm({ patientId, onCreated }: Props) {
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState<{ concept?: string; amount?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setSent(false);

    const next: { concept?: string; amount?: string } = {};
    const text = concept.trim();
    if (text.length < 2 || text.length > 200) next.concept = 'El concepto debe tener entre 2 y 200 caracteres.';
    const value = Number(amount.trim().replace(',', '.'));
    const monto = Math.round(value * 100) / 100;
    if (amount.trim() === '' || !Number.isFinite(value) || monto <= 0) next.amount = 'El monto debe ser mayor que 0.';
    setErrors(next);
    if (next.concept || next.amount) return;

    setSaving(true);
    try {
      await repo.createInvoice({ patient_id: patientId, concept: text, amount: monto });
      setConcept('');
      setAmount('');
      setSent(true);
      onCreated();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5" aria-label="Nueva factura">
      <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
        <TextField
          label="Concepto"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          maxLength={200}
          placeholder="Consulta de seguimiento"
          error={errors.concept}
        />
        <TextField
          label="Monto (USD)"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          error={errors.amount}
        />
      </div>
      {formError ? (
        <p role="alert" className="font-semibold text-red-600">{formError}</p>
      ) : null}
      {sent ? (
        <p role="status" className="font-semibold text-emerald-700">Factura enviada al paciente</p>
      ) : null}
      <Button type="submit" variant="primary" disabled={saving}>
        {saving ? 'Enviando…' : 'Enviar factura'}
      </Button>
    </form>
  );
}
