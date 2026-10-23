import { getSupabase } from './supabase.js';
import { authService } from './auth.js';

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

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

// Columnas que un cliente puede escribir en reports (el resto lo calcula el servidor o RLS).
const CREATABLE_REPORT_FIELDS = [
  'route_id', 'stop_id', 'type', 'location', 'description', 'evidence'
];

export const reportService = {
  async createReport(reportData) {
    const supabase = getSupabase();
    const user = authService.getUser();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };
    if (!user) return { data: null, error: 'Usuario no autenticado' };

    if (!REPORT_TYPES.includes(reportData.type)) {
      return { data: null, error: 'Tipo de reporte inválido' };
    }

    if (!reportData.description || String(reportData.description).trim().length < 10) {
      return { data: null, error: 'La descripción debe tener al menos 10 caracteres' };
    }

    // Whitelist de columnas: evita mass-assignment (reviewed_by, created_at, status, etc.)
    const safeRow = {};
    for (const field of CREATABLE_REPORT_FIELDS) {
      if (reportData[field] !== undefined) safeRow[field] = reportData[field];
    }

    const { data, error } = await supabase
      .from('reports')
      .insert({
        ...safeRow,
        description: String(reportData.description).trim().slice(0, 2000),
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
      .select('id, description, created_at, location')
      .eq('route_id', routeId)
      .eq('type', type)
      .gte('created_at', since)
      .in('status', ['pending', 'confirmed'])
      .limit(20);

    if (error) return { data: null, error };
    const candidates = data || [];

    // Con ubicación: además de ruta+tipo, exigir cercanía geográfica (~200 m).
    if (location?.coordinates) {
      const [lon, lat] = location.coordinates;
      const near = candidates.find(r => {
        if (!r.location?.coordinates) return true;
        return haversineMeters(lat, lon, r.location.coordinates[1], r.location.coordinates[0]) <= 200;
      });
      return { data: near || null, error: null };
    }

    return { data: candidates[0] || null, error: null };
  },

  REPORT_TYPES,
  REPORT_STATUSES
};