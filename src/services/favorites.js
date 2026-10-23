import { getSupabase } from './supabase.js';
import { authService } from './auth.js';

export const favoriteService = {
  async getUserFavorites(userId = null) {
    const supabase = getSupabase();
    const user = userId || authService.getUser()?.id;
    if (!supabase) return { data: [], error: 'Supabase no configurado' };
    if (!user) return { data: [], error: 'Usuario no autenticado' };

    const { data, error } = await supabase
      .from('favorites')
      .select(`
        *,
        routes:route_id (id, code, name, origin, destination, type),
        stops:stop_id (id, name, latitude, longitude, stop_type)
      `)
      .eq('user_id', user)
      .order('created_at', { ascending: false });

    return { data: data || [], error };
  },

  async addFavorite(item) {
    const supabase = getSupabase();
    const user = authService.getUser();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };
    if (!user) return { data: null, error: 'Usuario no autenticado' };

    if (!item.route_id && !item.stop_id) {
      return { data: null, error: 'Debe especificar route_id o stop_id' };
    }

    // Borrar favorito previo idéntico (evita conflictos de unique con NULLs en Postgres)
    let del = supabase.from('favorites').delete().eq('user_id', user.id);
    if (item.route_id) del = del.eq('route_id', item.route_id);
    if (item.stop_id) del = del.eq('stop_id', item.stop_id);
    await del;

    const { data, error } = await supabase
      .from('favorites')
      .insert({
        user_id: user.id,
        route_id: item.route_id || null,
        stop_id: item.stop_id || null
      })
      .select()
      .single();

    return { data, error };
  },

  async removeFavorite(routeId = null, stopId = null) {
    const supabase = getSupabase();
    const user = authService.getUser();
    if (!supabase) return { error: 'Supabase no configurado' };
    if (!user) return { error: 'Usuario no autenticado' };

    let query = supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id);

    if (routeId) {
      query = query.eq('route_id', routeId);
    }

    if (stopId) {
      query = query.eq('stop_id', stopId);
    }

    const { error } = await query;
    return { error };
  },

  async isFavorite(routeId = null, stopId = null) {
    const supabase = getSupabase();
    const user = authService.getUser();
    if (!supabase || !user) return false;

    let query = supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (routeId) {
      query = query.eq('route_id', routeId);
    }

    if (stopId) {
      query = query.eq('stop_id', stopId);
    }

    const { data } = await query;
    return data && data.length > 0;
  },

  async toggleFavorite(routeId = null, stopId = null) {
    const isFav = await this.isFavorite(routeId, stopId);
    if (isFav) {
      return this.removeFavorite(routeId, stopId);
    } else {
      return this.addFavorite({ route_id: routeId, stop_id: stopId });
    }
  }
};