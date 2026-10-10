import { getSupabase } from './supabase.js';
import { authService } from './auth.js';

export const REPORT_TYPES = [
  'accident',
  'traffic',
  'breakdown',
  'no_show',
  'suspended',
  'detour',
  'incorrect_info',
  'incorrect_stop',
  'incorrect_route',
  'incorrect_eta',
  'other'
];

export const REPORT_STATUSES = ['pending', 'confirmed', 'rejected', 'expired', 'resolved'];

export const reportService = {
  async createReport(reportData) {
    const supabase = getSupabase();
    const user = authService.getUser();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };
    if (!user) return { data: null, error: 'Usuario no autenticado' };

    if (!REPORT_TYPES.includes(reportData.type)) {
      return { data: null, error: 'Tipo de reporte inválido' };
    }

    const { data, error } = await supabase
      .from('reports')
      .insert({
        ...reportData,
        user_id: user.id,
        status: 'pending'
      })
      .select()
      .single();

    return { data, error };
  },

  async getReports(filters = {}) {
    const supabase = getSupabase();
    if (!supabase) return { data: [], error: 'Supabase no configurado' };

    let query = supabase
      .from('reports')
      .select(`
        *,
        profiles:user_id (id, nombre, email),
        routes:route_id (id, code, name)
      `)
      .order('created_at', { ascending: false });

    if (filters.routeId) {
      query = query.eq('route_id', filters.routeId);
    }

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters.since) {
      query = query.gte('created_at', filters.since);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    return { data: data || [], error };
  },

  async getReportById(id) {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };

    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        profiles:user_id (id, nombre, email),
        routes:route_id (id, code, name)
      `)
      .eq('id', id)
      .single();

    return { data, error };
  },

  async updateReportStatus(id, status, reviewedBy = null) {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };

    if (!REPORT_STATUSES.includes(status)) {
      return { data: null, error: 'Estado inválido' };
    }

    const updates = {
      status,
      reviewed_at: new Date().toISOString()
    };

    if (reviewedBy) {
      updates.reviewed_by = reviewedBy;
    }

    const { data, error } = await supabase
      .from('reports')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  async getUserReports(userId) {
    const supabase = getSupabase();
    if (!supabase) return { data: [], error: 'Supabase no configurado' };

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return { data: data || [], error };
  },

  async checkDuplicateReport(routeId, type, location, withinMinutes = 30) {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };

    const since = new Date(Date.now() - withinMinutes * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('reports')
      .select('id, description, created_at')
      .eq('route_id', routeId)
      .eq('type', type)
      .gte('created_at', since)
      .in('status', ['pending', 'confirmed'])
      .limit(1);

    return { data: data?.[0] || null, error };
  },

  REPORT_TYPES,
  REPORT_STATUSES
};