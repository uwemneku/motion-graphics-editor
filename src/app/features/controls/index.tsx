import { useCanvasWorkerContext } from "../canvas/useCanvasContext";

function ShapeControls() {
  const appContext = useCanvasWorkerContext();
  return (
    <div className="w-[200px] rounded-2xl border border-gray-300 bg-white p-2">
      <button
        className="rounded-lg bg-blue-400 p-3 text-sm font-semibold"
        onClick={async () => {
          const url = await appContext.app?.export();
          window.open(url, "_blank");
        }}
      >
        Export
      </button>
    </div>
  );
}

export default ShapeControls;
