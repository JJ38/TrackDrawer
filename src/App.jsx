import { useRef, useState } from 'react';

import Controls from './components/Controls';
import DrawingCanvas from './components/DrawingCanvas';
import ResultOverlay from './components/ResultOverlay';
import TrackSelect from './components/TrackSelect';
import { getAllTracks, getTrackById } from './data/tracks';
import { calculateScore } from './scoring/score';
import './App.css';


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
  const [screenState, setScreenState] = useState('selecting');
  const [activeTrackId, setActiveTrackId] = useState(null);
  const [canSubmitDrawing, setCanSubmitDrawing] = useState(false);
  const [scoreResult, setScoreResult] = useState(null);

  const allTracks = getAllTracks().sort(compareTracksByName);
  const activeTrack = activeTrackId ? getTrackById(activeTrackId) : null;
  const trackAspectRatio = activeTrack ? activeTrack.coordinateSpace.width / activeTrack.coordinateSpace.height : 1;

  function handleSelectTrack(trackId) {
    setActiveTrackId(trackId);
    setCanSubmitDrawing(false);
    setScoreResult(null);
    setScreenState('drawing');
  }

  function handleChangeTrackClick() {
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
    setCanSubmitDrawing(false);
    setScoreResult(null);
    setScreenState('drawing');
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
          <div className="canvas-area" style={{ aspectRatio: String(trackAspectRatio) }}>
            {screenState === 'drawing' && (
              <DrawingCanvas ref={drawingCanvasRef} onStrokeComplete={handleStrokeComplete} />
            )}

            {screenState === 'result' && scoreResult && (
              <ResultOverlay
                trackPoints={scoreResult.centeredTrackPoints}
                userPoints={scoreResult.alignedUserPoints}
              />
            )}
          </div>
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

            <Controls primaryLabel="Try Again" primaryDisabled={false} onPrimaryClick={handleTryAgainClick} />
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
