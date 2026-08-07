import silverstoneTrackData from '../../data/tracks/silverstone.json';


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


const tracks = {
  silverstone: convertPointArraysToObjects(silverstoneTrackData),
};


export function getTrackById(trackId) {
  return tracks[trackId];
}
