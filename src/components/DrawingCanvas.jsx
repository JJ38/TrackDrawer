import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import './DrawingCanvas.css';


const DrawingCanvas = forwardRef(function DrawingCanvas(props, forwardedRef) {
  const { onStrokeComplete } = props;

  const canvasElementRef = useRef(null);
  const capturedPointsRef = useRef([]);
  const isDrawingRef = useRef(false);
  const hasFinishedStrokeRef = useRef(false);
  const previousDisplaySizeRef = useRef({ width: 0, height: 0 });

  function draw() {
    const canvasElement = canvasElementRef.current;
    const context = canvasElement.getContext('2d');
    const canvasWidth = canvasElement.clientWidth;
    const canvasHeight = canvasElement.clientHeight;

    context.clearRect(0, 0, canvasWidth, canvasHeight);

    const points = capturedPointsRef.current;

    if (points.length < 2) {
      return;
    }

    context.strokeStyle = '#1f6feb';
    context.lineWidth = 3;
    context.lineJoin = 'round';
    context.lineCap = 'round';

    context.beginPath();
    context.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      context.lineTo(points[i].x, points[i].y);
    }

    context.stroke();
  }


  function resizeCanvasToContainer() {
    const canvasElement = canvasElementRef.current;
    const devicePixelRatio = window.devicePixelRatio || 1;
    const newDisplayWidth = canvasElement.clientWidth;
    const newDisplayHeight = canvasElement.clientHeight;
    const previousDisplayWidth = previousDisplaySizeRef.current.width;

    if (previousDisplayWidth > 0 && capturedPointsRef.current.length > 0) {
      const scaleFactor = newDisplayWidth / previousDisplayWidth;

      for (let i = 0; i < capturedPointsRef.current.length; i++) {
        capturedPointsRef.current[i] = {
          x: capturedPointsRef.current[i].x * scaleFactor,
          y: capturedPointsRef.current[i].y * scaleFactor,
        };
      }
    }

    canvasElement.width = newDisplayWidth * devicePixelRatio;
    canvasElement.height = newDisplayHeight * devicePixelRatio;

    const context = canvasElement.getContext('2d');
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    previousDisplaySizeRef.current = { width: newDisplayWidth, height: newDisplayHeight };

    draw();
  }


  useEffect(() => {
    resizeCanvasToContainer();

    window.addEventListener('resize', resizeCanvasToContainer);

    return function cleanup() {
      window.removeEventListener('resize', resizeCanvasToContainer);
    };
  }, []);


  function getRelativePosition(event) {
    const canvasElement = canvasElementRef.current;
    const boundingRectangle = canvasElement.getBoundingClientRect();

    return {
      x: event.clientX - boundingRectangle.left,
      y: event.clientY - boundingRectangle.top,
    };
  }


  function handlePointerDown(event) {
    if (hasFinishedStrokeRef.current) {
      return;
    }

    try {
      canvasElementRef.current.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is a nice-to-have (keeps the stroke going if the
      // pointer briefly leaves the canvas bounds) but must not block drawing
      // if the browser refuses to grant it.
    }

    isDrawingRef.current = true;
    capturedPointsRef.current = [getRelativePosition(event)];

    draw();
  }


  function handlePointerMove(event) {
    if (!isDrawingRef.current) {
      return;
    }

    capturedPointsRef.current.push(getRelativePosition(event));
    draw();
  }


  function handlePointerUp() {
    if (!isDrawingRef.current) {
      return;
    }

    isDrawingRef.current = false;

    if (capturedPointsRef.current.length >= 3) {
      hasFinishedStrokeRef.current = true;
      onStrokeComplete();
    } else {
      capturedPointsRef.current = [];
      draw();
    }
  }


  useImperativeHandle(forwardedRef, () => {
    return {
      getPoints() {
        return capturedPointsRef.current.slice();
      },
      clear() {
        capturedPointsRef.current = [];
        isDrawingRef.current = false;
        hasFinishedStrokeRef.current = false;
        draw();
      },
    };
  });

  return (
    <canvas
      ref={canvasElementRef}
      className="drawing-canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  );
});


export default DrawingCanvas;
