import { getSupabase } from './supabase.js';
import { routeService } from './routes.js';
import { stopService } from './stops.js';

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function calculateSpeed(pos1, pos2) {
  const distance = haversineDistance(pos1.latitude, pos1.longitude, pos2.latitude, pos2.longitude);
  const timeDiff = (pos2.timestamp - pos1.timestamp) / 1000;
  if (timeDiff <= 0) return 0;
  const speedMps = distance / timeDiff;
  return speedMps * 3.6;
}

function isValidSpeed(speedKmh) {
  return speedKmh >= 0 && speedKmh <= 120;
}

function isPositionOnRoute(position, routeShape, thresholdMeters = 100) {
  if (!routeShape || !routeShape.coordinates) return false;

  const coords = routeShape.coordinates;
  let minDistance = Infinity;

  for (let i = 0; i < coords.length - 1; i++) {
    const [lon1, lat1] = coords[i];
    const [lon2, lat2] = coords[i + 1];
    const dist = pointToLineDistance(position.latitude, position.longitude, lat1, lon1, lat2, lon2);
    minDistance = Math.min(minDistance, dist);
  }

  return minDistance <= thresholdMeters;
}

function pointToLineDistance(lat, lon, lat1, lon1, lat2, lon2) {
  // Proyección del punto sobre el segmento en grados, luego distancia haversine.
  const d = haversineDistance(lat1, lon1, lat2, lon2);
  if (d === 0) return haversineDistance(lat, lon, lat1, lon1);

  // Factor de conversión aproximado grados→metros para la proyección
  const latRad = lat1 * Math.PI / 180;
  const mPerDegLat = 111320;
  const mPerDegLon = 111320 * Math.cos(latRad);

  // Vector del segmento en metros
  const dx = (lon2 - lon1) * mPerDegLon;
  const dy = (lat2 - lat1) * mPerDegLat;

  // Vector punto→inicio en metros
  const px = (lon - lon1) * mPerDegLon;
  const py = (lat - lat1) * mPerDegLat;

  const segLenSq = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, (px * dx + py * dy) / segLenSq));

  const closestLat = lat1 + t * (lat2 - lat1);
  const closestLon = lon1 + t * (lon2 - lon1);

  return haversineDistance(lat, lon, closestLat, closestLon);
}

function findNearestSegment(position, routeShape) {
  if (!routeShape || !routeShape.coordinates) return null;

  const coords = routeShape.coordinates;
  let minDistance = Infinity;
  let nearestIndex = -1;

  for (let i = 0; i < coords.length - 1; i++) {
    const [lon1, lat1] = coords[i];
    const [lon2, lat2] = coords[i + 1];
    const dist = pointToLineDistance(position.latitude, position.longitude, lat1, lon1, lat2, lon2);
    if (dist < minDistance) {
      minDistance = dist;
      nearestIndex = i;
    }
  }

  return nearestIndex >= 0 ? { segmentIndex: nearestIndex, distance: minDistance } : null;
}

function calculateProgress(position, routeShape, nearestSegment) {
  if (!routeShape || !routeShape.coordinates || nearestSegment === null) return 0;

  const coords = routeShape.coordinates;
  let totalLength = 0;
  let progressLength = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const [lon1, lat1] = coords[i];
    const [lon2, lat2] = coords[i + 1];
    const segmentLength = haversineDistance(lat1, lon1, lat2, lon2);
    totalLength += segmentLength;

    if (i < nearestSegment.segmentIndex) {
      progressLength += segmentLength;
    } else if (i === nearestSegment.segmentIndex) {
      const [lon1, lat1] = coords[i];
      const [lon2, lat2] = coords[i + 1];
      const projectionDist = haversineDistance(position.latitude, position.longitude, lat1, lon1, lat2, lon2);
      progressLength += projectionDist;
    }
  }

  return totalLength > 0 ? Math.min(1, Math.max(0, progressLength / totalLength)) : 0;
}

function estimateETA(currentPosition, targetStop, routeShape, observations, historicalSegments = []) {
  const nearest = findNearestSegment(currentPosition, routeShape);
  if (!nearest) return { etaMinutes: null, confidence: 'insufficient', warning: 'No se puede determinar la posición en la ruta' };

  const progress = calculateProgress(currentPosition, routeShape, nearest);
  const targetProgress = targetStop.progress || 0;

  if (progress >= targetProgress) {
    return { etaMinutes: 0, confidence: 'low', warning: 'El bus ya pasó la parada' };
  }

  const remainingProgress = targetProgress - progress;
  const totalRouteDistance = calculateRouteDistance(routeShape);
  const remainingDistance = remainingProgress * totalRouteDistance;

  let avgSpeed = 0;
  let speedSamples = 0;

  observations.forEach(obs => {
    if (obs.speed && isValidSpeed(obs.speed)) {
      avgSpeed += obs.speed;
      speedSamples++;
    }
  });

  if (speedSamples > 0) {
    avgSpeed /= speedSamples;
  } else if (historicalSegments.length > 0) {
    const segmentIndex = nearest.segmentIndex;
    const segment = historicalSegments[segmentIndex];
    if (segment && segment.avgSpeed) {
      avgSpeed = segment.avgSpeed;
    }
  }

  if (avgSpeed <= 0) {
    return {
      etaMinutes: null,
      confidence: 'insufficient',
      warning: 'No hay datos de velocidad suficientes para estimar'
    };
  }

  const etaHours = remainingDistance / 1000 / avgSpeed;
  const etaMinutes = Math.round(etaHours * 60);

  let confidence = 'low';
  if (speedSamples >= 5 && observations.length >= 3) confidence = 'high';
  else if (speedSamples >= 2 || historicalSegments.length > 0) confidence = 'medium';

  return {
    etaMinutes: Math.max(1, etaMinutes),
    confidence,
    lastUpdated: new Date().toISOString(),
    source: speedSamples > 0 ? ['realtime'] : ['historical'],
    warning: 'El tiempo es aproximado. El bus puede llegar antes o después. Se recomienda llegar a la parada unos 5 minutos antes.'
  };
}

