import { appUrl } from '../utils/router.js';
import { getSupabase } from './supabase.js';
import { eventBus } from '../utils/eventBus.js';

export const AUTH_EVENTS = {
  SIGNED_IN: 'auth:signed_in',
  SIGNED_OUT: 'auth:signed_out',
  USER_UPDATED: 'auth:user_updated',
  SESSION_EXPIRED: 'auth:session_expired'
};

let currentUser = null;
let currentSession = null;
let initialized = false;

function mapUser(supabaseUser) {
  if (!supabaseUser) return null;
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || '',
    avatar: supabaseUser.user_metadata?.avatar_url || '',
    role: 'user',
    emailConfirmed: !!supabaseUser.email_confirmed_at,
    createdAt: supabaseUser.created_at,
    lastSignIn: supabaseUser.last_sign_in_at
  };
}

// El rol se lee SIEMPRE de la tabla profiles (RLS), nunca de user_metadata (que el usuario puede editar).
async function loadProfileRole() {
  const supabase = getSupabase();
  if (!supabase || !currentUser) return;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, nombre')
      .eq('id', currentUser.id)
      .maybeSingle();
    if (error) {
      console.warn('No se pudo cargar el rol del perfil:', error.message);
      return;
    }
    const newRole = data?.role ?? 'user';
    const changed = currentUser.role !== newRole;
    currentUser.role = newRole;
    if (data?.nombre && !currentUser.name) currentUser.name = data.nombre;
    if (changed) eventBus.emit(AUTH_EVENTS.USER_UPDATED, currentUser);
  } catch (err) {
    console.warn('No se pudo cargar el rol del perfil:', err);
  }
}

export const authService = {
  async initialize() {
    if (initialized) return;

    const supabase = getSupabase();
    if (!supabase) {
      console.warn('Supabase not initialized, auth will not work');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      currentSession = session;
      currentUser = mapUser(session.user);
      await loadProfileRole();
    }

    supabase.auth.onAuthStateChange((event, session) => {
      currentSession = session;
      currentUser = session ? mapUser(session.user) : null;

      switch (event) {
        case 'SIGNED_IN':
          // NO hacer await dentro del callback (puede bloquearse): diferir la carga del rol.
          setTimeout(() => loadProfileRole(), 0);
          eventBus.emit(AUTH_EVENTS.SIGNED_IN, currentUser);
          break;
        case 'SIGNED_OUT':
          eventBus.emit(AUTH_EVENTS.SIGNED_OUT);
          break;
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          setTimeout(() => loadProfileRole(), 0);
          eventBus.emit(AUTH_EVENTS.USER_UPDATED, currentUser);
          break;
      }
    });

    initialized = true;
  },

  getUser() {
    return currentUser;
  },

  getSession() {
    return currentSession;
  },

  isAuthenticated() {
    return !!currentUser;
  },

  isAdmin() {
    return currentUser?.role === 'admin';
  },

  async signUp(email, password, name) {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name
        }
      }
    });

    if (error) throw error;
    // Si la sesión es inmediata (confirmación desactivada), cargar el rol antes de resolver.
    if (data.session && data.user) {
      currentUser = mapUser(data.user);
      currentSession = data.session;
      await loadProfileRole();
    }
    return data;
  },

  async signIn(email, password) {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    // Cargar el rol antes de resolver para que la guarda de /admin ya lo vea.
    currentUser = mapUser(data.user);
    currentSession = data.session;
    await loadProfileRole();
    return data;
  },

  async signInWithGoogle() {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: appUrl('/auth/callback')
      }
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email) {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: appUrl('/reset-password')
    });

    if (error) throw error;
  },

  async updatePassword(newPassword) {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
  },

  async updateProfile(updates) {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase.auth.updateUser({
      data: updates
    });

    if (error) throw error;
    currentUser = mapUser(data.user);
    eventBus.emit(AUTH_EVENTS.USER_UPDATED, currentUser);
    return currentUser;
  },

  onAuthStateChange(callback) {
    const unsubscribe = eventBus.on(AUTH_EVENTS.SIGNED_IN, callback);
    return unsubscribe;
  }
};