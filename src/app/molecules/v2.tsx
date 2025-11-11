import { proxy, wrap, type Remote } from "comlink";
import { useRef } from "react";
import { BiExport } from "react-icons/bi";
import type { WorkerAPI } from "../util/export-woker";
import RendererWorker from "../util/export-woker/index?worker";

const worker = new RendererWorker();
const workerProxy = wrap<Remote<WorkerAPI>>(worker);
function ExportFeature2() {
  const r = 10;
  const c = Math.PI * r * 2;
  const ref = useRef<SVGCircleElement>(null);

  const exportUsingWebWorker = async () => {
    console.time("export_worker");

    // 1920x1080
    const videoDimensions = { width: 1920, height: 1080 };

    const quality = 1; // between 0 and 1
    const scale = 1;

    const p = (index: number) => {
      if (ref.current) {
        const progress = index * 100;
        ref.current.style.strokeDashoffset = `${((100 - progress) / 100) * c}`;
      }
    };
    const canvas = document.createElement("canvas");
    canvas.width = videoDimensions.width;
    canvas.height = videoDimensions.height;

    //

    const res = await workerProxy.start(
      videoDimensions,
      { x: 0, y: 0 },
      10,
      scale,
      [],
      proxy(p),
      quality,
      // offscreen,
      // transfer(offscreen, [offscreen]),
    );
    console.log({ res });
    try {
      console.timeEnd("export_worker");

      window.open(res, "_blank");
    } catch (error) {
      console.log({ error });
    }
  };

  return (
    <div className="relative">
      <BiExport size={24} onClick={exportUsingWebWorker} color="red" />
      {/* Add an svg circle og width 24px */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none absolute -top-[25%] -left-[25%] h-[150%] w-[150%] animate-spin"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle
          cx="12"
          cy="12"
          r={r}
          stroke="red"
          strokeWidth="2"
          strokeDasharray={c}
          strokeDashoffset={c}
          ref={ref}
        />
      </svg>
    </div>
  );
}

export default ExportFeature2;
