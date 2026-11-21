import { describe, it, expect } from 'vitest';
import { buildBasicGuide } from './guide';

describe('buildBasicGuide', () => {
  it('mujer 30 años 165 cm 70 kg moderado bajar_peso', () => {
    const g = buildBasicGuide({
      age: 30, sex: 'femenino', height_cm: 165, weight_kg: 70,
      activity_level: 'moderado', goal: 'bajar_peso', restrictions: null, health_conditions: null,
    });
    expect(g.bmi).toBe(25.7);
    expect(g.bmi_label).toBe('Sobrepeso');
    expect(g.daily_kcal).toBe(1850);
    expect(g.macros).toEqual({ protein_g: 112, carbs_g: 220, fat_g: 58 });
  });

  it('hombre 25 años 180 cm 75 kg intenso ganar_musculo', () => {
    const g = buildBasicGuide({
      age: 25, sex: 'masculino', height_cm: 180, weight_kg: 75,
      activity_level: 'intenso', goal: 'ganar_musculo', restrictions: null, health_conditions: null,
    });
    expect(g.daily_kcal).toBe(3350);
    expect(g.macros).toEqual({ protein_g: 135, carbs_g: 469, fat_g: 104 });
  });

  it('piso de 1200 para mujer', () => {
    const g = buildBasicGuide({
      age: 60, sex: 'femenino', height_cm: 150, weight_kg: 40,
      activity_level: 'sedentario', goal: 'bajar_peso', restrictions: null, health_conditions: null,
    });
    expect(g.daily_kcal).toBe(1200);
  });

  it('advertencias por condiciones de salud y por IMC bajo', () => {
    const g = buildBasicGuide({
      age: 40, sex: 'masculino', height_cm: 170, weight_kg: 45,
      activity_level: 'ligero', goal: 'mantener', restrictions: 'sin lácteos', health_conditions: 'diabetes',
    });
    expect(g.bmi_label).toBe('Bajo peso');
    expect(g.warnings).toContain('Por tus condiciones de salud, consulta a un profesional antes de cambiar tu alimentación.');
    expect(g.warnings).toContain('Te recomendamos una valoración presencial con un nutricionista.');
    expect(g.warnings).toContain('Adapta el menú a tus restricciones: sin lácteos');
  });

  it('siempre 5 comidas y disclaimer', () => {
    const g = buildBasicGuide({
      age: 17, sex: 'otro', height_cm: 160, weight_kg: 60,
      activity_level: 'moderado', goal: 'bienestar', restrictions: null, health_conditions: null,
    });
    expect(g.sample_day.map((m) => m.meal)).toEqual(['Desayuno', 'Media mañana', 'Almuerzo', 'Media tarde', 'Merienda']);
    expect(g.disclaimer).toBe('Orientación general generada automáticamente. No reemplaza la consulta con un profesional de la salud.');
    expect(g.warnings).toContain('Por tu edad, sigue esta guía con acompañamiento de un adulto o profesional.');
    expect(g.hydration).toBe('Bebe alrededor de 2,1 litros de agua al día (más si entrenas o hace calor).');
  });

  it('R1 hidratación: tope de 3,5 L con 400 kg', () => {
    const g = buildBasicGuide({
      age: 30, sex: 'masculino', height_cm: 180, weight_kg: 400,
      activity_level: 'moderado', goal: 'mantener', restrictions: null, health_conditions: null,
    });
    expect(g.hydration).toBe('Bebe alrededor de 3,5 litros de agua al día (más si entrenas o hace calor).');
  });

  it('R1 hidratación: tope de 3,5 L también con 150 kg (5,3 L antes)', () => {
    const g = buildBasicGuide({
      age: 30, sex: 'masculino', height_cm: 180, weight_kg: 150,
      activity_level: 'moderado', goal: 'mantener', restrictions: null, health_conditions: null,
    });
    expect(g.hydration).toContain('Bebe alrededor de 3,5 litros');
  });

  it('R1 IMC bajo: bajar_peso no aplica déficit (IMC < 18,5)', () => {
    const g = buildBasicGuide({
      age: 40, sex: 'masculino', height_cm: 170, weight_kg: 45,
      activity_level: 'sedentario', goal: 'bajar_peso', restrictions: null, health_conditions: null,
    });
    expect(g.bmi_label).toBe('Bajo peso');
    // Sin déficit: 1317,5 × 1,2 = 1581 → 1600 (antes salía 1350 con el 15 % de déficit)
    expect(g.daily_kcal).toBe(1600);
  });
});
