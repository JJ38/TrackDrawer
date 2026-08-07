import { useState } from 'react';

import './TrackSelect.css';


function TrackSelect(props) {
  const { tracks, onSelectTrack } = props;
  const [searchText, setSearchText] = useState('');

  const normalizedSearchText = searchText.trim().toLowerCase();
  const filteredTracks = [];

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const searchableText = (track.name + ' ' + track.location).toLowerCase();

    if (searchableText.includes(normalizedSearchText)) {
      filteredTracks.push(track);
    }
  }

  function handleSearchChange(event) {
    setSearchText(event.target.value);
  }

  function handleTrackCardClick(trackId) {
    onSelectTrack(trackId);
  }

  const trackCards = [];

  for (let i = 0; i < filteredTracks.length; i++) {
    const track = filteredTracks[i];

    trackCards.push(
      <button
        type="button"
        key={track.id}
        className="track-card"
        onClick={function handleClick() {
          handleTrackCardClick(track.id);
        }}
      >
        <span className="track-card-name">{track.name}</span>
        <span className="track-card-location">{track.location}</span>
      </button>,
    );
  }

  return (
    <div className="track-select">
      <input
        type="text"
        className="track-search-input"
        placeholder="Search tracks..."
        value={searchText}
        onChange={handleSearchChange}
      />

      <div className="track-grid">{trackCards}</div>
    </div>
  );
}


export default TrackSelect;
