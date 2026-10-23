import { getSupabase } from './supabase.js';
import { authService } from './auth.js';

export const stopService = {
  async getStops(filters = {}) {
    const supabase = getSupabase();
    if (!supabase) return { data: [], error: 'Supabase no configurado' };

    let query = supabase
      .from('stops')
      .select(`
        *,
        route_stops (
          route_id,
          variant_id,
          sequence,
          direction,
          routes (id, code, name, origin, destination, type)
        )
      `)
      .eq('status', 'active');

    if (filters.routeId) {
      query = query.eq('route_stops.route_id', filters.routeId);
    }

    if (filters.variantId) {
      query = query.eq('route_stops.variant_id', filters.variantId);
    }

    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const { data, error } = await query.order('name');
    return { data: data || [], error };
  },

  async getStopById(id) {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };

    const { data, error } = await supabase
      .from('stops')
      .select(`
        *,
        route_stops (
          route_id,
          variant_id,
          sequence,
          direction,
          routes (id, code, name, origin, destination, type)
        )
      `)
      .eq('id', id)
      .single();

    return { data, error };
  },

  async getNearbyStops(latitude, longitude, radius = 500) {
    const supabase = getSupabase();
    if (!supabase) return { data: [], error: 'Supabase no configurado' };

    const { data, error } = await supabase.rpc('get_nearby_stops', {
      user_lat: latitude,
      user_lng: longitude,
      radius_meters: radius
    });

    return { data: data || [], error };
  },

  async createStop(stopData) {
    const supabase = getSupabase();
    const user = authService.getUser();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };
    if (!user) return { data: null, error: 'Usuario no autenticado' };

    const { data, error } = await supabase
      .from('stops')
      .insert({
        ...stopData,
        created_by: user.id
      })
      .select()
      .single();

    return { data, error };
  },

  async updateStop(id, updates) {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };

    const { data, error } = await supabase
      .from('stops')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  async addStopToRoute(routeId, stopId, sequence, direction, variantId = null) {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };

    const { data, error } = await supabase
      .from('route_stops')
      .insert({
        route_id: routeId,
        variant_id: variantId,
        stop_id: stopId,
        sequence,
        direction
      })
      .select()
      .single();

    return { data, error };
  },

  async removeStopFromRoute(routeId, stopId, variantId = null) {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };

    let query = supabase
      .from('route_stops')
      .delete()
      .eq('route_id', routeId)
      .eq('stop_id', stopId);

    if (variantId) {
      query = query.eq('variant_id', variantId);
    } else {
      query = query.is('variant_id', null);
    }

    const { error } = await query;
    return { error };
  },

  async getStopsForRoute(routeId, variantId = null) {
    const supabase = getSupabase();
    if (!supabase) return { data: [], error: 'Supabase no configurado' };

    let query = supabase
      .from('route_stops')
      .select(`
        sequence,
        direction,
        stops (id, name, latitude, longitude, stop_type, description)
      `)
      .eq('route_id', routeId)
      .order('sequence');

    if (variantId) {
      query = query.eq('variant_id', variantId);
    } else {
      query = query.is('variant_id', null);
    }

    const { data, error } = await query;
    return { data: data || [], error };
  }
};