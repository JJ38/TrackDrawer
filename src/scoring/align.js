function buildReversedPoints(points) {
  const reversedPoints = [];

  for (let i = points.length - 1; i >= 0; i--) {
    reversedPoints.push(points[i]);
  }

  return reversedPoints;
}


function buildOffsetPoints(points, offset) {
  const pointCount = points.length;
  const offsetPoints = [];

  for (let i = 0; i < pointCount; i++) {
    offsetPoints.push(points[(i + offset) % pointCount]);
  }

  return offsetPoints;
}


function transformPoints(points, rotationAngle, scale) {
  const cosine = Math.cos(rotationAngle);
  const sine = Math.sin(rotationAngle);
  const transformedPoints = [];

  for (let i = 0; i < points.length; i++) {
    const point = points[i];

    transformedPoints.push({
      x: scale * (point.x * cosine - point.y * sine),
      y: scale * (point.x * sine + point.y * cosine),
    });
  }

  return transformedPoints;
}


// Closed-form similarity (rotation + uniform scale, no reflection) that best maps
// candidatePoints onto trackPoints, treating each point pair as complex numbers.
// This intentionally excludes reflection, since a mirrored drawing should not
// score as well as a correctly-oriented one.
function computeSimilarityAlignment(trackPoints, candidatePoints) {
  let sumRealPart = 0;
  let sumImaginaryPart = 0;
  let sumCandidateSquaredMagnitude = 0;

  for (let i = 0; i < trackPoints.length; i++) {
    const trackPoint = trackPoints[i];
    const candidatePoint = candidatePoints[i];

    sumRealPart += candidatePoint.x * trackPoint.x + candidatePoint.y * trackPoint.y;
    sumImaginaryPart += candidatePoint.x * trackPoint.y - candidatePoint.y * trackPoint.x;
    sumCandidateSquaredMagnitude += candidatePoint.x * candidatePoint.x + candidatePoint.y * candidatePoint.y;
  }

  const rotationAngle = Math.atan2(sumImaginaryPart, sumRealPart);
  const complexMagnitude = Math.sqrt(sumRealPart * sumRealPart + sumImaginaryPart * sumImaginaryPart);
  const scale = sumCandidateSquaredMagnitude > 0 ? complexMagnitude / sumCandidateSquaredMagnitude : 0;

  return { rotationAngle, scale };
}


function calculateResidualError(trackPoints, candidatePoints, rotationAngle, scale) {
  const transformedPoints = transformPoints(candidatePoints, rotationAngle, scale);
  let sumSquaredError = 0;

  for (let i = 0; i < trackPoints.length; i++) {
    const differenceX = trackPoints[i].x - transformedPoints[i].x;
    const differenceY = trackPoints[i].y - transformedPoints[i].y;

    sumSquaredError += differenceX * differenceX + differenceY * differenceY;
  }

  return Math.sqrt(sumSquaredError / trackPoints.length);
}


// trackPoints and userPoints must already be the same length and centered on
// their own centroids. The user's start point along the loop and their drawing
// direction (clockwise or counterclockwise) are both free, so every cyclic
// offset is tried in both the original and reversed point order, and the
// combination with the lowest residual error is kept.
export function findBestAlignment(trackPoints, userPoints) {
  const reversedUserPoints = buildReversedPoints(userPoints);
  const directionCandidates = [userPoints, reversedUserPoints];

  let bestResidualError = Infinity;
  let bestRotationAngle = 0;
  let bestScale = 1;
  let bestOffset = 0;
  let bestReversed = false;

  for (let directionIndex = 0; directionIndex < directionCandidates.length; directionIndex++) {
    const directionPoints = directionCandidates[directionIndex];

    for (let offset = 0; offset < directionPoints.length; offset++) {
      const candidatePoints = buildOffsetPoints(directionPoints, offset);
      const alignment = computeSimilarityAlignment(trackPoints, candidatePoints);
      const residualError = calculateResidualError(trackPoints, candidatePoints, alignment.rotationAngle, alignment.scale);

      if (residualError < bestResidualError) {
        bestResidualError = residualError;
        bestRotationAngle = alignment.rotationAngle;
        bestScale = alignment.scale;
        bestOffset = offset;
        bestReversed = directionIndex === 1;
      }
    }
  }

  return {
    residualError: bestResidualError,
    rotationAngle: bestRotationAngle,
    scale: bestScale,
    offset: bestOffset,
    reversed: bestReversed,
  };
}


// Reconstructs the user's points, positioned in the track's coordinate frame,
// using the offset/direction/rotation/scale chosen by findBestAlignment. Used
// to render the result overlay.
export function applyAlignment(userPoints, alignmentResult) {
  const orderedPoints = alignmentResult.reversed ? buildReversedPoints(userPoints) : userPoints;
  const candidatePoints = buildOffsetPoints(orderedPoints, alignmentResult.offset);

  return transformPoints(candidatePoints, alignmentResult.rotationAngle, alignmentResult.scale);
}


// The inverse of applyAlignment's rotation/scale, applied to the track points
// instead of the user's points. Since reordering (offset/reversed) only
// changes which array index corresponds to which point and not the shape's
// position in the plane, undoing just the rotation and scale is enough to
// place the track directly on top of the user's original, untransformed
// drawing — used by the "keep drawing fixed" overlay mode.
export function applyInverseAlignment(trackPoints, alignmentResult) {
  const inverseRotationAngle = -alignmentResult.rotationAngle;
  const inverseScale = alignmentResult.scale > 0 ? 1 / alignmentResult.scale : 1;

  return transformPoints(trackPoints, inverseRotationAngle, inverseScale);
}
