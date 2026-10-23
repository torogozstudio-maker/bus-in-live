import { getSupabase } from './supabase.js';
import { routeService } from './routes.js';
import { stopService } from './stops.js';

const HISTORICAL_WINDOW_DAYS = 14;
const HISTORICAL_MAX_ROWS = 1000;
const HISTORICAL_HALF_LIFE_DAYS = 7;
const HISTORICAL_BIN_WIDTH = 0.1;
const HISTORICAL_BIN_THRESHOLDS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95];
const HISTORICAL_MIN_BIN_SAMPLES = 3;
const HISTORICAL_MIN_TRAVEL_SECONDS = 1;
const HISTORICAL_MIN_SESSION_MS = 60 * 1000;
const HISTORICAL_MAX_SESSION_MS = 4 * 60 * 60 * 1000;

const FUSION_MAX_JUMP_METERS = 300;
const FUSION_MAX_SPEED_KMH = 130;
const FUSION_MAX_OFFSET_METERS = 300;
const FUSION_POSITION_NOISE_METERS = 5;
const FUSION_VELOCITY_NOISE_MPS = 2;
const FUSION_ACCEL_NOISE = 2;

export function haversineDistance(lat1, lon1, lat2, lon2) {
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

export function calculateSpeed(pos1, pos2) {
  const distance = haversineDistance(pos1.latitude, pos1.longitude, pos2.latitude, pos2.longitude);
  const timeDiff = (pos2.timestamp - pos1.timestamp) / 1000;
  if (timeDiff <= 0) return 0;
  const speedMps = distance / timeDiff;
  return speedMps * 3.6;
}

export function isValidSpeed(speedKmh) {
  return speedKmh >= 0 && speedKmh <= 120;
}

export function isPositionOnRoute(position, routeShape, thresholdMeters = 100) {
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

export function pointToLineDistance(lat, lon, lat1, lon1, lat2, lon2) {
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

function kalmanPredict1D(state, covariance, dt, accelNoise) {
  const [position, velocity] = state;
  const p00 = covariance[0][0];
  const p01 = covariance[0][1];
  const p10 = covariance[1][0];
  const p11 = covariance[1][1];

  const dt2 = dt * dt;
  const dt3 = dt2 * dt;
  const dt4 = dt2 * dt2;
  const accelVar = accelNoise * accelNoise;

  return {
    state: [position + velocity * dt, velocity],
    covariance: [
      [p00 + dt * (p10 + p01) + dt2 * p11 + (accelVar * dt4) / 4, p01 + dt * p11 + (accelVar * dt3) / 2],
      [p10 + dt * p11 + (accelVar * dt3) / 2, p11 + accelVar * dt2]
    ]
  };
}

function kalmanUpdatePosition1D(state, covariance, measurement, noiseVariance) {
  const [position, velocity] = state;
  const p00 = covariance[0][0];
  const p01 = covariance[0][1];
  const p10 = covariance[1][0];
  const p11 = covariance[1][1];

  const innovation = measurement - position;
  const innovationVariance = p00 + noiseVariance;
  const gain0 = p00 / innovationVariance;
  const gain1 = p10 / innovationVariance;

  return {
    state: [position + gain0 * innovation, velocity + gain1 * innovation],
    covariance: [
      [(1 - gain0) * p00, (1 - gain0) * p01],
      [p10 - gain1 * p00, p11 - gain1 * p01]
    ]
  };
}

function kalmanUpdateVelocity1D(state, covariance, measurement, noiseVariance) {
  const [position, velocity] = state;
  const p00 = covariance[0][0];
  const p01 = covariance[0][1];
  const p10 = covariance[1][0];
  const p11 = covariance[1][1];

  const innovation = measurement - velocity;
  const innovationVariance = p11 + noiseVariance;
  const gain0 = p01 / innovationVariance;
  const gain1 = p11 / innovationVariance;

  return {
    state: [position + gain0 * innovation, velocity + gain1 * innovation],
    covariance: [
      [p00 - gain0 * p10, p01 - gain0 * p11],
      [(1 - gain1) * p10, (1 - gain1) * p11]
    ]
  };
}

function toTimeMs(value) {
  if (value === null || value === undefined) return NaN;
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function roundOrNull(value, digits = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

export function fuseObservations(observations) {
  if (!Array.isArray(observations) || observations.length === 0) return null;

  const parsed = [];
  for (const observation of observations) {
    if (!observation) continue;
    const latitude = toFiniteNumber(observation.latitude);
    const longitude = toFiniteNumber(observation.longitude);
    const time = toTimeMs(observation.observed_at ?? observation.timestamp);
    if (latitude === null || longitude === null || !Number.isFinite(time)) continue;

    const speed = toFiniteNumber(observation.speed);
    const accuracy = toFiniteNumber(observation.accuracy);

    parsed.push({ latitude, longitude, time, speed, accuracy });
  }

  parsed.sort((a, b) => a.time - b.time);

  const kept = [];
  let discarded = 0;

  for (const point of parsed) {
    if (point.speed !== null && (point.speed < 0 || point.speed > FUSION_MAX_SPEED_KMH)) {
      discarded++;
      continue;
    }
    if (kept.length > 0) {
      const previous = kept[kept.length - 1];
      const dtSeconds = (point.time - previous.time) / 1000;
      if (dtSeconds <= 0) {
        discarded++;
        continue;
      }
      const jumpMeters = haversineDistance(previous.latitude, previous.longitude, point.latitude, point.longitude);
      if (jumpMeters > FUSION_MAX_JUMP_METERS) {
        discarded++;
        continue;
      }
      const impliedSpeedKmh = (jumpMeters / dtSeconds) * 3.6;
      if (impliedSpeedKmh > FUSION_MAX_SPEED_KMH) {
        discarded++;
        continue;
      }
    }
    kept.push(point);
  }

  if (kept.length === 0) return null;

  const last = kept[kept.length - 1];

  if (kept.length === 1) {
    return {
      latitude: last.latitude,
      longitude: last.longitude,
      position: { latitude: last.latitude, longitude: last.longitude },
      speed: last.speed !== null && Number.isFinite(last.speed) ? last.speed : 0,
      timestamp: last.time,
      samples: 1,
      discarded
    };
  }

  const origin = kept[0];
  const mPerDegLat = 111320;
  const mPerDegLon = 111320 * Math.cos((origin.latitude * Math.PI) / 180);

  const toLocal = point => [
    (point.longitude - origin.longitude) * mPerDegLon,
    (point.latitude - origin.latitude) * mPerDegLat
  ];

  const firstDt = (kept[1].time - kept[0].time) / 1000;
  const firstLocal = toLocal(kept[0]);
  const secondLocal = toLocal(kept[1]);

  const stateX = [firstLocal[0], firstDt > 0 ? (secondLocal[0] - firstLocal[0]) / firstDt : 0];
  const stateY = [firstLocal[1], firstDt > 0 ? (secondLocal[1] - firstLocal[1]) / firstDt : 0];
  const positionNoise = FUSION_POSITION_NOISE_METERS * FUSION_POSITION_NOISE_METERS;
  const velocityNoise = FUSION_VELOCITY_NOISE_MPS * FUSION_VELOCITY_NOISE_MPS;
  let covarianceX = [[positionNoise, 0], [0, velocityNoise]];
  let covarianceY = [[positionNoise, 0], [0, velocityNoise]];

  let currentStateX = stateX;
  let currentStateY = stateY;
  let previous = kept[0];

  for (let i = 1; i < kept.length; i++) {
    const point = kept[i];
    const dt = (point.time - previous.time) / 1000;
    previous = point;
    if (dt <= 0) continue;

    const local = toLocal(point);
    const measurementNoise =
      point.accuracy !== null && Number.isFinite(point.accuracy) && point.accuracy > 0
        ? Math.max(2, point.accuracy) * Math.max(2, point.accuracy)
        : positionNoise;

    const predictedX = kalmanPredict1D(currentStateX, covarianceX, dt, FUSION_ACCEL_NOISE);
    currentStateX = predictedX.state;
    covarianceX = predictedX.covariance;
    const updatedX = kalmanUpdatePosition1D(currentStateX, covarianceX, local[0], measurementNoise);
    currentStateX = updatedX.state;
    covarianceX = updatedX.covariance;

    const predictedY = kalmanPredict1D(currentStateY, covarianceY, dt, FUSION_ACCEL_NOISE);
    currentStateY = predictedY.state;
    covarianceY = predictedY.covariance;
    const updatedY = kalmanUpdatePosition1D(currentStateY, covarianceY, local[1], measurementNoise);
    currentStateY = updatedY.state;
    covarianceY = updatedY.covariance;

    const velocityMagnitude = Math.hypot(currentStateX[1], currentStateY[1]);
    if (point.speed !== null && Number.isFinite(point.speed) && velocityMagnitude > 0.5) {
      const speedMps = point.speed / 3.6;
      const directionX = currentStateX[1] / velocityMagnitude;
      const directionY = currentStateY[1] / velocityMagnitude;
      const velocityUpdateX = kalmanUpdateVelocity1D(currentStateX, covarianceX, speedMps * directionX, velocityNoise);
      currentStateX = velocityUpdateX.state;
      covarianceX = velocityUpdateX.covariance;
      const velocityUpdateY = kalmanUpdateVelocity1D(currentStateY, covarianceY, speedMps * directionY, velocityNoise);
      currentStateY = velocityUpdateY.state;
      covarianceY = velocityUpdateY.covariance;
    }
  }

  const latitude = origin.latitude + currentStateY[0] / mPerDegLat;
  const longitude = origin.longitude + currentStateX[0] / mPerDegLon;
  const speedKmh = Math.hypot(currentStateX[1], currentStateY[1]) * 3.6;

  return {
    latitude,
    longitude,
    position: { latitude, longitude },
    speed: speedKmh,
    timestamp: last.time,
    samples: kept.length,
    discarded
  };
}

export function estimateETA(currentPosition, targetStop, routeShape, observations, historicalSegments = [], historicalSamples = 0) {
  const observationList = Array.isArray(observations) ? observations : [];

  const fusionCandidates = observationList.filter(obs =>
    obs && toFiniteNumber(obs.latitude) !== null && toFiniteNumber(obs.longitude) !== null
  );
  const fused = fusionCandidates.length >= 2 ? fuseObservations(fusionCandidates) : null;
  const fusedUsable = Boolean(
    fused && fused.samples >= 2 && Number.isFinite(fused.latitude) && Number.isFinite(fused.longitude)
  );

  let effectivePosition = currentPosition;
  if (fusedUsable) {
    const offset = haversineDistance(
      Number(currentPosition.latitude),
      Number(currentPosition.longitude),
      fused.latitude,
      fused.longitude
    );
    if (Number.isFinite(offset) && offset <= FUSION_MAX_OFFSET_METERS) {
      effectivePosition = { ...currentPosition, latitude: fused.latitude, longitude: fused.longitude };
    }
  }

  const nearest = findNearestSegment(effectivePosition, routeShape);
  if (!nearest) return { etaMinutes: null, confidence: 'insufficient', warning: 'No se puede determinar la posición en la ruta' };

  const progress = calculateProgress(effectivePosition, routeShape, nearest);
  const targetProgress = targetStop.progress || 0;

  if (progress >= targetProgress) {
    return { etaMinutes: 0, confidence: 'low', warning: 'El bus ya pasó la parada' };
  }

  const remainingProgress = targetProgress - progress;
  const totalRouteDistance = calculateRouteDistance(routeShape);
  const remainingDistance = remainingProgress * totalRouteDistance;

  let speedTotal = 0;
  let speedSamples = 0;

  observationList.forEach(obs => {
    if (obs.speed && isValidSpeed(obs.speed)) {
      speedTotal += obs.speed;
      speedSamples++;
    }
  });

  const meanSpeed = speedSamples > 0 ? speedTotal / speedSamples : 0;

  const historicalSegment = historicalSegments[nearest.segmentIndex];
  const historicalSpeed =
    historicalSegment && Number.isFinite(historicalSegment.avgSpeed) && historicalSegment.avgSpeed > 0
      ? historicalSegment.avgSpeed
      : null;

  let avgSpeed = 0;
  let source = ['historical'];

  if (fusedUsable && Number.isFinite(fused.speed) && fused.speed > 0 && isValidSpeed(fused.speed)) {
    avgSpeed = fused.speed;
    source = ['realtime'];
  } else if (speedSamples > 0) {
    if (speedSamples === 1 && historicalSpeed) {
      avgSpeed = (meanSpeed + historicalSpeed) / 2;
      source = ['realtime', 'historical'];
    } else {
      avgSpeed = meanSpeed;
      source = ['realtime'];
    }
  } else if (historicalSpeed) {
    avgSpeed = historicalSpeed;
    source = ['historical'];
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
  if (speedSamples >= 5 && observationList.length >= 3) confidence = 'high';
  else if (speedSamples >= 2 || historicalSpeed) confidence = 'medium';

  if (historicalSamples >= 5) {
    if (confidence === 'low') confidence = 'medium';
    else if (confidence === 'medium') confidence = 'high';
  }

  return {
    etaMinutes: Math.max(1, etaMinutes),
    confidence,
    lastUpdated: new Date().toISOString(),
    source,
    warning: ensureEtaWarning('El tiempo es aproximado. El bus puede llegar antes o después. Se recomienda llegar a la parada unos 5 minutos antes.')
  };
}

function ensureEtaWarning(warning) {
  const text = warning || '';
  const mentionsArrival = /puede llegar antes o desp[uú]s/i.test(text);
  const mentionsEarly = /5\s*min(?:utos)?\s*antes|cinco minutos/i.test(text);

  if (mentionsArrival && mentionsEarly) return text;
  if (mentionsArrival) return `${text} Llegue 5 min antes.`;
  if (mentionsEarly) return `El bus puede llegar antes o después. ${text}`;
  if (text) return `${text} El bus puede llegar antes o después. Llegue 5 min antes.`;
  return 'El bus puede llegar antes o después. Llegue 5 min antes.';
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

function weightedPercentile(entries, percentile, key = 'value') {
  if (!Array.isArray(entries) || entries.length === 0) return null;

  const sorted = entries
    .filter(entry => entry && Number.isFinite(entry[key]) && Number.isFinite(entry.weight) && entry.weight > 0)
    .sort((a, b) => a[key] - b[key]);

  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0][key];

  const totalWeight = sorted.reduce((sum, entry) => sum + entry.weight, 0);
  const target = totalWeight * percentile;
  let accumulated = 0;

  for (const entry of sorted) {
    accumulated += entry.weight;
    if (accumulated >= target) return entry[key];
  }

  return sorted[sorted.length - 1][key];
}

function buildHistoricalSegments(routeShape, historical) {
  const empty = [];
  if (!historical || !Array.isArray(historical.segments) || historical.segments.length === 0) return empty;
  if (!routeShape || !routeShape.coordinates || routeShape.coordinates.length < 2) return empty;

  const coords = routeShape.coordinates;
  const cumulative = [0];
  for (let i = 0; i < coords.length - 1; i++) {
    const [lon1, lat1] = coords[i];
    const [lon2, lat2] = coords[i + 1];
    cumulative.push(cumulative[i] + haversineDistance(lat1, lon1, lat2, lon2));
  }

  const totalLength = cumulative[cumulative.length - 1];
  if (!(totalLength > 0)) return empty;

  const segments = new Array(coords.length - 1).fill(null);
  let hasAny = false;

  for (let i = 0; i < segments.length; i++) {
    const midProgress = (cumulative[i] + (cumulative[i + 1] - cumulative[i]) / 2) / totalLength;
    const binIndex = Math.min(
      HISTORICAL_BIN_THRESHOLDS.length - 1,
      Math.floor(midProgress / HISTORICAL_BIN_WIDTH)
    );
    const bin = historical.segments.find(segment => segment && segment.index === binIndex);
    if (
      bin &&
      bin.samples >= HISTORICAL_MIN_BIN_SAMPLES &&
      Number.isFinite(bin.avgSpeedKmh) &&
      bin.avgSpeedKmh > 0
    ) {
      segments[i] = { index: i, avgSpeed: bin.avgSpeedKmh, samples: bin.samples };
      hasAny = true;
    }
  }

  return hasAny ? segments : empty;
}

export async function calculateHistoricalETA(routeId, stopId, variantId = null) {
  const supabase = getSupabase();
  if (!supabase || !routeId) return { samples: 0 };

  const since = new Date(Date.now() - HISTORICAL_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  let observationQuery = supabase
    .from('bus_observations')
    .select('trip_session_id, route_progress, observed_at, speed, latitude, longitude')
    .eq('route_id', routeId)
    .gte('observed_at', since)
    .order('observed_at', { ascending: false })
    .limit(HISTORICAL_MAX_ROWS);

  if (variantId) observationQuery = observationQuery.eq('variant_id', variantId);

  const { data: rows, error: observationsError } = await observationQuery;
  if (observationsError || !Array.isArray(rows) || rows.length === 0) return { samples: 0 };

  let stopProgress = null;
  if (stopId) {
    let stopQuery = supabase
      .from('route_stops')
      .select('sequence')
      .eq('route_id', routeId)
      .eq('stop_id', stopId)
      .limit(50);
    if (variantId) stopQuery = stopQuery.eq('variant_id', variantId);

    const { data: stopRows } = await stopQuery;
    if (Array.isArray(stopRows) && stopRows.length > 0) {
      const minSequence = stopRows.reduce((min, row) => {
        const sequence = toFiniteNumber(row.sequence);
        return sequence === null ? min : Math.min(min, sequence);
      }, Infinity);
      if (Number.isFinite(minSequence)) {
        stopProgress = Math.min(1, Math.max(0, minSequence / 100));
      }
    }
  }

  const canComputeTravel = stopId ? stopProgress !== null : true;
  const targetThreshold = stopId
    ? stopProgress >= 0.99 ? 0.95 : stopProgress
    : 0.95;

  const sessions = new Map();
  for (const row of rows) {
    if (!row.trip_session_id) continue;
    const progress = toFiniteNumber(row.route_progress);
    const observedAt = toTimeMs(row.observed_at);
    const latitude = toFiniteNumber(row.latitude);
    const longitude = toFiniteNumber(row.longitude);
    if (progress === null || progress < 0 || progress > 1) continue;
    if (!Number.isFinite(observedAt)) continue;
    if (latitude === null || longitude === null) continue;
    if (!sessions.has(row.trip_session_id)) sessions.set(row.trip_session_id, []);
    sessions.get(row.trip_session_id).push({ time: observedAt, progress, latitude, longitude });
  }

  if (sessions.size === 0) return { samples: 0 };

  const now = Date.now();
  const travelSamples = [];
  const binEntries = HISTORICAL_BIN_THRESHOLDS.map(() => []);

  for (const points of sessions.values()) {
    points.sort((a, b) => a.time - b.time);
    if (points.length < 2) continue;

    const startTime = points[0].time;
    const endTime = points[points.length - 1].time;
    const duration = endTime - startTime;
    if (duration < HISTORICAL_MIN_SESSION_MS || duration > HISTORICAL_MAX_SESSION_MS) continue;

    const ageDays = Math.max(0, now - endTime) / (24 * 60 * 60 * 1000);
    const weight = Math.pow(0.5, ageDays / HISTORICAL_HALF_LIFE_DAYS);

    const cumulativeDistance = [0];
    for (let i = 1; i < points.length; i++) {
      const hop = haversineDistance(
        points[i - 1].latitude,
        points[i - 1].longitude,
        points[i].latitude,
        points[i].longitude
      );
      cumulativeDistance.push(cumulativeDistance[i - 1] + hop);
    }

    if (canComputeTravel) {
      let targetIndex = -1;
      for (let i = 0; i < points.length; i++) {
        if (points[i].progress >= targetThreshold) {
          targetIndex = i;
          break;
        }
      }
      if (targetIndex > 0) {
        const travelSeconds = (points[targetIndex].time - startTime) / 1000;
        if (travelSeconds >= HISTORICAL_MIN_TRAVEL_SECONDS) {
          travelSamples.push({ value: travelSeconds, weight });
        }
      }
    }

    const reachTimes = [{ time: startTime, index: 0 }];
    for (const threshold of HISTORICAL_BIN_THRESHOLDS) {
      const index = points.findIndex(point => point.progress >= threshold);
      reachTimes.push(index >= 0 ? { time: points[index].time, index } : null);
    }

    for (let bin = 0; bin < HISTORICAL_BIN_THRESHOLDS.length; bin++) {
      const start = reachTimes[bin];
      const end = reachTimes[bin + 1];
      if (!start || !end) continue;

      const travelSeconds = (end.time - start.time) / 1000;
      const distance = cumulativeDistance[end.index] - cumulativeDistance[start.index];
      if (travelSeconds < HISTORICAL_MIN_TRAVEL_SECONDS || distance <= 1) continue;

      const speedKmh = (distance / travelSeconds) * 3.6;
      if (!isValidSpeed(speedKmh)) continue;

      binEntries[bin].push({ seconds: travelSeconds, speed: speedKmh, weight });
    }
  }

  const segments = [];
  for (let bin = 0; bin < binEntries.length; bin++) {
    const entries = binEntries[bin];
    if (entries.length === 0) continue;
    segments.push({
      index: bin,
      from: bin === 0 ? 0 : HISTORICAL_BIN_THRESHOLDS[bin - 1],
      to: HISTORICAL_BIN_THRESHOLDS[bin],
      samples: entries.length,
      medianSeconds: roundOrNull(weightedPercentile(entries, 0.5, 'seconds')),
      p25Seconds: roundOrNull(weightedPercentile(entries, 0.25, 'seconds')),
      p75Seconds: roundOrNull(weightedPercentile(entries, 0.75, 'seconds')),
      avgSpeedKmh: roundOrNull(weightedPercentile(entries, 0.5, 'speed'), 1)
    });
  }

  if (travelSamples.length === 0 && segments.length === 0) return { samples: 0 };

  const median = weightedPercentile(travelSamples, 0.5);
  const p25 = weightedPercentile(travelSamples, 0.25);
  const p75 = weightedPercentile(travelSamples, 0.75);

  return {
    samples: travelSamples.length,
    observations: rows.length,
    sessions: sessions.size,
    windowDays: HISTORICAL_WINDOW_DAYS,
    stopProgress: stopId ? stopProgress : null,
    weighted: true,
    medianSeconds: roundOrNull(median),
    p25Seconds: roundOrNull(p25),
    p75Seconds: roundOrNull(p75),
    segments
  };
}

export function calculateConfidence(observations, historicalSamples = 0) {
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

  if (historicalSamples >= 5) score += 1;

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

    const loadHistorical = async () => {
      try {
        const historical = await calculateHistoricalETA(routeId, selectedStop, variantId);
        return historical && Number.isFinite(historical.samples) ? historical : { samples: 0 };
      } catch {
        return { samples: 0 };
      }
    };

    const [shapeResult, obsResult, historical] = await Promise.all([
      routeService.getRouteShape(routeId, variantId),
      routeService.getRouteObservations(routeId, variantId, new Date(Date.now() - 30 * 60 * 1000).toISOString()),
      loadHistorical()
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

    const historicalSegments = buildHistoricalSegments(routeShape, historical);
    const result = estimateETA(
      currentPosition,
      stopWithProgress,
      routeShape,
      validObservations,
      historicalSegments,
      historical.samples || 0
    );

    const hasDetour = incidents.some(i => i.type === 'detour' && i.status === 'active');
    if (hasDetour) {
      result.warning += ' Hay una desviación activa que puede afectar el tiempo.';
      if (result.confidence === 'high') result.confidence = 'medium';
    }

    if (Number.isFinite(result.etaMinutes) && result.etaMinutes > 0) {
      result.warning = ensureEtaWarning(result.warning);
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
  pointToLineDistance,
  findNearestSegment,
  calculateProgress,
  calculateRouteDistance,
  calculateConfidence,
  calculateHistoricalETA,
  fuseObservations,
  estimateETA
};