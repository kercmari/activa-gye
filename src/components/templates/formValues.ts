import type { Goal, PlanTemplate, PlanTemplateInput, TemplateSex, TemplateStatus } from '../../data';

export interface TemplateFormValues {
  name: string;
  description: string;
  sex: TemplateSex;
  age_min: string;
  age_max: string;
  bmi_min: string;
  bmi_max: string;
  goal: string; // '' = cualquiera
  kcal_base: string;
  author_name: string;
  status: TemplateStatus;
  is_fallback: boolean;
}

export function valuesFrom(t?: PlanTemplate | null): TemplateFormValues {
  return {
    name: t?.name ?? '',
    description: t?.description ?? '',
    sex: t?.sex ?? 'cualquiera',
    age_min: String(t?.age_min ?? 18),
    age_max: String(t?.age_max ?? 65),
    bmi_min: String(t?.bmi_min ?? 18.5),
    bmi_max: String(t?.bmi_max ?? 25),
    goal: t?.goal ?? '',
    kcal_base: String(t?.kcal_base ?? 1800),
    author_name: t?.author_name ?? '',
    status: t?.status ?? 'borrador',
    is_fallback: t?.is_fallback ?? false,
  };
}

/** Valida y convierte el formulario en la entrada de `adminSaveTemplate`. Devuelve errores por campo. */
export function toInput(v: TemplateFormValues, id?: string):
  | { ok: true; input: PlanTemplateInput }
  | { ok: false; errors: Partial<Record<keyof TemplateFormValues, string>> } {
  const errors: Partial<Record<keyof TemplateFormValues, string>> = {};
  const num = (s: string) => (s.trim() === '' ? NaN : Number(s));
  const ageMin = num(v.age_min);
  const ageMax = num(v.age_max);
  const bmiMin = num(v.bmi_min);
  const bmiMax = num(v.bmi_max);
  const kcal = num(v.kcal_base);

  if (!v.name.trim()) errors.name = 'Escribe un nombre para la plantilla.';
  if (!v.author_name.trim()) errors.author_name = 'Escribe quién firma el plan (autora o autor).';
  if (!Number.isInteger(ageMin) || !Number.isInteger(ageMax) || ageMin < 0 || ageMax < ageMin) {
    errors.age_min = 'La edad mínima y máxima deben ser números enteros, con mínima ≤ máxima.';
  }
  if (!(bmiMin > 0) || !(bmiMax > bmiMin)) {
    errors.bmi_min = 'El IMC mínimo debe ser mayor que 0 y menor que el máximo.';
  }
  if (!Number.isInteger(kcal) || kcal < 800 || kcal > 5000) {
    errors.kcal_base = 'Las kcal base deben estar entre 800 y 5000.';
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    input: {
      id,
      name: v.name.trim(),
      description: v.description.trim() || null,
      sex: v.sex,
      age_min: ageMin,
      age_max: ageMax,
      bmi_min: bmiMin,
      bmi_max: bmiMax,
      goal: (v.goal || null) as Goal | null,
      kcal_base: kcal,
      author_name: v.author_name.trim(),
      status: v.status,
      is_fallback: v.is_fallback,
    },
  };
}
