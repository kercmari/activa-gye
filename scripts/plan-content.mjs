// Genera supabase/migrations/20261121000007_contenido_plantillas_guia.sql (Migración 7).
// Uso: node scripts/plan-content.mjs   (desde la raíz del repo)
// Solo datos: 9 plantillas de nutricionista + 1 de respaldo, con 7 días × 7 ítems, y 12 entradas de guía.
// Todo el contenido queda como 'borrador' / 'Pendiente de revisión' hasta que una nutricionista lo revise.

import { writeFileSync } from 'node:fs';

const OUT = 'supabase/migrations/20261121000007_contenido_plantillas_guia.sql';

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const arr = (a) => `array[${a.map(q).join(', ')}]::text[]`;
const uuid = (n) => `c7000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

// Pool de comidas: cada entrada es [título, detalle para una porción regular].
const DESAYUNOS = [
  ['Bolón de verde al horno con huevo', '1 bolón mediano (1 puño de verde rallado) + 1 huevo cocido'],
  ['Tigrillo light', '1 taza de verde picado salteado con cebolla, 1 huevo revuelto y 1 cucharada de queso fresco'],
  ['Humita', '2 humitas medianas sin manteca + 1 taza de agua de hierbas sin azúcar'],
  ['Avena con frutas', '1 taza de avena cocida con leche descremada + ½ taza de mora o papaya'],
  ['Colada de avena con banano', '1 taza de colada de avena con ½ banano maduro, sin azúcar'],
  ['Pan integral con queso fresco y tomate', '1 pan integral pequeño + 2 cucharadas de queso fresco + 1 tomate pequeño'],
  ['Tortilla de maíz con huevo y aguacate', '2 tortillas de maíz + 1 huevo + ¼ de aguacate'],
];
const MEDIA_MANANA = [
  ['Fruta de temporada', '1 fruta mediana: naranjilla, tomate de árbol o manzana'],
  ['Maní tostado sin sal', 'Un puño pequeño de maní (unas 20 unidades)'],
  ['Yogur natural sin azúcar', '1 taza de yogur natural con ½ taza de fruta picada'],
  ['Chochos con limón', '1 taza de chochos cocidos y pelados con unas gotas de limón'],
  ['Pepino y zanahoria en tiras', '1 taza de pepino y zanahoria con 1 cucharada de queso fresco'],
];
const ALMUERZOS = [
  ['Encebollado de pescado', '1 plato mediano: 1 taza de pescado, 1 puño de yuca, cebolla y tomate; sin chifles'],
  ['Seco de pollo con arroz', '½ taza de pollo sin piel desmenuzado, ½ taza de arroz y ½ taza de ensalada'],
  ['Menestra de lenteja con pescado a la plancha', '1 taza de menestra de lenteja + 1 filete de pescado (del tamaño de la palma) + ½ taza de arroz'],
  ['Caldo de gallina criolla', '1 plato hondo: ½ presa de gallina sin piel, 1 choclo pequeño, 1 yuca pequeña y cilantro'],
  ['Corvina al vapor con ensalada', '1 filete de corvina (palma de mano), 1 papa pequeña (puño) y ensalada de tomate y cebolla'],
  ['Tortilla de verde con ensalada', '2 tortillas de verde (1 taza de verde rallado) + ensalada de pepino'],
  ['Pollo a la plancha con arroz integral', '1 pechuga pequeña a la plancha (palma), ½ taza de arroz integral y ¼ de aguacate'],
  ['Arroz con fréjol y ensalada', '½ taza de arroz + 1 taza de fréjol cocido + ensalada de col morada'],
];
const MERIENDAS = [
  ['Sánduche de pan integral con pollo', '1 pan integral pequeño + 2 cucharadas de pollo desmenuzado'],
  ['Mote con queso fresco', '½ taza de mote cocido + 1 cucharada de queso fresco'],
  ['Batido de frutilla con leche', '1 vaso de leche descremada con ½ taza de frutilla'],
  ['Canguil casero', '2 tazas de canguil sin mantequilla ni sal en exceso'],
  ['Pan integral con atún', '1 pan integral pequeño + 1 lata pequeña de atún en agua escurrida'],
];
const CENAS = [
  ['Caldo de pescado con verde', '1 plato hondo: 1 taza de pescado, 1 verde pequeño y cebolla'],
  ['Ceviche de camarón con choclo', '1 taza de ceviche de camarón con poca salsa + ½ choclo cocido'],
  ['Pescado a la plancha con ensalada', '1 filete de pescado (palma de mano), ensalada de tomate, pepino y limón + ½ taza de arroz'],
  ['Sopa de pollo con fideos', '1 plato hondo con ½ presa de pollo sin piel y 1 taza de verduras'],
  ['Tortilla de espinaca con queso', '2 huevos batidos con 1 taza de espinaca y 1 cucharada de queso fresco'],
  ['Sánduche integral de atún', '1 pan integral + 1 lata pequeña de atún en agua + tomate y lechuga'],
  ['Quinua con pollo y verduras', '½ taza de quinua cocida + ½ presa de pollo a la plancha + 1 taza de verduras'],
  ['Sopa de lenteja con verduras', '1 plato hondo de sopa de lenteja con zanahoria, zapallo y cebolla'],
];

// Rutinas: 7 días con las modalidades permitidas (caminar, trotar, fuerza, bicicleta, yoga).
const RUTINAS_SEMANA = [
  ['Caminar', 30, 'Paso ligero por el barrio o un parque; debes poder hablar mientras caminas'],
  ['Trotar', 20, 'Alterna 2 minutos de trote suave con 1 minuto de caminata'],
  ['Fuerza con tu propio peso', 15, '3 series de 10 sentadillas, 8 flexiones (en rodillas si hace falta) y 30 s de plancha'],
  ['Bicicleta', 30, 'Ritmo cómodo, sin llegar a quedarte sin aire'],
  ['Caminar', 25, 'Caminata con subidas o escaleras si tienes cerca'],
  ['Yoga', 25, 'Saludo al sol, posturas de pie y estiramiento final'],
  ['Fuerza con tu propio peso', 20, '3 series de 12 sentadillas, 8 flexiones y 30 s de plancha; descansa 1 minuto entre series'],
];

const TEMPLATES = [
  { n: 1, name: 'Bajar de peso · mujeres 18–29 · IMC 25–30', description: 'Déficit suave y comidas sencillas para mujeres jóvenes con sobrepeso leve.', sex: 'femenino', age: [18, 29], bmi: [25, 30], goal: 'bajar_peso', kcal: 1800, nivel: 'moderado', offset: 0 },
  { n: 2, name: 'Bajar de peso · mujeres 30–59 · IMC 25–30', description: 'Plan de peso con más fibra y proteína magra para mujeres adultas con sobrepeso leve.', sex: 'femenino', age: [30, 59], bmi: [25, 30], goal: 'bajar_peso', kcal: 1700, nivel: 'moderado', offset: 2 },
  { n: 3, name: 'Bajar de peso · hombres 18–59 · IMC 25–30', description: 'Déficit moderado con porciones de proteína y menestras para hombres con sobrepeso leve.', sex: 'masculino', age: [18, 59], bmi: [25, 30], goal: 'bajar_peso', kcal: 2200, nivel: 'moderado', offset: 4 },
  { n: 4, name: 'Bajar de peso · mujeres 18–59 · IMC 30 o más', description: 'Plan de peso con inicio suave para mujeres con obesidad; el ritmo lo ajusta la nutricionista.', sex: 'femenino', age: [18, 59], bmi: [30, 99], goal: 'bajar_peso', kcal: 1500, nivel: 'suave', offset: 1 },
  { n: 5, name: 'Bajar de peso · hombres 18–59 · IMC 30 o más', description: 'Plan de peso con inicio suave para hombres con obesidad; el ritmo lo ajusta la nutricionista.', sex: 'masculino', age: [18, 59], bmi: [30, 99], goal: 'bajar_peso', kcal: 1900, nivel: 'suave', offset: 5 },
  { n: 6, name: 'Mantener el peso · adultos 18–59 · IMC normal', description: 'Alimentación equilibrada para mantener el peso dentro del rango saludable.', sex: 'cualquiera', age: [18, 59], bmi: [18.5, 25], goal: 'mantener', kcal: 2000, nivel: 'moderado', offset: 3 },
  { n: 7, name: 'Ganar músculo · mujeres 18–59', description: 'Más proteína y energía para ganar masa muscular con fuerza con tu propio peso.', sex: 'femenino', age: [18, 59], bmi: [18.5, 30], goal: 'ganar_musculo', kcal: 2100, nivel: 'moderado', offset: 6 },
  { n: 8, name: 'Ganar músculo · hombres 18–59', description: 'Más proteína y energía para ganar masa muscular con fuerza con tu propio peso.', sex: 'masculino', age: [18, 59], bmi: [18.5, 30], goal: 'ganar_musculo', kcal: 2600, nivel: 'moderado', offset: 7 },
  { n: 9, name: 'Bienestar · adultos de 50 años o más', description: 'Plan para cuidar la energía, los huesos y el corazón a partir de los 50 años.', sex: 'cualquiera', age: [50, 120], bmi: [0, 99], goal: 'bienestar', kcal: 1700, nivel: 'suave', offset: 2 },
];
const FALLBACK = { n: 10, name: 'Plan general de respaldo', description: 'Plan general para cuando ninguna plantilla específica encaja con tu ficha.', sex: 'cualquiera', age: [0, 120], bmi: [0, 99], goal: null, kcal: 1800, nivel: 'moderado', offset: 4, fallback: true };

function sizeWord(kcal) {
  if (kcal < 1600) return 'porción pequeña';
  if (kcal >= 2400) return 'porción generosa';
  return 'porción regular';
}

function itemsFor(t) {
  const rows = [];
  for (let d = 1; d <= 7; d++) {
    const pick = (pool, shift) => pool[(d - 1 + t.offset + shift) % pool.length];
    const comidas = [
      ['07:30', pick(DESAYUNOS, 0)],
      ['10:30', pick(MEDIA_MANANA, 0)],
      ['13:00', pick(ALMUERZOS, 0)],
      ['16:30', pick(MERIENDAS, 0)],
      ['19:30', pick(CENAS, 0)],
    ];
    for (const [hora, [titulo, porcion]] of comidas) {
      rows.push({ d, hora, kind: 'comida', titulo, detalle: `${porcion} · ${sizeWord(t.kcal)} para ${t.kcal} kcal/día` });
    }
    const [rut, min, como] = RUTINAS_SEMANA[(d - 1 + t.offset) % RUTINAS_SEMANA.length];
    rows.push({ d, hora: '17:30', kind: 'rutina', titulo: `${rut} · ${min} min`, detalle: `${como}. Nivel ${t.nivel}.` });
    const habito = d % 2 === 1
      ? ['Tomar agua', '8 vasos de agua repartidos en el día (unos 2 litros)']
      : ['Dormir a tiempo', 'Dormir entre 7 y 8 horas; deja las pantallas 30 minutos antes de acostarte'];
    rows.push({ d, hora: '21:00', kind: 'habito', titulo: habito[0], detalle: habito[1] });
  }
  return rows;
}

const GUIA = [
  { slug: 'hidratacion-diaria', category: 'hidratacion', title: 'Agua durante el día', summary: 'Cómo repartir el agua sin acordarte a la fuerza.',
    objective: 'Mantener una hidratación suficiente con agua simple, sin depender de bebidas azucaradas.',
    do: ['Lleva una botella de agua contigo', 'Toma un vaso al despertar y uno antes de cada comida'],
    avoid: ['Reemplazar el agua por gaseosas o jugos envasados', 'Esperar a tener sed para tomar agua'],
    steps: ['Llena una botella de 1 litro cada mañana', 'Bebe una porción al terminar cada comida principal', 'Revisa al final del día cuántos vasos tomaste'],
    source: 'OMS: Dieta saludable (nota descriptiva)' },
  { slug: 'hidratacion-ejercicio', category: 'hidratacion', title: 'Hidratarse al hacer ejercicio', summary: 'Qué tomar antes, durante y después de moverte.',
    objective: 'Evitar la deshidratación en caminatas, trote y fuerza.',
    do: ['Toma medio vaso de agua 30 minutos antes', 'Repón líquidos después de sudar'],
    avoid: ['Tomar mucha agua de golpe justo antes de entrenar', 'Usar bebidas energéticas como agua de todos los días'],
    steps: ['Antes: medio vaso de agua', 'Durante: sorbos cada 15 o 20 minutos en sesiones largas', 'Después: un vaso de agua y una fruta si entrenaste más de 45 minutos'],
    source: 'OMS: Dieta saludable (nota descriptiva)' },
  { slug: 'porciones-plato', category: 'porciones', title: 'Cómo armar el plato', summary: 'Un plato criollo equilibrado con medidas de la casa.',
    objective: 'Repartir el plato entre verduras, proteína y carbohidratos sin pesar la comida.',
    do: ['Mitad del plato con verduras o ensalada', 'Un cuarto con proteína (pollo, pescado, huevo, menestra)', 'Un cuarto con arroz, papa, yuca o choclo'],
    avoid: ['Servirte directamente de la olla sin medir', 'Comer el arroz con fritada o frituras todos los días'],
    steps: ['Usa un plato mediano en vez de uno grande', 'Sirve primero las verduras', 'Completa con la proteína y luego el carbohidrato'],
    source: 'Guías Alimentarias Basadas en Alimentos del Ecuador (MSP)' },
  { slug: 'porciones-medidas-caseras', category: 'porciones', title: 'Medidas caseras', summary: 'Tazas, puños y palmas para estimar porciones.',
    objective: 'Estimar porciones sin balanza, con medidas que todos tienen en casa.',
    do: ['Una palma de mano como referencia para la carne o el pescado', 'Un puño cerrado como referencia para arroz, papa o fruta'],
    avoid: ['Servir a ojo un plato lleno de arroz', 'Contar como una porción un paquete entero de galletas'],
    steps: ['Mide tu palma y tu puño una vez con una taza medidora', 'Usa esas medidas durante una semana', 'Ajusta según cómo te sientas y lo que te indique tu nutricionista'],
    source: 'Guías Alimentarias Basadas en Alimentos del Ecuador (MSP)' },
  { slug: 'antes-de-entrenar', category: 'antes_entrenar', title: 'Comer antes de entrenar', summary: 'Una comida ligera 1 o 2 horas antes de moverte.',
    objective: 'Llegar con energía sin sentir pesadez durante la sesión.',
    do: ['Elige carbohidratos sencillos como fruta o pan integral', 'Añade un poco de proteína como huevo o queso fresco'],
    avoid: ['Comer frituras o platos muy grasos justo antes', 'Entrenar en ayunas si te sientes mareado'],
    steps: ['Come 1 o 2 horas antes', 'Opciones: banano con avena, o pan integral con huevo', 'Si tienes poco tiempo, una fruta 30 minutos antes'],
    source: 'OMS: Actividad física (nota descriptiva)' },
  { slug: 'despues-de-entrenar', category: 'despues_entrenar', title: 'Recuperarte después de entrenar', summary: 'Qué comer tras la sesión para recuperar músculo.',
    objective: 'Reponer energía y apoyar la recuperación muscular.',
    do: ['Come una porción de proteína dentro de las 2 horas siguientes', 'Incluye fruta o verduras en esa comida'],
    avoid: ['Saltarte la comida después de entrenar', 'Premiarte con bebidas azucaradas'],
    steps: ['Después de entrenar, bebe agua', 'Come proteína (pollo, pescado, huevo o menestra)', 'Completa el plato con verduras y un carbohidrato sencillo'],
    source: 'OMS: Actividad física (nota descriptiva)' },
  { slug: 'comer-fuera-almuerzo', category: 'comer_fuera', title: 'Almorzar fuera de casa', summary: 'Cómo elegir en un restaurante sin salirte del plan.',
    objective: 'Elegir platos con más verdura y menos fritura cuando comes fuera.',
    do: ['Pide sopa, caldo o encebollado sin chifles extra', 'Pide la ensalada o las verduras como acompañamiento'],
    avoid: ['Pedir un plato frito y una gaseosa grande', 'Comer todo el arroz y el pan que te traen primero'],
    steps: ['Revisa el menú antes de llegar', 'Pide la porción que sueles comer en casa', 'Si te sirven de más, guarda la mitad para otro día'],
    source: 'Guías Alimentarias Basadas en Alimentos del Ecuador (MSP)' },
  { slug: 'comer-fuera-cena', category: 'comer_fuera', title: 'Cenar en familia o con amigos', summary: 'Disfrutar la reunión sin descarrilar la semana.',
    objective: 'Disfrutar la comida compartida con decisiones sencillas.',
    do: ['Empieza por la ensalada o la sopa', 'Comparte el plato fuerte si es muy abundante'],
    avoid: ['Repetir porciones solo porque están en la mesa', 'Compensar saltándote la comida del día siguiente'],
    steps: ['Come despacio y deja de comer cuando estés satisfecho', 'Elige agua o una bebida sin azúcar', 'Al día siguiente vuelve a tu horario normal'],
    source: 'OMS: Dieta saludable (nota descriptiva)' },
  { slug: 'descanso-sueno', category: 'descanso', title: 'Dormir mejor', summary: 'Hábitos simples para dormir entre 7 y 8 horas.',
    objective: 'Dormir lo suficiente para recuperarte y tener hambre regular.',
    do: ['Acuéstate y levántate a la misma hora', 'Deja el celular fuera del dormitorio'],
    avoid: ['Cenar muy tarde o muy pesado', 'Tomar café después de las 3 de la tarde'],
    steps: ['Fija una hora de dormir', 'Baja la luz 30 minutos antes', 'Si no puedes dormir en 20 minutos, levántate y haz algo tranquilo'],
    source: 'OMS: Actividad física (nota descriptiva)' },
  { slug: 'descanso-dias-de-pausa', category: 'descanso', title: 'Días de descanso', summary: 'Por qué también necesitas días sin entrenar.',
    objective: 'Dejar que el cuerpo se recupere para avanzar sin lesiones.',
    do: ['Haz al menos un día de descanso a la semana', 'Camina suave si te apetece'],
    avoid: ['Entrenar fuerte todos los días', 'Ignorar dolor articular o cansancio extremo'],
    steps: ['Elige un día fijo de descanso', 'En ese día haz solo estiramientos o una caminata suave', 'Si sientes dolor persistente, consulta con tu nutricionista'],
    source: 'OMS: Actividad física (nota descriptiva)' },
  { slug: 'compras-lista', category: 'compras', title: 'Hacer la lista del mercado', summary: 'Comprar lo necesario para toda la semana.',
    objective: 'Llevar al mercado lo que vas a cocinar y evitar compras impulsivas.',
    do: ['Planifica las comidas de tres a cinco días', 'Compra verduras de temporada y pescado fresco'],
    avoid: ['Ir al mercado con hambre', 'Comprar embutidos y snacks empacados por costumbre'],
    steps: ['Revisa qué te queda en casa', 'Escribe la lista por secciones: verduras, proteínas, granos', 'Compra según la lista y revisa las etiquetas de sal y azúcar'],
    source: 'Guías Alimentarias Basadas en Alimentos del Ecuador (MSP)' },
  { slug: 'compras-etiquetas', category: 'compras', title: 'Leer las etiquetas', summary: 'Qué mirar en un producto empacado.',
    objective: 'Escoger productos empacados con menos azúcar, sal y grasa.',
    do: ['Compara el sodio por porción entre marcas', 'Prefiere productos con pocos ingredientes que reconozcas'],
    avoid: ['Fiarte solo de la frase «light» o «natural»', 'Comprar bebidas azucaradas como si fueran jugo natural'],
    steps: ['Mira el tamaño de la porción', 'Revisa azúcares y sodio por porción', 'Elige el producto con menos de ambos cuando tengas opciones'],
    source: 'OMS: Dieta saludable (nota descriptiva)' },
];

function guideSql() {
  const rows = GUIA.map((g, i) => `  (${q(g.slug)}, ${q(g.category)}, ${q(g.title)}, ${q(g.summary)}, ${q(g.objective)}, ${arr(g.do)}, ${arr(g.avoid)}, ${arr(g.steps)}, ${q(g.source)}, true, ${(i + 1) * 10})`);
  return `insert into public.guide_entries (slug, category, title, summary, objective, do_items, avoid_items, steps, source, published, sort) values\n${rows.join(',\n')}\non conflict (slug) do nothing;\n`;
}

function templatesSql() {
  const rows = [...TEMPLATES, FALLBACK].map((t) => {
    const [amin, amax] = t.age;
    const [bmin, bmax] = t.bmi;
    return `  (${q(uuid(t.n))}, ${q(t.name)}, ${q(t.description)}, ${q(t.sex)}, ${amin}, ${amax}, ${bmin}, ${bmax}, ${t.goal ? q(t.goal) : 'null'}, ${t.kcal}, 'Pendiente de revisión', 'borrador', ${t.fallback ? 'true' : 'false'})`;
  });
  return `insert into public.plan_templates (id, name, description, sex, age_min, age_max, bmi_min, bmi_max, goal, kcal_base, author_name, status, is_fallback) values\n${rows.join(',\n')};\n`;
}

function itemsSql() {
  const rows = [];
  for (const t of [...TEMPLATES, FALLBACK]) {
    itemsFor(t).forEach((r, i) => {
      rows.push(`  (${q(uuid(t.n))}, ${r.d}, ${q(r.hora)}, ${q(r.kind)}, ${q(r.titulo)}, ${q(r.detalle)}, ${i})`);
    });
  }
  return `insert into public.plan_template_items (template_id, day_number, at_time, kind, title, detail, sort) values\n${rows.join(',\n')};\n`;
}

const header = `-- Migración 7: contenido (plantillas de nutricionista y guía). Solo datos; sin cambios de esquema.
-- Generado por scripts/plan-content.mjs: no editar a mano, cambia el script y vuelve a generar.
-- 9 plantillas + 1 de respaldo, todas 'borrador' / 'Pendiente de revisión'. 7 días × 7 ítems cada una.
-- Guía: 12 entradas con fuentes generales (OMS, MSP Ecuador, Guías Alimentarias del Ecuador).

`;

writeFileSync(OUT, [header, templatesSql(), itemsSql(), guideSql()].join('\n'));
console.log(`escrito ${OUT}: ${TEMPLATES.length + 1} plantillas, ${(TEMPLATES.length + 1) * 49} ítems, ${GUIA.length} guías`);
