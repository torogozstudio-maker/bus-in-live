import { getSupabase } from './supabase.js';
import { authService } from './auth.js';

const INCIDENT_TYPES = [
  'accident',
  'traffic',
  'breakdown',
  'blockage',
  'detour',
  'suspended',
  'other'
];

const INCIDENT_SEVERITIES = ['low', 'medium', 'high', 'critical'];
const INCIDENT_STATUSES = ['active', 'resolved', 'expired'];

export const incidentService = {
  async createIncident(incidentData) {
    const supabase = getSupabase();
    const user = authService.getUser();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };
    if (!user) return { data: null, error: 'Usuario no autenticado' };

    if (!INCIDENT_TYPES.includes(incidentData.type)) {
      return { data: null, error: 'Tipo de incidencia inválido' };
    }

    if (incidentData.severity && !INCIDENT_SEVERITIES.includes(incidentData.severity)) {
      return { data: null, error: 'Severidad inválida' };
    }

    const { data, error } = await supabase
      .from('incidents')
      .insert({
        ...incidentData,
        created_by: user.id,
        status: 'active'
      })
      .select()
      .single();

    return { data, error };
  },

  async getIncidents(filters = {}) {
    const supabase = getSupabase();
    if (!supabase) return { data: [], error: 'Supabase no configurado' };

    let query = supabase
      .from('incidents')
      .select(`
        *,
        routes:route_id (id, code, name),
        route_variants:variant_id (id, name)
      `)
      .order('created_at', { ascending: false });

    if (filters.routeId) {
      query = query.eq('route_id', filters.routeId);
    }

    if (filters.variantId) {
      query = query.eq('variant_id', filters.variantId);
    }

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.activeOnly) {
      const now = new Date().toISOString();
      query = query.eq('status', 'active').or(`expires_at.is.null,expires_at.gt.${now}`);
    }

    const { data, error } = await query;
    return { data: data || [], error };
  },

  async getIncidentById(id) {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };

    const { data, error } = await supabase
      .from('incidents')
      .select(`
        *,
        routes:route_id (id, code, name),
        route_variants:variant_id (id, name)
      `)
      .eq('id', id)
      .single();

    return { data, error };
  },

  async updateIncident(id, updates) {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };

    if (updates.status && !INCIDENT_STATUSES.includes(updates.status)) {
      return { data: null, error: 'Estado inválido' };
    }

    if (updates.severity && !INCIDENT_SEVERITIES.includes(updates.severity)) {
      return { data: null, error: 'Severidad inválida' };
    }

    const { data, error } = await supabase
      .from('incidents')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  async expireIncident(id) {
    return this.updateIncident(id, { status: 'expired' });
  },

  async resolveIncident(id) {
    return this.updateIncident(id, { status: 'resolved' });
  },

  async getActiveIncidentsForRoute(routeId) {
    const supabase = getSupabase();
    if (!supabase) return { data: [], error: 'Supabase no configurado' };

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('route_id', routeId)
      .eq('status', 'active')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('severity', { ascending: false });

    return { data: data || [], error };
  },

  INCIDENT_TYPES,
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES
};