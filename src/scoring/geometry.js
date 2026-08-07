export function calculateDistance(firstPoint, secondPoint) {
  const deltaX = secondPoint.x - firstPoint.x;
  const deltaY = secondPoint.y - firstPoint.y;

  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}


export function centerPoints(points) {
  let sumOfX = 0;
  let sumOfY = 0;

  for (let i = 0; i < points.length; i++) {
    sumOfX += points[i].x;
    sumOfY += points[i].y;
  }

  const centroidX = sumOfX / points.length;
  const centroidY = sumOfY / points.length;
  const centeredPoints = [];

  for (let i = 0; i < points.length; i++) {
    centeredPoints.push({
      x: points[i].x - centroidX,
      y: points[i].y - centroidY,
    });
  }

  return centeredPoints;
}
