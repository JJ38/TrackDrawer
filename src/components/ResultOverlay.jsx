import './ResultOverlay.css';


function buildClosedPathData(points) {
  let pathData = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    pathData += ` L ${points[i].x} ${points[i].y}`;
  }

  pathData += ' Z';

  return pathData;
}


function calculateMaximumExtent(pointSets) {
  let maximumExtent = 0;

  for (let setIndex = 0; setIndex < pointSets.length; setIndex++) {
    const points = pointSets[setIndex];

    for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
      const point = points[pointIndex];
      const extentX = Math.abs(point.x);
      const extentY = Math.abs(point.y);

      maximumExtent = Math.max(maximumExtent, extentX, extentY);
    }
  }

  return maximumExtent;
}


function ResultOverlay(props) {
  const { trackPoints, userPoints } = props;

  const maximumExtent = calculateMaximumExtent([trackPoints, userPoints]);
  const paddedExtent = maximumExtent * 1.15;
  const viewBoxValue = `${-paddedExtent} ${-paddedExtent} ${paddedExtent * 2} ${paddedExtent * 2}`;

  const trackPathData = buildClosedPathData(trackPoints);
  const userPathData = buildClosedPathData(userPoints);

  return (
    <svg className="result-overlay" viewBox={viewBoxValue} preserveAspectRatio="xMidYMid meet">
      <path d={trackPathData} className="track-path" />
      <path d={userPathData} className="user-path" />
    </svg>
  );
}


export default ResultOverlay;
