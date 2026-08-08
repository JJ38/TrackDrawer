// Track-fixed and drawing-fixed mode render the same pair of shapes in two
// different coordinate systems (the track's authored coordinate space versus
// the user's raw canvas-pixel space), which do not share a fixed absolute
// scale — it depends on the track's geometry and the user's viewport size.
// Fixed pixel values for stroke width and dash length would therefore look
// consistent in one mode and comically thick/coarse-dashed in the other, so
// both are expressed as a ratio of the viewBox's own extent instead.
const STROKE_WIDTH_RATIO = 0.006;
const DASH_LENGTH_RATIO = 0.014;
const DASH_GAP_RATIO = 0.011;
const EXTENT_PADDING_FACTOR = 1.15;


function buildClosedPathData(points) {
  let pathData = `M ${points[0].x} ${points[0].y}`;

  for (let pointIndex = 1; pointIndex < points.length; pointIndex++) {
    pathData += ` L ${points[pointIndex].x} ${points[pointIndex].y}`;
  }

  pathData += ' Z';

  return pathData;
}


// Uses distance from the origin rather than per-axis abs(x)/abs(y) so that the
// result is rotation-invariant. Both overlay modes show the same pair of
// shapes rotated by opposite angles (track-fixed keeps the track unrotated
// and rotates the user's drawing onto it; drawing-fixed does the reverse), so
// an axis-aligned bounding box would give each mode a different extent for
// the same physical shape, making the two toggle views appear at different
// zoom levels.
function calculateMaximumExtent(pointSets) {
  let maximumExtent = 0;

  for (let setIndex = 0; setIndex < pointSets.length; setIndex++) {
    const points = pointSets[setIndex];

    for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
      const point = points[pointIndex];
      const distanceFromOrigin = Math.sqrt(point.x * point.x + point.y * point.y);

      maximumExtent = Math.max(maximumExtent, distanceFromOrigin);
    }
  }

  return maximumExtent;
}


function calculateOverlayGeometry(trackPoints, userPoints) {
  const maximumExtent = calculateMaximumExtent([trackPoints, userPoints]);
  const paddedExtent = maximumExtent * EXTENT_PADDING_FACTOR;

  return {
    paddedExtent,
    viewBoxValue: `${-paddedExtent} ${-paddedExtent} ${paddedExtent * 2} ${paddedExtent * 2}`,
    strokeWidth: paddedExtent * STROKE_WIDTH_RATIO,
    dashArrayValue: `${paddedExtent * DASH_LENGTH_RATIO} ${paddedExtent * DASH_GAP_RATIO}`,
    trackPathData: buildClosedPathData(trackPoints),
    userPathData: buildClosedPathData(userPoints),
  };
}


export { calculateOverlayGeometry };
