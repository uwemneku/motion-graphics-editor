import { proxy } from "comlink";
import { useCanvasWorkerContext } from "../canvas/useCanvasContext";

function ShapeControls() {
  const appContext = useCanvasWorkerContext();
  return (
    <div className="w-[200px] rounded-2xl border border-gray-300 bg-white p-2">
      <button
        className="flex gap-2 rounded-lg bg-blue-400 p-2 text-xs font-semibold text-white"
        onClick={async () => {
          const url = await appContext.app?.exportToVideo(
            proxy((n: number) => {
              console.log({ n });
            }),
          );
          // window.open(url, "_blank");
        }}
      >
        <p>Export</p>
        <div className="size-2 rounded-full border-2" />
      </button>
    </div>
  );
}

export default ShapeControls;
