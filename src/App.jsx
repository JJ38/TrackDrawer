import { useRef, useState } from 'react';

import Controls from './components/Controls';
import DrawingCanvas from './components/DrawingCanvas';
import OverlayModeToggle from './components/OverlayModeToggle';
import ResultOverlay from './components/ResultOverlay';
import TrackSelect from './components/TrackSelect';
import { getAllTracks, getTrackById } from './data/tracks';
import { calculateScore } from './scoring/score';
import { createShareImageBlob } from './sharing/createShareImageBlob';
import './App.css';


const COPY_STATUS_RESET_DELAY_IN_MILLISECONDS = 2500;

const COPY_BUTTON_LABEL_BY_STATUS = {
  idle: 'Copy Image',
  copying: 'Copying…',
  copied: 'Copied!',
  error: 'Copy failed',
};


function compareTracksByName(firstTrack, secondTrack) {
  return firstTrack.name.localeCompare(secondTrack.name);
}


function getScoreMessage(percentageScore) {
  if (percentageScore >= 90) {
    return 'Incredible!';
  }

  if (percentageScore >= 75) {
    return 'Pretty close!';
  }

  if (percentageScore >= 50) {
    return 'Not bad.';
  }

  return 'Keep practicing!';
}


function App() {
  const drawingCanvasRef = useRef(null);
  const copyStatusTimeoutRef = useRef(null);
  const [screenState, setScreenState] = useState('selecting');
  const [activeTrackId, setActiveTrackId] = useState(null);
  const [canSubmitDrawing, setCanSubmitDrawing] = useState(false);
  const [scoreResult, setScoreResult] = useState(null);
  const [overlayMode, setOverlayMode] = useState('track-fixed');
  const [copyImageStatus, setCopyImageStatus] = useState('idle');

  const allTracks = getAllTracks().sort(compareTracksByName);
  const activeTrack = activeTrackId ? getTrackById(activeTrackId) : null;

  let displayedTrackPoints = null;
  let displayedUserPoints = null;

  if (scoreResult) {
    if (overlayMode === 'drawing-fixed') {
      displayedTrackPoints = scoreResult.alignedTrackPoints;
      displayedUserPoints = scoreResult.centeredUserPoints;
    } else {
      displayedTrackPoints = scoreResult.centeredTrackPoints;
      displayedUserPoints = scoreResult.alignedUserPoints;
    }
  }

  function handleSelectTrack(trackId) {
    setActiveTrackId(trackId);
    setCanSubmitDrawing(false);
    setScoreResult(null);
    setScreenState('drawing');
  }

  function handleChangeTrackClick() {
    clearCopyStatusTimeout();
    setCopyImageStatus('idle');
    setActiveTrackId(null);
    setCanSubmitDrawing(false);
    setScoreResult(null);
    setScreenState('selecting');
  }

  function handleStrokeComplete() {
    setCanSubmitDrawing(true);
  }

  function handleClearClick() {
    drawingCanvasRef.current.clear();
    setCanSubmitDrawing(false);
  }

  function handleDoneClick() {
    const userPoints = drawingCanvasRef.current.getPoints();
    const result = calculateScore(userPoints, activeTrack.points);

    setScoreResult(result);
    setScreenState('result');
  }

  function handleTryAgainClick() {
    clearCopyStatusTimeout();
    setCopyImageStatus('idle');
    setCanSubmitDrawing(false);
    setScoreResult(null);
    setScreenState('drawing');
  }

  function handleOverlayModeChange(nextOverlayMode) {
    setOverlayMode(nextOverlayMode);
  }

  function clearCopyStatusTimeout() {
    if (copyStatusTimeoutRef.current) {
      clearTimeout(copyStatusTimeoutRef.current);
      copyStatusTimeoutRef.current = null;
    }
  }

  function scheduleCopyStatusReset() {
    clearCopyStatusTimeout();

    copyStatusTimeoutRef.current = setTimeout(function resetCopyStatus() {
      setCopyImageStatus('idle');
    }, COPY_STATUS_RESET_DELAY_IN_MILLISECONDS);
  }

  async function handleCopyImageClick() {
    clearCopyStatusTimeout();
    setCopyImageStatus('copying');

    if (!window.ClipboardItem || !navigator.clipboard || !navigator.clipboard.write) {
      setCopyImageStatus('error');
      scheduleCopyStatusReset();
      return;
    }

    try {
      const imageBlobPromise = createShareImageBlob({
        trackPoints: displayedTrackPoints,
        userPoints: displayedUserPoints,
        trackName: activeTrack.name,
        percentageScore: scoreResult.percentageScore,
      });

      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': imageBlobPromise })]);

      setCopyImageStatus('copied');
    } catch (error) {
      console.error('Failed to copy the result image.', error);
      setCopyImageStatus('error');
    }

    scheduleCopyStatusReset();
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>TrackDrawer</h1>

        {screenState === 'selecting' && <p>Choose a circuit</p>}
        {screenState === 'drawing' && <p>Draw: {activeTrack.name}</p>}
        {screenState === 'result' && <p>{activeTrack.name} — Result</p>}
      </header>

      <main className="app-main">
        {screenState === 'selecting' && <TrackSelect tracks={allTracks} onSelectTrack={handleSelectTrack} />}

        {screenState !== 'selecting' && (
          <div className="canvas-area">
            {screenState === 'drawing' && (
              <DrawingCanvas ref={drawingCanvasRef} onStrokeComplete={handleStrokeComplete} />
            )}

            {screenState === 'result' && scoreResult && (
              <ResultOverlay trackPoints={displayedTrackPoints} userPoints={displayedUserPoints} />
            )}
          </div>
        )}

        {screenState === 'result' && scoreResult && (
          <OverlayModeToggle overlayMode={overlayMode} onOverlayModeChange={handleOverlayModeChange} />
        )}

        {screenState === 'drawing' && (
          <Controls
            primaryLabel="Done"
            primaryDisabled={!canSubmitDrawing}
            onPrimaryClick={handleDoneClick}
            secondaryLabel="Clear"
            onSecondaryClick={handleClearClick}
          />
        )}

        {screenState === 'result' && scoreResult && (
          <div className="result-score">
            <p className="result-percentage">{scoreResult.percentageScore}%</p>
            <p className="result-message">{getScoreMessage(scoreResult.percentageScore)}</p>

            <Controls
              primaryLabel="Try Again"
              primaryDisabled={false}
              onPrimaryClick={handleTryAgainClick}
              secondaryLabel={COPY_BUTTON_LABEL_BY_STATUS[copyImageStatus]}
              secondaryDisabled={copyImageStatus === 'copying'}
              onSecondaryClick={handleCopyImageClick}
            />
          </div>
        )}

        {screenState !== 'selecting' && (
          <button type="button" className="change-track-link" onClick={handleChangeTrackClick}>
            Choose a different track
          </button>
        )}
      </main>

      <footer className="app-footer">
        <p>Track data © OpenStreetMap contributors, licensed under ODbL</p>
      </footer>
    </div>
  );
}


export default App;
