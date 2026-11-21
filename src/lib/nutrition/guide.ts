/**
 * Guía nutricional básica (sin IA): IMC, necesidades aproximadas (Mifflin-St Jeor) y recomendaciones fijas.
 * Se usa cuando no hay IA disponible. Las reglas son fijas: no cambiar sin actualizar el plan.
 */
import type { ActivityLevel, Goal, NutritionGuide, Sex } from '../../data/types';

export interface BasicGuideInput {
  age: number;
  sex: Sex;
  height_cm: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  goal: Goal;
  restrictions: string | null;
  health_conditions: string | null;
}

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  intenso: 1.725,
};

const GOAL_KCAL_MULT: Record<Goal, number> = {
  bajar_peso: 0.85,
  ganar_musculo: 1.1,
  mantener: 1,
  resistencia: 1,
  bienestar: 1,
};

const PROTEIN_PER_KG: Record<Goal, number> = {
  ganar_musculo: 1.8,
  bajar_peso: 1.6,
  resistencia: 1.4,
  mantener: 1.2,
  bienestar: 1.2,
};

const GOAL_LABEL: Record<Goal, string> = {
  bajar_peso: 'bajar de peso',
  ganar_musculo: 'ganar músculo',
  mantener: 'mantener tu peso',
  resistencia: 'mejorar tu resistencia',
  bienestar: 'tu bienestar',
};

const RECOMMENDATIONS: Record<Goal, string[]> = {
  bajar_peso: [
    'Llena la mitad de tu plato con verduras o ensalada, como en una buena menestra con mucho vegetal.',
    'Prefiere frutas de temporada como papaya, guineo o maracuyá en lugar de jugos con azúcar.',
    'Elige pescado, pollo o huevo a la plancha o al horno, y cocina con poco aceite.',
    'No necesitas prohibir alimentos: busca un déficit constante y disfruta tus comidas con medida.',
  ],
  ganar_musculo: [
    'Reparte tu proteína en las cinco comidas: huevo, pescado, pollo o menestra con arroz.',
    'No te saltes el desayuno; un bolón de verde con huevo es una buena base.',
    'Añade carbohidratos complejos como arroz integral, avena o papa antes de entrenar.',
    'Descansa bien: el músculo se construye durante el sueño, no solo en el gimnasio.',
  ],
  mantener: [
    'Mantén una dieta variada: verduras, frutas, granos y proteínas en cada comida.',
    'Come con horario y evita pasar muchas horas sin comer.',
    'Limita frituras, embutidos y bebidas azucaradas a ocasiones especiales.',
    'Disfruta tus comidas típicas de Guayaquil con porciones moderadas.',
  ],
  resistencia: [
    'Asegura carbohidratos de calidad antes de entrenar: avena, guineo o camote.',
    'Repón líquidos y electrolitos en los entrenamientos largos.',
    'Incluye proteína magra como pescado o pollo para recuperarte mejor.',
    'Sube la intensidad poco a poco y escucha a tu cuerpo.',
  ],
  bienestar: [
    'Come con calma y sin pantallas para notar cuándo ya estás satisfecho.',
    'Incluye menestra, pescado y verduras de colores en tus comidas.',
    'Los dulces y las frituras caben con moderación y sin culpa.',
    'Combina la actividad física con descanso y buena hidratación.',
  ],
};

const ACTIVITY_BY_GOAL: Record<Goal, NutritionGuide['activity']> = {
  bajar_peso: [
    { sport_id: 'funcional', per_week: '3 veces por semana', reason: 'Quema calorías y mejora la fuerza sin un impacto excesivo.' },
    { sport_id: 'natacion', per_week: '2 veces por semana', reason: 'Trabaja todo el cuerpo con bajo impacto en las articulaciones.' },
    { sport_id: 'baile', per_week: '1–2 veces por semana', reason: 'Es divertido y ayuda a mantener la constancia.' },
  ],
  ganar_musculo: [
    { sport_id: 'gimnasios', per_week: '3–4 veces por semana', reason: 'Entrenar fuerza con pesas es la base para ganar músculo.' },
    { sport_id: 'funcional', per_week: '1–2 veces por semana', reason: 'Complementa la fuerza con movilidad y trabajo corporal.' },
  ],
  mantener: [
    { sport_id: 'colectivos', per_week: '2 veces por semana', reason: 'Mantener la actividad es más fácil si la compartes con otras personas.' },
    { sport_id: 'yoga', per_week: '1–2 veces por semana', reason: 'Ayuda a mantener la flexibilidad y el equilibrio.' },
  ],
  resistencia: [
    { sport_id: 'natacion', per_week: '2–3 veces por semana', reason: 'Mejora la capacidad cardiovascular sin castigar las rodillas.' },
    { sport_id: 'funcional', per_week: '2 veces por semana', reason: 'Fortalece los músculos que sostienen tu resistencia.' },
    { sport_id: 'otras', per_week: '1 vez por semana (ciclismo o trote)', reason: 'Un entrenamiento cardiovascular largo a ritmo cómodo.' },
  ],
  bienestar: [
    { sport_id: 'yoga', per_week: '2–3 veces por semana', reason: 'Reduce el estrés y mejora la respiración.' },
    { sport_id: 'baile', per_week: '1–2 veces por semana', reason: 'Te ayuda a moverte con alegría y a socializar.' },
  ],
};

