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
    role: supabaseUser.user_metadata?.role || 'user',
    emailConfirmed: !!supabaseUser.email_confirmed_at,
    createdAt: supabaseUser.created_at,
    lastSignIn: supabaseUser.last_sign_in_at
  };
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
    }

    supabase.auth.onAuthStateChange((event, session) => {
      currentSession = session;
      currentUser = session ? mapUser(session.user) : null;

      switch (event) {
        case 'SIGNED_IN':
          eventBus.emit(AUTH_EVENTS.SIGNED_IN, currentUser);
          break;
        case 'SIGNED_OUT':
          eventBus.emit(AUTH_EVENTS.SIGNED_OUT);
          break;
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
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
    return data;
  },

  async signInWithGoogle() {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
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
      redirectTo: `${window.location.origin}/reset-password`
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