import { useAppSelector } from "@/app/store";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEventHandler,
} from "react";
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
  const initDetails = useRef({ left: 0, startX: 0, maxOffset: 0, width: 0 });
  const trackDiv = useRef<HTMLDivElement>(null);

  const progress = (timelineCurrentTime / timeline.timeline.totalDuration()) * 100;

  const handleMouseUp = useCallback((e: Pick<MouseEvent, "clientX">) => {
    if (!isMouseDown.current) return;
    isMouseDown.current = false;
    initDetails.current.left = getPlayHeadLeftOffset(e.clientX);
  }, []);

  const seekToMousePosition = useCallback(
    (e: Pick<MouseEvent, "clientX">, skipMouseDownCheck = false) => {
      if (!skipMouseDownCheck && !isMouseDown.current) return;
      const left = getPlayHeadLeftOffset(e.clientX);
      const progress = (left / initDetails.current.maxOffset) * duration;
      timeline.timeline.seek(progress, false);
    },
    [duration, timeline],
  );

  const handleClick: MouseEventHandler = (e) => {
    const { left = 0 } = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const p = e.clientX - left;
    const progress = (p / initDetails.current.maxOffset) * duration;
    trackDiv.current?.style.setProperty("transition", "left 0.5s");
    timeline.timeline.seek(progress, false);
    initDetails.current.left = p;
  };

  const getPlayHeadLeftOffset = (clientX = 0) => {
    const deltaX = clientX - initDetails.current.startX;
    const left = Math.min(
      initDetails.current.maxOffset,
      Math.max(0, initDetails.current.left + deltaX),
    );
    return left;
  };

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", seekToMousePosition);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", seekToMousePosition);
    };
  }, [seekToMousePosition, handleMouseUp]);

  return (
    <div
      className="relative h-full"
      style={{ width, marginLeft: PADDING_LEFT }}
      onMouseDown={handleClick}
      ref={(node) => {
        if (!node || width) return;
        const elementWidth = node.getBoundingClientRect().width - PADDING_RIGHT - PADDING_LEFT;
        initDetails.current.maxOffset = elementWidth;
        setWidth(elementWidth);
      }}
    >
      {/* -------------------------------------------------------------------------- */}
      {/* Timeline tract */}
      {/* -------------------------------------------------------------------------- */}
      <div
        className="absolute flex flex-col"
        ref={trackDiv}
        style={{ left: `${progress}%` }}
        onTransitionEnd={(e) => {
          e.currentTarget.style.setProperty("transition", "none");
        }}
      >
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
      <div className="relative z-10 flex h-full items-end">
        <div className="flex w-full flex-1">
          {new Array(duration).fill("").map((_, index) => (
            <div className="flex-1">
              <Time time={index} key={index} />
            </div>
          ))}
        </div>
        <Time time={duration} />
      </div>
    </div>
  );
}

const Time = (props: { time: number }) => {
  return (
    <p className="pointer-events-none w-fit -translate-x-[calc(50%-1px)] bg-white/50 pb-1 text-xs text-gray-500 select-none">
      {props.time}
    </p>
  );
};

export default FloatingTimeline;