/** Número con coma decimal (formato de Ecuador), 1 decimal. */
function decimal(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
}

function bmiLabel(bmi: number): string {
  if (bmi < 18.5) return 'Bajo peso';
  if (bmi < 25) return 'Peso saludable';
  if (bmi < 30) return 'Sobrepeso';
  return 'Obesidad';
}

function basalMetabolism(i: BasicGuideInput): number {
  const base = 10 * i.weight_kg + 6.25 * i.height_cm - 5 * i.age;
  if (i.sex === 'masculino') return base + 5;
  if (i.sex === 'femenino') return base - 161;
  return base - 78;
}

export function buildBasicGuide(i: BasicGuideInput): NutritionGuide {
  const heightM = i.height_cm / 100;
  const bmi = Math.round((i.weight_kg / (heightM * heightM)) * 10) / 10;
  const label = bmiLabel(bmi);

  // R1: con IMC bajo no se aplica el déficit de bajar de peso.
  const goalMult = bmi < 18.5 && i.goal === 'bajar_peso' ? 1 : GOAL_KCAL_MULT[i.goal];
  const kcal = basalMetabolism(i) * ACTIVITY_FACTOR[i.activity_level] * goalMult;
  const floor = i.sex === 'femenino' ? 1200 : 1500;
  const dailyKcal = Math.round(Math.max(floor, kcal) / 50) * 50;

  const proteinG = Math.round(i.weight_kg * PROTEIN_PER_KG[i.goal]);
  const fatG = Math.round((dailyKcal * 0.28) / 9);
  const carbsG = Math.max(0, Math.round((dailyKcal - proteinG * 4 - fatG * 9) / 4));

  // R1: tope de 1,5–3,5 L; sin tope, 400 kg daba 14 L (riesgo de hiponatremia).
  const litros = Math.min(3.5, Math.max(1.5, i.weight_kg * 0.035));
  const hydration = `Bebe alrededor de ${decimal(litros)} litros de agua al día (más si entrenas o hace calor).`;

  const warnings: string[] = [];
  if (i.health_conditions && i.health_conditions.trim() !== '') {
    warnings.push('Por tus condiciones de salud, consulta a un profesional antes de cambiar tu alimentación.');
  }
  if (bmi < 18.5 || bmi >= 35) {
    warnings.push('Te recomendamos una valoración presencial con un nutricionista.');
  }
  if (i.restrictions && i.restrictions.trim() !== '') {
    warnings.push('Adapta el menú a tus restricciones: ' + i.restrictions.trim());
  }
  if (i.age < 18) {
    warnings.push('Por tu edad, sigue esta guía con acompañamiento de un adulto o profesional.');
  }

  return {
    summary: `Tu IMC es ${decimal(bmi)} (${label}). Para ${GOAL_LABEL[i.goal]}, una referencia es unas ${dailyKcal} kcal al día.`,
    bmi,
    bmi_label: label,
    daily_kcal: dailyKcal,
    macros: { protein_g: proteinG, carbs_g: carbsG, fat_g: fatG },
    recommendations: RECOMMENDATIONS[i.goal],
    sample_day: [
      { meal: 'Desayuno', items: ['Bolón de verde al horno con huevo', 'Café o té sin azúcar'] },
      { meal: 'Media mañana', items: ['Guineo o papaya', 'Un puñado de maní sin sal'] },
      { meal: 'Almuerzo', items: ['Menestra de lenteja con arroz integral', 'Pescado a la plancha', 'Ensalada de tomate y pepino'] },
      { meal: 'Media tarde', items: ['Maracuyá natural sin azúcar', 'Pepino con limón'] },
      { meal: 'Merienda', items: ['Ceviche de pescado', 'Yogur natural con papaya'] },
    ],
    hydration,
    activity: ACTIVITY_BY_GOAL[i.goal],
    warnings,
    disclaimer: 'Orientación general generada automáticamente. No reemplaza la consulta con un profesional de la salud.',
  };
}
