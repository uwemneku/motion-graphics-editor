import { proxy } from "comlink";
import { useRef } from "react";
import { BiExport } from "react-icons/bi";
import { useCanvasWorkerContext } from "../canvas/useCanvasContext";

function ExportVideoButton() {
  const r = 10;
  const c = Math.PI * r * 2;
  const ref = useRef<SVGCircleElement>(null);
  const appContext = useCanvasWorkerContext();

  const exportUsingWebWorker = async () => {
    const p = (index: number) => {
      if (ref.current) {
        const progress = index * 100;
        ref.current.style.strokeDashoffset = `${((100 - progress) / 100) * c}`;
      }
    };
    const url = await appContext.app?.exportToVideo(proxy(p));
    window.open(url, "_blank");
  };

  return (
    <div className="relative">
      <div className="absolute top-0 left-0 flex size-12 items-center justify-center">
        <BiExport className="text-blue-400" size={24} onClick={exportUsingWebWorker} />
      </div>
      {/* Add an svg circle og width 24px */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none animate-spin stroke-blue-400"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle
          cx="12"
          cy="12"
          r={r}
          strokeWidth="2"
          strokeDasharray={c}
          strokeDashoffset={c}
          ref={ref}
        />
      </svg>
    </div>
  );
}

export default ExportVideoButton;
