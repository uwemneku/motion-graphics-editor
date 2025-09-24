import { proxy, wrap, type Remote } from "comlink";
import { useRef } from "react";
import { BiExport } from "react-icons/bi";
import { useScreenContext } from "../context/screenContext/context";
import useTimeLine from "../hooks/useTimeLine";
import type { WorkerAPI } from "../util/export-woker";
import RendererWorker from "../util/export-woker/index?worker";

const worker = new RendererWorker();
const workerProxy = wrap<Remote<WorkerAPI>>(worker);

function ExportFeature2() {
  const r = 10;
  const c = Math.PI * r * 2;
  const ref = useRef<SVGCircleElement>(null);
  const timeline = useTimeLine((e) => e.timeline);
  const screenContext = useScreenContext();

  const exportUsingWebWorker = async () => {
    console.time("export_worker");
    const timelineState = useTimeLine.getState();
    const stage = screenContext?.getStageNode();
    if (!stage) return;
    const videoBoundary = stage?.findOne("#video-boundary");
    const videoBoundarySize = videoBoundary?.size() || {
      width: 0,
      height: 0,
    };
    const videoBoundaryPos = videoBoundary?.position() || { x: 0, y: 0 };
    const quality = 1;
    const scale =
      quality * (timelineState.videoDimensions.width / videoBoundarySize.width);

    const videoDimensions = timelineState.videoDimensions;

    timeline.seek(1);
    const nodes = timelineState.nodesIndex?.map(async (id) => {
      const nodeDetails = timelineState.nodes[id];
      const init = { ...(nodeDetails?.element?.getAttrs() || {}) };

      console.log({ init, nodeDetails });

      // scale width and height to percentage of the video dimensions
      // if (init.width) init.width = init.width * scale;
      // if (init.height) init.height = init.height * scale;
      if (init.x) init.x = (init.x - videoBoundaryPos.x) * scale;
      if (init.y) init.y = (init.y - videoBoundaryPos.y) * scale;
      // if (init.radius) init.radius = init.radius * scale;
      // if (init.strokeWidth) init.strokeWidth = init.strokeWidth * scale;
      Object.keys(init).forEach((key) => {
        if (["x", "y", "scaleX", "scaleY"].includes(key)) return;

        if (typeof init[key] === "number") {
          console.log(key, init[key], typeof init[key], key in []);
          if (init?.[key] !== undefined) {
            init[key] = init[key] * scale;
          }
        }
      });
      // if image, convert to bitmap

      const nodeData = nodeDetails?.data || {};
      if ("src" in nodeData) {
        // const imgBlob = await (await fetch(nodeDetails?.data?.src)).blob();
        const img = new Image();
        img.src = nodeData?.src as string; // or a data URI
        await img.decode();
        const bitmapImage = await createImageBitmap(img);

        init.image = bitmapImage;
      }

      return {
        keyframe: nodeDetails?.keyframes,
        type: nodeDetails?.type,
        init,
      };
    });
    const _nodes = await Promise.all(nodes || []);
    const p = (index: number) => {
      if (ref.current) {
        const progress = index * 100;
        ref.current.style.strokeDashoffset = `${((100 - progress) / 100) * c}`;
      }
    };
    try {
      const res = await workerProxy.start(
        videoDimensions,
        _nodes,
        proxy(p),
        quality,
      );
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
