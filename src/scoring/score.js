import { centerPoints } from './geometry';
import { resampleClosedLoop } from './resample';
import { findBestAlignment, applyAlignment, applyInverseAlignment } from './align';


const TRACK_POINT_COUNT = 200;

// Controls how quickly the score drops as the residual shape error grows,
// relative to the track's own average radius. Calibrated against synthetic
// test attempts built from the real Silverstone geometry (see CLAUDE.md's
// "Scoring algorithm notes" for the methodology and resulting score bands),
// not real user drawings — revisit once real attempts exist, since a
// person's hand-drawn error pattern will not exactly match synthetic
// per-point noise.
const SCORE_SCALE_FACTOR = 0.45;


export function calculateScore(rawUserPoints, trackPoints) {
  const resampledUserPoints = resampleClosedLoop(rawUserPoints, TRACK_POINT_COUNT);
  const centeredTrackPoints = centerPoints(trackPoints);
  const centeredUserPoints = centerPoints(resampledUserPoints);

  const bestAlignment = findBestAlignment(centeredTrackPoints, centeredUserPoints);
  const alignedUserPoints = applyAlignment(centeredUserPoints, bestAlignment);
  const alignedTrackPoints = applyInverseAlignment(centeredTrackPoints, bestAlignment);

  const averageTrackRadius = calculateAverageRadius(centeredTrackPoints);
  const normalizedResidual = bestAlignment.residualError / averageTrackRadius;
  const rawScore = 100 * Math.max(0, 1 - normalizedResidual / SCORE_SCALE_FACTOR);
  const percentageScore = Math.min(100, Math.round(rawScore * 10) / 10);

  return {
    percentageScore,
    centeredTrackPoints,
    centeredUserPoints,
    alignedUserPoints,
    alignedTrackPoints,
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
