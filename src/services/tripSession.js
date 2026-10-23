import { getSupabase } from './supabase.js';
import { authService } from './auth.js';
import { geolocationService, GEOLOCATION_EVENTS } from './geolocation.js';
import { eventBus } from '../utils/eventBus.js';

export const TRIP_EVENTS = {
  STARTED: 'trip:started',
  ENDED: 'trip:ended',
  POSITION: 'trip:position',
  ERROR: 'trip:error'
};

let currentSession = null;
let positionBuffer = [];
let flushInterval = null;
let isActive = false;
let unsubscribePosition = null;
let unsubscribeError = null;

const FLUSH_INTERVAL = 10000;
const BUFFER_SIZE = 50;

async function savePositions(positions) {
  const supabase = getSupabase();
  if (!supabase || !currentSession) return;

  const points = positions.map(pos => ({
    trip_session_id: currentSession.id,
    latitude: pos.latitude,
    longitude: pos.longitude,
    accuracy: pos.accuracy,
    speed: pos.speed,
    heading: pos.heading,
    timestamp: new Date(pos.timestamp).toISOString()
  }));

  const { error } = await supabase.from('location_points').insert(points);
  if (error) {
    console.error('Error saving positions:', error);
    eventBus.emit(TRIP_EVENTS.ERROR, { message: 'Error al guardar posiciones', error });
  }
}

function startFlushInterval() {
  flushInterval = setInterval(() => {
    if (positionBuffer.length > 0) {
      const toSave = [...positionBuffer];
      positionBuffer = [];
      savePositions(toSave);
    }
  }, FLUSH_INTERVAL);
}

function stopFlushInterval() {
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
  }
}

function onPosition(position) {
  if (!isActive || !currentSession) return;

  positionBuffer.push(position);
  eventBus.emit(TRIP_EVENTS.POSITION, { session: currentSession, position });

  if (positionBuffer.length >= BUFFER_SIZE) {
    const toSave = [...positionBuffer];
    positionBuffer = [];
    savePositions(toSave);
  }
}

function onError(error) {
  if (!isActive) return;
  eventBus.emit(TRIP_EVENTS.ERROR, error);
}

export const tripSessionService = {
  async startSession(routeId, variantId = null, isDirect = false) {
    const supabase = getSupabase();
    const user = authService.getUser();

    if (!supabase) throw new Error('Supabase no configurado');
    if (!user) throw new Error('Usuario no autenticado');
    if (isActive) throw new Error('Ya hay una sesión de viaje activa');

    const { data, error } = await supabase
      .from('trip_sessions')
      .insert({
        user_id: user.id,
        route_id: routeId,
        variant_id: variantId,
        started_at: new Date().toISOString(),
        consent: true,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;

    currentSession = data;
    isActive = true;
    positionBuffer = [];

    // Suscribirse a las posiciones GPS del servicio (emite por eventBus).
    unsubscribePosition = eventBus.on(GEOLOCATION_EVENTS.POSITION, onPosition);
    unsubscribeError = eventBus.on(GEOLOCATION_EVENTS.ERROR, onError);
    geolocationService.startTracking({ enableHighAccuracy: true, maximumAge: 5000 });

    startFlushInterval();

    eventBus.emit(TRIP_EVENTS.STARTED, currentSession);
    return currentSession;
  },

  async endSession() {
    if (!isActive || !currentSession) return null;

    geolocationService.stopTracking();
    if (unsubscribePosition) { unsubscribePosition(); unsubscribePosition = null; }
    if (unsubscribeError) { unsubscribeError(); unsubscribeError = null; }

    if (positionBuffer.length > 0) {
      await savePositions([...positionBuffer]);
      positionBuffer = [];
    }

    stopFlushInterval();

    const supabase = getSupabase();
    if (supabase) {
      await supabase
        .from('trip_sessions')
        .update({
          ended_at: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', currentSession.id);
    }

    const endedSession = currentSession;
    currentSession = null;
    isActive = false;

    eventBus.emit(TRIP_EVENTS.ENDED, endedSession);
    return endedSession;
  },

  getCurrentSession() {
    return currentSession;
  },

  isActive() {
    return isActive;
  },

  getBufferedPositions() {
    return [...positionBuffer];
  },

  async pauseSession() {
    if (!isActive) return;
    geolocationService.stopTracking();
    stopFlushInterval();
    if (positionBuffer.length > 0) {
      await savePositions([...positionBuffer]);
      positionBuffer = [];
    }
  },

  async resumeSession() {
    if (!isActive || !currentSession) return;
    if (!unsubscribePosition) {
      unsubscribePosition = eventBus.on(GEOLOCATION_EVENTS.POSITION, onPosition);
      unsubscribeError = eventBus.on(GEOLOCATION_EVENTS.ERROR, onError);
    }
    geolocationService.startTracking({ enableHighAccuracy: true, maximumAge: 5000 });
    startFlushInterval();
  },

  // Historial de viajes del usuario actual (RLS: solo los propios).
  async getHistory(limit = 50) {
    const supabase = getSupabase();
    const user = authService.getUser();

    if (!supabase) return { data: null, error: 'Supabase no configurado' };
    if (!user) return { data: null, error: 'Usuario no autenticado' };

    const { data, error } = await supabase
      .from('trip_sessions')
      .select(
        'id, route_id, variant_id, started_at, ended_at, status, ' +
        'routes:route_id (code, name, origin, destination), ' +
        'route_variants:variant_id (name, direct)'
      )
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) return { data: null, error: error.message };
    return { data: data || [], error: null };
  },

  TRIP_EVENTS
};