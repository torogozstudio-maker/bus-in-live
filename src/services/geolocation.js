import { eventBus } from '../utils/eventBus.js';

export const GEOLOCATION_EVENTS = {
  POSITION: 'geolocation:position',
  ERROR: 'geolocation:error',
  PERMISSION_CHANGED: 'geolocation:permission_changed',
  TRACKING_STARTED: 'geolocation:tracking_started',
  TRACKING_STOPPED: 'geolocation:tracking_stopped'
};

let watchId = null;
let currentPosition = null;
let isTracking = false;
let trackingOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 5000
};
let permissionState = 'prompt';

async function checkPermission() {
  if (!navigator.permissions) return 'prompt';
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    permissionState = status.state;
    status.onchange = () => {
      permissionState = status.state;
      eventBus.emit(GEOLOCATION_EVENTS.PERMISSION_CHANGED, status.state);
    };
    return status.state;
  } catch {
    return 'prompt';
  }
}

function handleSuccess(position) {
  currentPosition = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    altitude: position.coords.altitude,
    altitudeAccuracy: position.coords.altitudeAccuracy,
    heading: position.coords.heading,
    speed: position.coords.speed,
    timestamp: position.timestamp
  };
  eventBus.emit(GEOLOCATION_EVENTS.POSITION, currentPosition);
}

function handleError(error) {
  let message = 'Error al obtener la ubicación';
  switch (error.code) {
    case error.PERMISSION_DENIED:
      message = 'Permiso de ubicación denegado. Actívalo en la configuración del navegador.';
      break;
    case error.POSITION_UNAVAILABLE:
      message = 'Ubicación no disponible. Verifica el GPS e inténtalo de nuevo.';
      break;
    case error.TIMEOUT:
      message = 'Tiempo de espera agotado al obtener la ubicación.';
      break;
  }
  eventBus.emit(GEOLOCATION_EVENTS.ERROR, { code: error.code, message });
}

export const geolocationService = {
  async initialize() {
    await checkPermission();
  },

  async getCurrentPosition(options = {}) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no soportada en este navegador'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleSuccess(pos);
          resolve(currentPosition);
        },
        (err) => {
          handleError(err);
          reject(err);
        },
        { ...trackingOptions, ...options }
      );
    });
  },

  startTracking(options = {}) {
    if (isTracking) return;

    if (!navigator.geolocation) {
      eventBus.emit(GEOLOCATION_EVENTS.ERROR, { code: -1, message: 'Geolocalización no soportada' });
      return;
    }

    isTracking = true;
    watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      { ...trackingOptions, ...options }
    );

    eventBus.emit(GEOLOCATION_EVENTS.TRACKING_STARTED);
  },

  stopTracking() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    isTracking = false;
    eventBus.emit(GEOLOCATION_EVENTS.TRACKING_STOPPED);
  },

  isTracking() {
    return isTracking;
  },

  getCurrentPosition() {
    return currentPosition;
  },

  getPermissionState() {
    return permissionState;
  },

  setOptions(options) {
    trackingOptions = { ...trackingOptions, ...options };
    if (isTracking) {
      this.stopTracking();
      this.startTracking();
    }
  },

  GEOLOCATION_EVENTS
};