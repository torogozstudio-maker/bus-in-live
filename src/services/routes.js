import { getSupabase } from './supabase.js';
import { authService } from './auth.js';

export const routeService = {
  async getRoutes(filters = {}) {
    const supabase = getSupabase();
    if (!supabase) return { data: [], error: 'Supabase no configurado' };

    let query = supabase
      .from('routes')
      .select(`
        *,
        route_variants (id, name, variant_type, direct, active),
        stops:route_stops (stops (id, name, latitude, longitude, stop_type))
      `)
      .is('deleted_at', null)
      .eq('validation_status', 'approved');

    if (filters.city) {
      query = query.eq('city', filters.city);
    }

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.search) {
      query = query.or(`code.ilike.%${filters.search}%,name.ilike.%${filters.search}%,origin.ilike.%${filters.search}%,destination.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('code');

    return { data: data || [], error };
  },

  async getRouteById(id) {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };

    const { data, error } = await supabase
      .from('routes')
      .select(`
        *,
        route_variants (id, name, variant_type, direct, description, active),
        stops:route_stops (
          sequence,
          direction,
          stops (id, name, latitude, longitude, stop_type, description)
        ),
        route_shapes (geometry, version, active)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    return { data, error };
  },

  async createRoute(routeData) {
    const supabase = getSupabase();
    const user = authService.getUser();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };
    if (!user) return { data: null, error: 'Usuario no autenticado' };

    const { data, error } = await supabase
      .from('routes')
      .insert({
        ...routeData,
        created_by: user.id,
        validation_status: 'pending'
      })
      .select()
      .single();

    return { data, error };
  },

  async updateRoute(id, updates) {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };

    const { data, error } = await supabase
      .from('routes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  async requestChange(routeId, type, oldData, proposedData, reason) {
    const supabase = getSupabase();
    const user = authService.getUser();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };
    if (!user) return { data: null, error: 'Usuario no autenticado' };

    const { data, error } = await supabase
      .from('route_change_requests')
      .insert({
        route_id: routeId,
        user_id: user.id,
        type,
        old_data: oldData,
        proposed_data: proposedData,
        reason,
        status: 'pending'
      })
      .select()
      .single();

    return { data, error };
  },

  async requestDeletion(routeId, reason, evidence) {
    const supabase = getSupabase();
    const user = authService.getUser();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };
    if (!user) return { data: null, error: 'Usuario no autenticado' };

    const { data, error } = await supabase
      .from('deletion_requests')
      .insert({
        route_id: routeId,
        user_id: user.id,
        reason,
        evidence,
        status: 'pending'
      })
      .select()
      .single();

    return { data, error };
  },

  async getRouteObservations(routeId, variantId = null, since = null) {
    const supabase = getSupabase();
    if (!supabase) return { data: [], error: 'Supabase no configurado' };

    let query = supabase
      .from('bus_observations')
      .select(`
        *,
        trip_sessions (user_id, route_id, variant_id)
      `)
      .eq('route_id', routeId)
      .order('observed_at', { ascending: false })
      .limit(100);

    if (variantId) {
      query = query.eq('variant_id', variantId);
    }

    if (since) {
      query = query.gte('observed_at', since);
    }

    const { data, error } = await query;
    return { data: data || [], error };
  },

  async getRouteShape(routeId, variantId = null) {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };

    let query = supabase
      .from('route_shapes')
      .select('geometry')
      .eq('route_id', routeId)
      .eq('active', true)
      .order('version', { ascending: false })
      .limit(1);

    if (variantId) {
      query = query.eq('variant_id', variantId);
    } else {
      query = query.is('variant_id', null);
    }

    const { data, error } = await query;
    return { data: data?.[0]?.geometry || null, error };
  },

  async searchRoutes(query, limit = 10) {
    const supabase = getSupabase();
    if (!supabase) return { data: [], error: 'Supabase no configurado' };

    const { data, error } = await supabase
      .from('routes')
      .select('id, code, name, origin, destination, type, status')
      .is('deleted_at', null)
      .eq('validation_status', 'approved')
      .or(`code.ilike.%${query}%,name.ilike.%${query}%,origin.ilike.%${query}%,destination.ilike.%${query}%`)
      .limit(limit);

    return { data: data || [], error };
  }
};