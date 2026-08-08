import { calculateOverlayGeometry } from '../scoring/overlayGeometry';


const OVERLAY_SIZE = 800;
const CARD_WIDTH = 800;
const CARD_HEIGHT = 1040;
const CARD_PADDING = 32;

const TRACK_PATH_COLOR = '#9aa4b2';
const USER_PATH_COLOR = '#1f6feb';
const TRACK_NAME_COLOR = '#1f2937';
const SCORE_COLOR = '#1f6feb';
const ATTRIBUTION_COLOR = '#6b7280';

const TRACK_NAME_FONT = '600 36px system-ui, sans-serif';
const SCORE_FONT = '700 72px system-ui, sans-serif';
const ATTRIBUTION_FONT = '400 18px system-ui, sans-serif';


function buildOverlaySvgMarkup(overlayGeometry) {
  const backgroundX = -overlayGeometry.paddedExtent;
  const backgroundY = -overlayGeometry.paddedExtent;
  const backgroundSize = overlayGeometry.paddedExtent * 2;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${overlayGeometry.viewBoxValue}">` +
    `<rect x="${backgroundX}" y="${backgroundY}" width="${backgroundSize}" height="${backgroundSize}" fill="#ffffff" />` +
    `<path d="${overlayGeometry.trackPathData}" fill="none" stroke="${TRACK_PATH_COLOR}" stroke-linejoin="round" ` +
    `stroke-width="${overlayGeometry.strokeWidth}" stroke-dasharray="${overlayGeometry.dashArrayValue}" />` +
    `<path d="${overlayGeometry.userPathData}" fill="none" stroke="${USER_PATH_COLOR}" stroke-linejoin="round" ` +
    `stroke-width="${overlayGeometry.strokeWidth}" opacity="0.85" />` +
    '</svg>'
  );
}


function loadImageFromSvgMarkup(svgMarkup) {
  return new Promise(function loadExecutor(resolve, reject) {
    const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml' });
    const objectUrl = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = function handleLoad() {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = function handleError() {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to render the overlay graphic.'));
    };

    image.src = objectUrl;
  });
}


function drawCard(overlayImage, trackName, percentageScore) {
  const cardCanvas = document.createElement('canvas');
  cardCanvas.width = CARD_WIDTH;
  cardCanvas.height = CARD_HEIGHT;

  const context = cardCanvas.getContext('2d');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  context.drawImage(overlayImage, 0, 0, OVERLAY_SIZE, OVERLAY_SIZE);

  context.textAlign = 'center';

  context.fillStyle = TRACK_NAME_COLOR;
  context.font = TRACK_NAME_FONT;
  context.fillText(trackName, CARD_WIDTH / 2, OVERLAY_SIZE + 60);

  context.fillStyle = SCORE_COLOR;
  context.font = SCORE_FONT;
  context.fillText(`${percentageScore}%`, CARD_WIDTH / 2, OVERLAY_SIZE + 150);

  context.fillStyle = ATTRIBUTION_COLOR;
  context.font = ATTRIBUTION_FONT;
  context.fillText('Track data © OpenStreetMap contributors, licensed under ODbL', CARD_WIDTH / 2, CARD_HEIGHT - CARD_PADDING);

  return cardCanvas;
}


function canvasToPngBlob(cardCanvas) {
  return new Promise(function toBlobExecutor(resolve, reject) {
    cardCanvas.toBlob(function handleBlob(blob) {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to generate the share image.'));
      }
    }, 'image/png');
  });
}


async function createShareImageBlob(options) {
  const { trackPoints, userPoints, trackName, percentageScore } = options;

  const overlayGeometry = calculateOverlayGeometry(trackPoints, userPoints);
  const svgMarkup = buildOverlaySvgMarkup(overlayGeometry);
  const overlayImage = await loadImageFromSvgMarkup(svgMarkup);
  const cardCanvas = drawCard(overlayImage, trackName, percentageScore);

  return canvasToPngBlob(cardCanvas);
}


export { createShareImageBlob };
