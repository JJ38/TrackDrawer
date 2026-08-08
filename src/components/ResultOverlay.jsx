import { calculateOverlayGeometry } from '../scoring/overlayGeometry';
import './ResultOverlay.css';


function ResultOverlay(props) {
  const { trackPoints, userPoints } = props;

  const overlayGeometry = calculateOverlayGeometry(trackPoints, userPoints);

  return (
    <svg className="result-overlay" viewBox={overlayGeometry.viewBoxValue} preserveAspectRatio="xMidYMid meet">
      <path
        d={overlayGeometry.trackPathData}
        className="track-path"
        style={{ strokeWidth: overlayGeometry.strokeWidth, strokeDasharray: overlayGeometry.dashArrayValue }}
      />
      <path d={overlayGeometry.userPathData} className="user-path" style={{ strokeWidth: overlayGeometry.strokeWidth }} />
    </svg>
  );
}


export default ResultOverlay;
