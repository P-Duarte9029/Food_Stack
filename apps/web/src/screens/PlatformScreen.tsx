import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { platformRestaurantSchema, type PlatformRestaurant } from '@food-stack/shared';
import { request } from '../api/client';
import { NewRestaurantForm } from './platform/NewRestaurantForm';
import { RestaurantRow } from './platform/RestaurantRow';

const restaurantsSchema = z.array(platformRestaurantSchema);

export function PlatformScreen() {
  const [restaurants, setRestaurants] = useState<readonly PlatformRestaurant[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRestaurants(await request('GET', '/platform/restaurants', restaurantsSchema));
      setError(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível carregar os restaurantes.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const replace = (restaurant: PlatformRestaurant) =>
    setRestaurants((current) =>
      current.map((entry) => (entry.id === restaurant.id ? restaurant : entry)),
    );

  return (
    <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-6">
      <NewRestaurantForm onCreated={(restaurant) => setRestaurants((current) => [...current, restaurant])} />

      <section aria-labelledby="restaurantes-titulo" className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 id="restaurantes-titulo" className="text-lg font-bold">
          Restaurantes <span className="text-slate-600">({restaurants.length})</span>
        </h2>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {loaded && restaurants.length === 0 && !error ? (
          <p className="mt-3 text-sm text-slate-600">Nenhum restaurante cadastrado.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-200">
            {restaurants.map((restaurant) => (
              <RestaurantRow key={restaurant.id} restaurant={restaurant} onChanged={replace} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
