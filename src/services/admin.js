import { getSupabase } from './supabase.js';
import { authService } from './auth.js';

export const adminService = {
  async getDashboardStats() {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };

    const [
      routesResult,
      pendingRoutesResult,
      reportsResult,
      incidentsResult,
      observationsResult,
      usersResult
    ] = await Promise.all([
      supabase.from('routes').select('id', { count: 'exact' }).is('deleted_at', null).eq('validation_status', 'approved'),
      supabase.from('routes').select('id', { count: 'exact' }).is('deleted_at', null).eq('validation_status', 'pending'),
      supabase.from('reports').select('id', { count: 'exact' }).in('status', ['pending', 'confirmed']),
      supabase.from('incidents').select('id', { count: 'exact' }).eq('status', 'active'),
      supabase.from('bus_observations').select('id', { count: 'exact' }).gte('observed_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()),
      supabase.from('profiles').select('id', { count: 'exact' })
    ]);

    return {
      data: {
        activeRoutes: routesResult.count || 0,
        pendingRoutes: pendingRoutesResult.count || 0,
        openReports: reportsResult.count || 0,
        activeIncidents: incidentsResult.count || 0,
        recentObservations: observationsResult.count || 0,
        totalUsers: usersResult.count || 0
      },
      error: null
    };
  },

  async getRoutes(filters = {}) {
    const supabase = getSupabase();
    if (!supabase) return { data: [], error: 'Supabase no configurado' };

    let query = supabase
      .from('routes')
      .select(`
        *,
        route_variants (id, name, variant_type, direct, active),
        reports:reports (id, status),
        bus_observations:bus_observations (id, observed_at)
      `);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.validationStatus) {
      query = query.eq('validation_status', filters.validationStatus);
    } else {
      query = query.neq('validation_status', 'rejected');
    }

    if (filters.search) {
      query = query.or(`code.ilike.%${filters.search}%,name.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    return { data: data || [], error };
  },

  async approveRoute(id) {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };

    const { data, error } = await supabase
      .from('routes')
      .update({ validation_status: 'approved', status: 'normal', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  async rejectRoute(id, reason) {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };

    const { data, error } = await supabase
      .from('routes')
      .update({
        validation_status: 'rejected',
        rejection_reason: reason || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  async softDeleteRoute(id) {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };

    const { data, error } = await supabase
      .from('routes')
      .update({ deleted_at: new Date().toISOString(), status: 'suspended', updated_at: new Date().toISOString() })
      .eq('id', id)
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

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.routeId) {
      query = query.eq('route_id', filters.routeId);
    }

    const { data, error } = await query;
    return { data: data || [], error };
  },

  async moderateReport(id, status, adminId) {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };

    const { data, error } = await supabase
      .from('reports')
      .update({
        status,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id)
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

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.routeId) {
      query = query.eq('route_id', filters.routeId);
    }

    const { data, error } = await query;
    return { data: data || [], error };
  },

  async updateIncident(id, updates) {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };

    const { data, error } = await supabase
      .from('incidents')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  async getChangeRequests(filters = {}) {
    const supabase = getSupabase();
    if (!supabase) return { data: [], error: 'Supabase no configurado' };

    let query = supabase
      .from('route_change_requests')
      .select(`
        *,
        routes:route_id (id, code, name),
        profiles:user_id (id, nombre, email)
      `)
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    return { data: data || [], error };
  },

  async reviewChangeRequest(id, status, adminId) {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };

    const { data, error } = await supabase
      .from('route_change_requests')
      .update({
        status,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  async getDeletionRequests(filters = {}) {
    const supabase = getSupabase();
    if (!supabase) return { data: [], error: 'Supabase no configurado' };

    let query = supabase
      .from('deletion_requests')
      .select(`
        *,
        routes:route_id (id, code, name),
        profiles:user_id (id, nombre, email)
      `)
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    return { data: data || [], error };
  },

  async reviewDeletionRequest(id, status, adminId) {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };

    const { data, error } = await supabase
      .from('deletion_requests')
      .update({
        status,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  async getUsers(filters = {}) {
    const supabase = getSupabase();
    if (!supabase) return { data: [], error: 'Supabase no configurado' };

    let query = supabase
      .from('profiles')
      .select('id, email, nombre, avatar, role, created_at, last_sign_in_at')
      .order('created_at', { ascending: false });

    if (filters.role) {
      query = query.eq('role', filters.role);
    }

    const { data, error } = await query;
    return { data: data || [], error };
  },

  async updateUserRole(userId, role) {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };

    if (!['user', 'admin'].includes(role)) {
      return { data: null, error: 'Rol inválido' };
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();

    return { data, error };
  }
};