function calculateRouteDistance(routeShape) {
  if (!routeShape || !routeShape.coordinates) return 0;

  const coords = routeShape.coordinates;
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const [lon1, lat1] = coords[i];
    const [lon2, lat2] = coords[i + 1];
    total += haversineDistance(lat1, lon1, lat2, lon2);
  }
  return total;
}

function calculateConfidence(observations, routeShape) {
  if (!observations || observations.length === 0) return 'insufficient';

  let score = 0;
  const now = Date.now();

  observations.forEach(obs => {
    const age = (now - new Date(obs.observed_at).getTime()) / 1000 / 60;
    if (age <= 5) score += 3;
    else if (age <= 15) score += 2;
    else if (age <= 30) score += 1;

    if (obs.accuracy && obs.accuracy <= 20) score += 2;
    else if (obs.accuracy && obs.accuracy <= 50) score += 1;

    if (isValidSpeed(obs.speed)) score += 1;
  });

  if (observations.length >= 5) score += 2;
  else if (observations.length >= 2) score += 1;

  if (score >= 10) return 'high';
  if (score >= 5) return 'medium';
  if (score >= 2) return 'low';
  return 'insufficient';
}

export const etaService = {
  async calculateETA(params) {
    const { currentPosition, routeId, variantId, selectedStop, incidents = [] } = params;

    if (!currentPosition || !routeId || !selectedStop) {
      return {
        etaMinutes: null,
        confidence: 'insufficient',
        warning: 'Faltan parámetros requeridos para calcular ETA'
      };
    }

    const [shapeResult, obsResult] = await Promise.all([
      routeService.getRouteShape(routeId, variantId),
      routeService.getRouteObservations(routeId, variantId, new Date(Date.now() - 30 * 60 * 1000).toISOString())
    ]);

    const routeShape = shapeResult.data;
    const observations = obsResult.data || [];

    // bus_observations no tiene columna accuracy; filtrar solo por velocidad válida
    const validObservations = observations.filter(obs =>
      isValidSpeed(obs.speed)
    );

    const stopResult = await stopService.getStopById(selectedStop);
    const stop = stopResult.data;
    const targetProgress = stop?.route_stops?.[0] ? stop.route_stops[0].sequence / 100 : 0.5;

    const stopWithProgress = { ...stop, progress: targetProgress };

    const result = estimateETA(currentPosition, stopWithProgress, routeShape, validObservations);

    const hasDetour = incidents.some(i => i.type === 'detour' && i.status === 'active');
    if (hasDetour) {
      result.warning += ' Hay una desviación activa que puede afectar el tiempo.';
      if (result.confidence === 'high') result.confidence = 'medium';
    }

    // No sobrescribir el confidence ya calculado dentro de estimateETA
    return result;
  },

  async calculateFrequency(routeId, variantId = null) {
    const supabase = getSupabase();
    if (!supabase) return { frequency: null, confidence: 'insufficient', observations: 0 };

    let query = supabase
      .from('bus_observations')
      .select('observed_at')
      .eq('route_id', routeId)
      .gte('observed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('observed_at', { ascending: true });

    // .eq no compara contra NULL en PostgREST; usar .is() cuando variantId es null
    if (variantId) {
      query = query.eq('variant_id', variantId);
    } else {
      query = query.is('variant_id', null);
    }

    const { data: observations } = await query;

    if (!observations || observations.length < 3) {
      return { frequency: null, confidence: 'insufficient', observations: observations?.length || 0 };
    }

    const intervals = [];
    for (let i = 1; i < observations.length; i++) {
      const diff = (new Date(observations[i].observed_at) - new Date(observations[i - 1].observed_at)) / 1000 / 60;
      if (diff > 0 && diff < 120) {
        intervals.push(diff);
      }
    }

    if (intervals.length < 2) {
      return { frequency: null, confidence: 'insufficient', observations: intervals.length };
    }

    intervals.sort((a, b) => a - b);
    const median = intervals[Math.floor(intervals.length / 2)];
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    return {
      frequency: Math.round(median),
      avgFrequency: Math.round(avg),
      minFrequency: Math.round(intervals[0]),
      maxFrequency: Math.round(intervals[intervals.length - 1]),
      confidence: intervals.length >= 5 ? 'high' : intervals.length >= 3 ? 'medium' : 'low',
      observations: intervals.length,
      lastCalculated: new Date().toISOString()
    };
  },

  haversineDistance,
  calculateSpeed,
  isValidSpeed,
  isPositionOnRoute,
  findNearestSegment,
  calculateProgress,
  calculateRouteDistance,
  calculateConfidence
};