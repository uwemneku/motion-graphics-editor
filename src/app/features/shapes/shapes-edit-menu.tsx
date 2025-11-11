import { useAppSelector } from "@/app/store";

function ShapesEditMenu() {
  const selectedShapes = useAppSelector((e) => e.shapes.ids);
  const hasSelectedShape = selectedShapes.length > 0;
  if (!hasSelectedShape) return null;
  return <div className="fixed z-20">ShapesEditMenu</div>;
}

export default ShapesEditMenu;
