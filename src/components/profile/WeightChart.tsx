export interface WeightPoint {
  /** 'AAAA-MM-DD' */
  date: string;
  kg: number;
}

const W = 320;
const H = 180;
const PAD_L = 44;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 28;

/** Fecha 'AAAA-MM-DD' como número (UTC, sin desfases de zona horaria). */
function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/** Gráfico de peso en el tiempo, en SVG propio (sin librerías). */
export default function WeightChart({ points }: { points: WeightPoint[] }) {
  if (points.length < 2) {
    return (
      <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
        Agrega al menos 2 registros con peso para ver tu gráfico.
      </p>
    );
  }

  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const times = sorted.map((p) => dayNumber(p.date));
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const kgMin = Math.min(...sorted.map((p) => p.kg));
  const kgMax = Math.max(...sorted.map((p) => p.kg));
  const kgLo = kgMin === kgMax ? kgMin - 1 : kgMin;
  const kgHi = kgMin === kgMax ? kgMax + 1 : kgMax;

  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const x = (iso: string) =>
    tMax === tMin ? PAD_L + innerW / 2 : PAD_L + ((dayNumber(iso) - tMin) / (tMax - tMin)) * innerW;
  const y = (kg: number) => PAD_T + (1 - (kg - kgLo) / (kgHi - kgLo)) * innerH;

  const ticks = [kgHi, (kgHi + kgLo) / 2, kgLo];
  const coords = sorted.map((p) => ({ ...p, cx: x(p.date), cy: y(p.kg) }));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Gráfico de peso: de ${first.kg.toFixed(1)} kg el ${shortDate(first.date)} a ${last.kg.toFixed(1)} kg el ${shortDate(last.date)}`}
      className="h-auto w-full"
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD_L} x2={W - PAD_R} y1={y(t)} y2={y(t)} className="stroke-slate-200" strokeWidth={1} />
          <text x={PAD_L - 6} y={y(t) + 4} textAnchor="end" fontSize={11} className="fill-slate-500">
            {t.toFixed(1)}
          </text>
        </g>
      ))}
      <text x={PAD_L} y={H - 6} fontSize={11} className="fill-slate-500">{shortDate(first.date)}</text>
      <text x={W - PAD_R} y={H - 6} textAnchor="end" fontSize={11} className="fill-slate-500">{shortDate(last.date)}</text>
      <polyline
        points={coords.map((c) => `${c.cx},${c.cy}`).join(' ')}
        fill="none"
        className="stroke-brand-blue"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {coords.map((c) => (
        <circle key={`${c.date}-${c.kg}`} data-point="" cx={c.cx} cy={c.cy} r={4.5} className="fill-brand-orange">
          <title>{`${shortDate(c.date)}: ${c.kg.toFixed(1)} kg`}</title>
        </circle>
      ))}
    </svg>
  );
}
