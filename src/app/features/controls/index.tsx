import { useCanvasWorkerContext } from "../canvas/useCanvasContext";
import ExportVideoButton from "../export-video";

function ShapeControls() {
  const appContext = useCanvasWorkerContext();
  return (
    <div className="w-[200px] rounded-2xl border border-gray-300 bg-white p-2">
      <ExportVideoButton />
      <input type="color" name="" id="" />
    </div>
  );
}

export default ShapeControls;
