import { Canvas, Rect } from "fabric";
import { useEffect, useRef } from "react";

/**
 * Simple Fabric.js sample component.
 * Renders a canvas and adds a red rounded rectangle when mounted.
 */
export default function FabricSample() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<Canvas | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // create fabric canvas
    const fabricCanvas = new Canvas(canvasRef.current, {
      backgroundColor: "#fff",
      width: canvasRef.current.clientWidth,
      height: canvasRef.current.clientHeight,
      preserveObjectStacking: true,
    });

    fabricRef.current = fabricCanvas;

    // create a rounded rectangle
    const rect = new Rect({
      left: 100,
      top: 80,
      fill: "#ef4444", // red-500
      width: 200,
      height: 120,
      rx: 12,
      ry: 12,
      stroke: "#7f1d1d",
      strokeWidth: 2,
      selectable: true,
    });

    fabricCanvas.add(rect);
    fabricCanvas.setActiveObject(rect);
    fabricCanvas.renderAll();

    return () => {
      // cleanup
      fabricCanvas.clear();
      fabricCanvas.dispose?.();
      fabricRef.current = null;
    };
  }, []);

  return (
    <div className="h-full w-full">
      <canvas ref={canvasRef} style={{ border: "1px solid #e5e7eb" }} className="h-full w-full" />
    </div>
  );
}
