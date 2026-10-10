// Configuración de ciudad actual - permite escalar a otras ciudades
// Por defecto Santa Ana para BETA 1

export const CITY_CONFIG = {
  // Ciudad por defecto (BETA 1: Santa Ana)
  defaultCity: 'Santa Ana',
  
  // Ciudades soportadas (para futura expansión)
  supportedCities: [
    'Santa Ana',
    'San Salvador',
    'Sonsonate',
    'San Miguel',
    'La Union',
    'Usulutan',
    'Chalatenango',
    'Cuscatlan',
    'La Paz',
    'San Vicente',
    'Morazan',
    'Ahuachapan'
  ],
  
  // Obtener ciudad actual (futuro: desde localStorage, URL, o perfil usuario)
  getCurrentCity() {
    // Futuro: leer de localStorage, URL params, o perfil de usuario
    // Por ahora retorna la ciudad por defecto
    return this.defaultCity;
  },
  
  // Cambiar ciudad (futuro: persistir en localStorage)
  setCurrentCity(city) {
    if (this.supportedCities.includes(city)) {
      this.defaultCity = city;
      // localStorage.setItem('bus-in-live-city', city);
    }
  }
};

export function getCurrentCity() {
  return CITY_CONFIG.getCurrentCity();
}

export function setCurrentCity(city) {
  CITY_CONFIG.setCurrentCity(city);
}