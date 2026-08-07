import { centerPoints } from './geometry';
import { resampleClosedLoop } from './resample';
import { findBestAlignment, applyAlignment } from './align';


const TRACK_POINT_COUNT = 200;

// This factor has not been calibrated against real user attempts yet — it
// controls how quickly the score drops as the residual shape error grows,
// relative to the track's own average radius. Revisit once real drawings exist.
const SCORE_SCALE_FACTOR = 0.6;


export function calculateScore(rawUserPoints, trackPoints) {
  const resampledUserPoints = resampleClosedLoop(rawUserPoints, TRACK_POINT_COUNT);
  const centeredTrackPoints = centerPoints(trackPoints);
  const centeredUserPoints = centerPoints(resampledUserPoints);

  const bestAlignment = findBestAlignment(centeredTrackPoints, centeredUserPoints);
  const alignedUserPoints = applyAlignment(centeredUserPoints, bestAlignment);

  const averageTrackRadius = calculateAverageRadius(centeredTrackPoints);
  const normalizedResidual = bestAlignment.residualError / averageTrackRadius;
  const rawScore = 100 * Math.max(0, 1 - normalizedResidual / SCORE_SCALE_FACTOR);
  const percentageScore = Math.min(100, Math.round(rawScore * 10) / 10);

  return {
    percentageScore,
    centeredTrackPoints,
    alignedUserPoints,
  };
}


function calculateAverageRadius(points) {
  let sumOfRadii = 0;

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    sumOfRadii += Math.sqrt(point.x * point.x + point.y * point.y);
  }

  return sumOfRadii / points.length;
}
