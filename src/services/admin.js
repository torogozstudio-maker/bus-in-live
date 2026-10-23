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

  async getAnalytics(rangeDays = 30) {
    const supabase = getSupabase();
    const days = Number.isFinite(rangeDays) && rangeDays > 0 ? Math.floor(rangeDays) : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Nota: NO se calcula distribución de confianza de ETA. La única columna de
    // confianza en BD es bus_observations.confidence (confianza de una observación
    // puntual, no del ETA entregado al usuario) y no existe una tabla/columna honesta
    // con la confianza de las estimaciones mostradas → se omite en lugar de inventarla.
    const empty = {
      totals: null,
      activity: null,
      coverage: null,
      reportsByState: null,
      topRoutes: null,
      rangeDays: days
    };
    if (!supabase) return empty;

    // Cada query individual tiene su propio try/catch: si una tabla no existe o falla
    // el permiso RLS, esa métrica queda null y el resto del panel sigue funcionando.
    const safeCount = async (buildQuery) => {
      try {
        const { count, error } = await buildQuery();
        if (error) return null;
        return count ?? 0;
      } catch {
        return null;
      }
    };

    const totalsPromise = (async () => {
      const [users, routes, stops, reports, incidents, tripSessions] = await Promise.all([
        safeCount(() => supabase.from('profiles').select('id', { count: 'exact', head: true })),
        safeCount(() => supabase.from('routes').select('id', { count: 'exact', head: true }).is('deleted_at', null)),
        safeCount(() => supabase.from('stops').select('id', { count: 'exact', head: true })),
        safeCount(() => supabase.from('reports').select('id', { count: 'exact', head: true })),
        safeCount(() => supabase.from('incidents').select('id', { count: 'exact', head: true })),
        safeCount(() => supabase.from('trip_sessions').select('id', { count: 'exact', head: true }))
      ]);
      if ([users, routes, stops, reports, incidents, tripSessions].every((v) => v === null)) return null;
      return { users, routes, stops, reports, incidents, tripSessions };
    })();

    const activityPromise = (async () => {
      const [reportsInRange, incidentsInRange, activeUsers] = await Promise.all([
        safeCount(() => supabase.from('reports').select('id', { count: 'exact', head: true }).gte('created_at', since)),
        safeCount(() => supabase.from('incidents').select('id', { count: 'exact', head: true }).gte('created_at', since)),
        // profiles.last_sign_in_at existe en schema.sql (se sincroniza con auth.users)
        safeCount(() => supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('last_sign_in_at', since))
      ]);
      if ([reportsInRange, incidentsInRange, activeUsers].every((v) => v === null)) return null;
      return { reportsInRange, incidentsInRange, activeUsers };
    })();

    const coveragePromise = (async () => {
      try {
        const [obsRes, approvedRes] = await Promise.all([
          supabase.from('bus_observations').select('route_id').gte('observed_at', since7d).limit(10000),
          supabase.from('routes').select('id', { count: 'exact', head: true })
            .is('deleted_at', null).eq('validation_status', 'approved')
        ]);
        if (obsRes.error || approvedRes.error) return null;
        const routeIds = new Set();
        for (const row of obsRes.data || []) {
          if (row.route_id) routeIds.add(row.route_id);
        }
        const totalRoutes = approvedRes.count ?? 0;
        return {
          routesWithObservations: routeIds.size,
          totalRoutes,
          percent: totalRoutes > 0 ? Math.round((routeIds.size / totalRoutes) * 100) : null
        };
      } catch {
        return null;
      }
    })();

    const REPORT_STATUSES = ['pending', 'confirmed', 'rejected', 'expired', 'resolved'];
    const reportsByStatePromise = (async () => {
      const counts = await Promise.all(
        REPORT_STATUSES.map((status) =>
          safeCount(() => supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', status))
        )
      );
      if (counts.every((c) => c === null)) return null;
      return REPORT_STATUSES.reduce((acc, status, i) => {
        acc[status] = counts[i];
        return acc;
      }, {});
    })();

    const topRoutesPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('route_id, routes:route_id (code, name)')
          .not('route_id', 'is', null)
          .limit(10000);
        if (error) return null;
        const byRoute = new Map();
        for (const row of data || []) {
          if (!row.route_id) continue;
          const existing = byRoute.get(row.route_id);
          if (existing) {
            existing.count += 1;
          } else {
            byRoute.set(row.route_id, {
              routeId: row.route_id,
              code: row.routes?.code || null,
              name: row.routes?.name || null,
              count: 1
            });
          }
        }
        return [...byRoute.values()].sort((a, b) => b.count - a.count).slice(0, 5);
      } catch {
        return null;
      }
    })();

    const [totals, activity, coverage, reportsByState, topRoutes] = await Promise.all([
      totalsPromise,
      activityPromise,
      coveragePromise,
      reportsByStatePromise,
      topRoutesPromise
    ]);

    return { totals, activity, coverage, reportsByState, topRoutes, rangeDays: days };
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

  async moderateReport(id, status, adminId, reason = null) {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: 'Supabase no configurado' };

    const updates = {
      status,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString()
    };
    if (reason) updates.review_reason = reason;

    const { data, error } = await supabase
      .from('reports')
      .update(updates)
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