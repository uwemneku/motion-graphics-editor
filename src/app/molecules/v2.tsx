import { proxy, wrap, type Remote } from "comlink";
import { useRef } from "react";
import { BiExport } from "react-icons/bi";
import { useScreenContext } from "../context/screenContext/context";
import { useShapesRecordContext } from "../features/shapes/useShapesRecordContext";
import useTimeLine from "../hooks/useTimeLine";
import { dispatchableSelector, useAppDispatch } from "../store";
import { type WorkerAPI } from "../util/export-woker";
import RendererWorker from "../util/export-woker/index?worker";

const worker = new RendererWorker();
const workerProxy = wrap<Remote<WorkerAPI>>(worker);

function ExportFeature2() {
  const r = 10;
  const c = Math.PI * r * 2;
  const ref = useRef<SVGCircleElement>(null);
  const timeline = useTimeLine((e) => e.timeline);
  const screenContext = useScreenContext();
  const shapeContext = useShapesRecordContext();
  const dispatch = useAppDispatch();

  const exportUsingWebWorker = async () => {
    console.time("export_worker");
    const state = dispatch(dispatchableSelector((s) => s));
    const timelineState = useTimeLine.getState();
    const stage = screenContext?.getStageNode();
    if (!stage) return;
    const videoBoundary = stage?.findOne("#video-boundary");
    const videoBoundarySize = videoBoundary?.size() || {
      width: 0,
      height: 0,
    };

    const videoBoundaryPos = videoBoundary?.position() || { x: 0, y: 0 };
    const quality = 1; // between 0 and 1
    const scale =
      quality * (timelineState.videoDimensions.width / videoBoundarySize.width);

    const videoDimensions = timelineState.videoDimensions;

    timeline.seek(0);
    const nodes = state?.shapes?.ids?.map(async (id) => {
      const nodeDetails = state.shapes?.data?.[id];
      const node = shapeContext?.getShape(id);
      if (!node) return;
      const init = { ...(node?.getAttrs() || {}) };

      if (init.x) init.x = (init.x - videoBoundaryPos.x) * scale;
      if (init.y) init.y = (init.y - videoBoundaryPos.y) * scale;
      Object.keys(init).forEach((key) => {
        if (["x", "y", "scaleX", "scaleY"].includes(key)) return;

        if (typeof init[key] === "number") {
          if (init?.[key] !== undefined) {
            init[key] = init[key] * scale;
          }
        }
      });

      // if image, convert to bitmap
      // const nodeData = nodeDetails?.data || {};
      if ("src" in nodeDetails) {
        const img = new Image();
        img.src = nodeDetails?.src as string; // or a data URI
        await img.decode();
        const bitmapImage = await createImageBitmap(img);

        init.image = bitmapImage;
      }

      return {
        keyframe: state.timeline.keyFrames?.[id] || [],
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
        videoBoundaryPos,
        timeline.duration(),
        scale,
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
