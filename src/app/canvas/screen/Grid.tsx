import { Line } from "react-konva";

interface GridProps {
  width: number;
  height: number;
  scale?: number;
  gridSize?: number;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
}

function Grid({
  width,
  height,
  scale = 1,
  gridSize = 20,
  strokeColor = "#e0e0e0",
  strokeWidth = 1,
  opacity = 0.3,
}: GridProps) {
  const lines = [];

  // Adjust grid size based on scale for better visibility
  const adjustedGridSize = gridSize / scale;
  const adjustedStrokeWidth = strokeWidth / scale;

  // Adjust opacity based on scale to prevent grid from becoming too dense
  const adjustedOpacity = Math.max(
    0.1,
    Math.min(opacity, opacity * (scale * 0.5)),
  );

  // Calculate extended canvas area to cover zoomed/panned views
  const extendedWidth = width * 6;
  const extendedHeight = height * 6;
  const offsetX = -width;
  const offsetY = -height;

  // Calculate how many lines we need based on extended canvas size
  const verticalLines = Math.ceil(extendedWidth / adjustedGridSize) + 1;
  const horizontalLines = Math.ceil(extendedHeight / adjustedGridSize) + 1;

  // Create vertical lines
  for (let i = 0; i < verticalLines; i++) {
    const x = offsetX + i * adjustedGridSize;
    lines.push(
      <Line
        key={`vertical-${i}`}
        points={[x, offsetY, x, offsetY + extendedHeight]}
        stroke={strokeColor}
        strokeWidth={adjustedStrokeWidth}
        opacity={adjustedOpacity}
        listening={false}
        perfectDrawEnabled={false} // Better performance
      />,
    );
  }

  // Create horizontal lines
  for (let i = 0; i < horizontalLines; i++) {
    const y = offsetY + i * adjustedGridSize;
    lines.push(
      <Line
        key={`horizontal-${i}`}
        points={[offsetX, y, offsetX + extendedWidth, y]}
        stroke={strokeColor}
        strokeWidth={adjustedStrokeWidth}
        opacity={adjustedOpacity}
        listening={false}
        perfectDrawEnabled={false} // Better performance
      />,
    );
  }

  return <>{lines}</>;
}

export default Grid;
