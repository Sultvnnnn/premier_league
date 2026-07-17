import { fetchAPI } from './api.js';
import { getUser } from './auth.js';

/** @type {Record<string, object>} */
let predictionByMatchId = {};

export function getPredictionMap() {
  return predictionByMatchId;
}

export function getPredictionForMatch(matchId) {
  if (matchId == null) return null;
  return predictionByMatchId[String(matchId)] || null;
}

export function upsertPredictionCache(prediction) {
  if (prediction == null || prediction.match_id == null) return;
  predictionByMatchId = {
    ...predictionByMatchId,
    [String(prediction.match_id)]: prediction,
  };
}

export async function loadUserPredictions() {
  const user = getUser();
  if (!user?.user_id) {
    predictionByMatchId = {};
    return predictionByMatchId;
  }

  try {
    const data = await fetchAPI(`/prediction?user_id=${encodeURIComponent(user.user_id)}`);
    const map = {};
    for (const row of data || []) {
      if (row?.match_id == null) continue;
      // Keep the newest row if duplicates exist (API already ordered desc)
      const key = String(row.match_id);
      if (!map[key]) map[key] = row;
    }
    predictionByMatchId = map;
    return predictionByMatchId;
  } catch (err) {
    console.error('[Predictions] Failed to load user predictions:', err);
    predictionByMatchId = {};
    return predictionByMatchId;
  }
}

export function formatUserPrediction(prediction) {
  if (!prediction) return '';
  return `${prediction.predicted_home_score} – ${prediction.predicted_away_score}`;
}

export function getUserPredictionsList() {
  return Object.values(predictionByMatchId);
}

export function emitPredictionSaved(prediction) {
  window.dispatchEvent(new CustomEvent('prediction:saved', { detail: prediction }));
}

export function onPredictionSaved(handler) {
  window.addEventListener('prediction:saved', handler);
  return () => window.removeEventListener('prediction:saved', handler);
}
