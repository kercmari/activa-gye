import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WeightChart from './WeightChart';

describe('WeightChart', () => {
  it('con menos de 2 pesos muestra el mensaje', () => {
    render(<WeightChart points={[{ date: '2026-11-01', kg: 78 }]} />);
    expect(screen.getByText('Agrega al menos 2 registros con peso para ver tu gráfico.')).toBeInTheDocument();
    expect(document.querySelector('svg')).toBeNull();
  });

  it('dibuja un punto por registro', () => {
    const { container } = render(
      <WeightChart
        points={[
          { date: '2026-11-01', kg: 78 },
          { date: '2026-11-08', kg: 77.2 },
          { date: '2026-11-15', kg: 76.5 },
        ]}
      />,
    );
    expect(container.querySelectorAll('circle[data-point]')).toHaveLength(3);
  });
});
