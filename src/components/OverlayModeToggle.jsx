import './OverlayModeToggle.css';


function OverlayModeToggle(props) {
  const { overlayMode, onOverlayModeChange } = props;

  function handleTrackFixedClick() {
    onOverlayModeChange('track-fixed');
  }

  function handleDrawingFixedClick() {
    onOverlayModeChange('drawing-fixed');
  }

  return (
    <div className="overlay-mode-toggle">
      <button
        type="button"
        className={overlayMode === 'track-fixed' ? 'overlay-mode-option overlay-mode-option-active' : 'overlay-mode-option'}
        onClick={handleTrackFixedClick}
      >
        Track stays fixed
      </button>

      <button
        type="button"
        className={overlayMode === 'drawing-fixed' ? 'overlay-mode-option overlay-mode-option-active' : 'overlay-mode-option'}
        onClick={handleDrawingFixedClick}
      >
        Drawing stays fixed
      </button>
    </div>
  );
}


export default OverlayModeToggle;
