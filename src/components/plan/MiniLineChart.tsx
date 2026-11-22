/** Gráfico de línea mínimo en SVG propio, accesible: título, puntos con etiqueta y tabla oculta con los datos. */
export interface ChartPoint {
  /** Texto de la fecha, p. ej. '21/11'. */
  label: string;
  /** null = no hubo registro ese día (no se dibuja). */
  value: number | null;
}

interface Props {
  /** Nombre del gráfico, p. ej. «Ánimo». Se usa en el título accesible. */
  title: string;
  /** Unidad para la tabla y las etiquetas, p. ej. 'kg'. */
  unit: string;
  points: ChartPoint[];
  min: number;
  max: number;
  /** Decimales al mostrar valores. */
  decimals?: number;
}

const W = 320;
const H = 160;
const PAD_L = 40;
const PAD_R = 12;
const PAD_T = 14;
const PAD_B = 26;

function fmt(value: number, decimals: number): string {
  return value.toFixed(decimals).replace('.', ',');
}

export default function MiniLineChart({ title, unit, points, min, max, decimals = 0 }: Props) {
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const span = max - min || 1;
  const n = points.length;
  const x = (i: number) => (n <= 1 ? PAD_L + innerW / 2 : PAD_L + (i / (n - 1)) * innerW);
  const y = (v: number) => PAD_T + (1 - (Math.min(Math.max(v, min), max) - min) / span) * innerH;

  const drawn = points
    .map((p, i) => ({ ...p, i, cx: x(i), cy: n === 0 || p.value === null ? 0 : y(p.value) }))
    .filter((p): p is typeof p & { value: number } => p.value !== null);
  const valid = drawn.map((p) => p.value);
  const summary = valid.length
    ? `de ${fmt(valid[0], decimals)} ${unit} a ${fmt(valid[valid.length - 1], decimals)} ${unit}`
    : 'sin registros';
  const ticks = [max, (max + min) / 2, min];

  return (
    <figure className="rounded-[1.75rem] bg-white p-5 shadow-xl shadow-navy-900/5">
      <figcaption className="eyebrow mb-3 text-brand-orange">{title}</figcaption>
      {drawn.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">Sin registros todavía.</p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          data-chart={title}
          aria-label={`${title}: ${summary}`}
          className="h-auto w-full"
        >
          <title>{`${title}: ${summary}`}</title>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y(t)} y2={y(t)} className="stroke-slate-200" strokeWidth={1} />
              <text x={PAD_L - 6} y={y(t) + 4} textAnchor="end" fontSize={11} className="fill-slate-500">
                {fmt(t, decimals)}
              </text>
            </g>
          ))}
          {drawn.length > 1 ? (
            <polyline
              points={drawn.map((p) => `${p.cx},${p.cy}`).join(' ')}
              fill="none"
              className="stroke-brand-blue"
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
          ) : null}
          {drawn.map((p) => (
            <circle key={p.i} cx={p.cx} cy={p.cy} r={4} className="fill-brand-orange">
              <title>{`${p.label}: ${fmt(p.value, decimals)} ${unit}`}</title>
            </circle>
          ))}
          <text x={PAD_L} y={H - 6} fontSize={11} className="fill-slate-500">{points[0]?.label ?? ''}</text>
          <text x={W - PAD_R} y={H - 6} textAnchor="end" fontSize={11} className="fill-slate-500">
            {points[n - 1]?.label ?? ''}
          </text>
        </svg>
      )}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">{unit}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={`${p.label}-${i}`}>
              <td>{p.label}</td>
              <td>{p.value === null ? 'Sin registro' : `${fmt(p.value, decimals)} ${unit}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
