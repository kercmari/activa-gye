import { repo } from '../../data';
import PlaceCard from '../places/PlaceCard';
import { EmptyState, ErrorState, Loading } from '../ui/States';
import { useAsync } from './useAsync';

/** Pestaña "Mis favoritos": tarjetas de los lugares guardados. */
export default function FavoritesTab() {
  const state = useAsync(async () => {
    const [places, sectors, sports] = await Promise.all([
      repo.listFavorites(),
      repo.listSectors(),
      repo.listSports(),
    ]);
    return { places, sectors, sports };
  }, []);

  if (state.status === 'loading') return <Loading text="Cargando tus favoritos…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={state.reload} />;

  const { places, sectors, sports } = state.data;
  if (places.length === 0) {
    return (
      <EmptyState
        title="Aún no guardas lugares"
        text="Guarda los lugares que te interesen desde su ficha y los verás aquí."
        action={{ to: '/lugares', label: 'Buscar lugares' }}
      />
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {places.map((place) => (
        <PlaceCard
          key={place.id}
          place={place}
          sectorName={sectors.find((s) => s.id === place.sector_id)?.name ?? ''}
          sportName={sports.find((s) => s.id === place.sport_ids[0])?.name ?? ''}
        />
      ))}
    </div>
  );
}
