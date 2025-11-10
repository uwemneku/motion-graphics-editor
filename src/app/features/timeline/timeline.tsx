import { useAppSelector } from "@/app/store";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import LayersSideMenu from "../layers";
import { useTimelineContext } from "./context/useTimelineContext";

function FloatingTimeline() {
  return (
    <div className="flex min-h-full flex-1 bg-white" style={{ "--size": "30px" } as CSSProperties}>
      {/* Layers */}
      <div className="min-h-full max-w-[200px] flex-1 border-r border-gray-300">
        <div className="h-[var(--size)] border-b border-gray-300"></div>
        <LayersSideMenu />
      </div>
      <div className="flex-1">
        <div className="h-[var(--size)] border-b border-gray-300">
          <TimelineTimeStampHeader />
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the timestamp for the timeline
 * @returns
 */
function TimelineTimeStampHeader() {
  const PADDING_LEFT = 50;
  const PADDING_RIGHT = 50;
  const timeline = useTimelineContext();
  const [duration, setDuration] = useState(10);
  const timelineCurrentTime = useAppSelector((e) => e.timeline.currentTime);
  const [width, setWidth] = useState<number>();
  const isMouseDown = useRef(false);
  const initDetails = useRef({ left: 0, startX: 0, maxOffset: 0 });
  const trackDiv = useRef<HTMLDivElement>(null);
  const progress = (timelineCurrentTime / timeline.timeline.totalDuration()) * 100;

  const handleMouseUp = (e: MouseEvent) => {
    if (!isMouseDown.current) return;

    isMouseDown.current = false;
    initDetails.current.left = Math.min(
      initDetails.current.maxOffset,
      Math.max(0, initDetails.current.left + (e.clientX - initDetails.current.startX)),
    );
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isMouseDown.current) return;
      const left = Math.min(
        initDetails.current.maxOffset,
        Math.max(0, initDetails.current.left + (e.clientX - initDetails.current.startX)),
      );
      const progress = (left / initDetails.current.maxOffset) * duration;
      timeline.timeline.seek(progress, false);

      // trackDiv.current?.style?.setProperty("left", `${left}px`);
    },
    [duration, timeline],
  );

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [handleMouseMove]);

  return (
    <div
      className="relative h-full"
      style={{ width, marginLeft: PADDING_LEFT }}
      ref={(node) => {
        if (!node || width) return;
        const elementWidth = node.getBoundingClientRect().width - PADDING_RIGHT - PADDING_LEFT;
        console.log({ elementWidth });

        initDetails.current.maxOffset = elementWidth;
        setWidth(elementWidth);
      }}
    >
      {/* -------------------------------------------------------------------------- */}
      {/* Timeline tract */}
      {/* -------------------------------------------------------------------------- */}
      <div className="absolute flex flex-col" ref={trackDiv} style={{ left: `${progress}%` }}>
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            if (!trackDiv.current) return;
            isMouseDown.current = true;
            initDetails.current.startX = e.clientX;
          }}
          onDragStart={(e) => e.preventDefault()}
          className="relative z-20 -translate-x-1/2 cursor-grab rounded-sm bg-blue-400 p-1 px-2 text-[10px] font-semibold active:cursor-grabbing"
        >
          <span className="pointer-events-none select-none">{timelineCurrentTime.toFixed(2)}s</span>
        </div>
        <div className="h-[400px] w-[2px] bg-blue-400" />
      </div>
      {/* ========= */}
      <div className="relative z-10 mt-auto flex h-full w-full flex-1 items-end">
        {new Array(duration).fill("").map((_, index) => (
          <div className="flex-1" key={index}>
            <p className="pointer-events-none w-fit -translate-x-[calc(50%-1px)] bg-white/50 pb-1 text-xs text-gray-500 select-none">
              {index}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FloatingTimeline;
