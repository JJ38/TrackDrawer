const trackModules = import.meta.glob('../../data/tracks/*.json', { eager: true });


function convertPointArraysToObjects(trackData) {
  const convertedPoints = [];

  for (let i = 0; i < trackData.points.length; i++) {
    const pointArray = trackData.points[i];

    convertedPoints.push({
      x: pointArray[0],
      y: pointArray[1],
    });
  }

  return {
    ...trackData,
    points: convertedPoints,
  };
}


const modulePaths = Object.keys(trackModules);
const tracks = {};

for (let i = 0; i < modulePaths.length; i++) {
  const trackModule = trackModules[modulePaths[i]];
  const trackData = convertPointArraysToObjects(trackModule.default);

  tracks[trackData.id] = trackData;
}


export function getTrackById(trackId) {
  return tracks[trackId];
}


export function getAllTracks() {
  return Object.values(tracks);
}
