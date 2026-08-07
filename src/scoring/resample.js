import { calculateDistance } from './geometry';


export function resampleClosedLoop(points, targetPointCount) {
  const pointCount = points.length;
  const segmentLengths = [];
  let totalLength = 0;

  for (let i = 0; i < pointCount; i++) {
    const currentPoint = points[i];
    const nextPoint = points[(i + 1) % pointCount];
    const segmentLength = calculateDistance(currentPoint, nextPoint);

    segmentLengths.push(segmentLength);
    totalLength += segmentLength;
  }

  const resampledPoints = [];
  const stepLength = totalLength / targetPointCount;
  let segmentIndex = 0;
  let lengthCoveredBeforeSegment = 0;

  for (let sampleIndex = 0; sampleIndex < targetPointCount; sampleIndex++) {
    const targetDistance = sampleIndex * stepLength;

    while (lengthCoveredBeforeSegment + segmentLengths[segmentIndex] < targetDistance) {
      lengthCoveredBeforeSegment += segmentLengths[segmentIndex];
      segmentIndex = (segmentIndex + 1) % pointCount;
    }

    const currentPoint = points[segmentIndex];
    const nextPoint = points[(segmentIndex + 1) % pointCount];
    const segmentLength = segmentLengths[segmentIndex];
    const distanceIntoSegment = targetDistance - lengthCoveredBeforeSegment;
    const interpolationFactor = segmentLength > 0 ? distanceIntoSegment / segmentLength : 0;

    resampledPoints.push({
      x: currentPoint.x + (nextPoint.x - currentPoint.x) * interpolationFactor,
      y: currentPoint.y + (nextPoint.y - currentPoint.y) * interpolationFactor,
    });
  }

  return resampledPoints;
}
