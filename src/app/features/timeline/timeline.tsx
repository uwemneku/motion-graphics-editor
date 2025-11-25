import { useAppSelector } from "@/app/store";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useCanvasWorkerContext } from "../canvas/useCanvasContext";
import LayersSideMenu from "../layers";

function FloatingTimeline() {
  return (
    <div className="flex flex-1 flex-col bg-white" style={{ "--size": "30px" } as CSSProperties}>
      <div className="sticky top-0 z-30 flex">
        <div className="sticky top-0 left-0 z-30 w-[200px] shrink-0 border-r border-b border-gray-300 bg-white" />
        <div className="sticky top-0 z-10 h-(--size) flex-1 border-b border-gray-300 bg-white">
          <TimelineTimeStampHeader />
        </div>
      </div>
      {/* Layers */}
      <div className="left-0 z-20 flex max-h-[200px] min-h-[150px] flex-1 overflow-y-scroll">
        <div className="sticky left-0 h-full min-h-[150px] w-full max-w-[200px] border-r border-gray-300">
          <LayersSideMenu />
        </div>
        <div className="min-h-fit flex-1">
          <AllKeyFrames />
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
  const TOTAL_TIMELINE = 10;

  const canvasContext = useCanvasWorkerContext();
  const timelineHeaderRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(10);
  const timelineCurrentTime = useAppSelector((e) => e.timeline.currentTime);
  const [width, setWidth] = useState<number>(0);
  const isMouseDown = useRef(false);
  const initDetails = useRef({
    /**Starting mouse position */
    startX: 0,
    timelineWidth: 0,
    scrubStartTime: 0,
    time: timelineCurrentTime,
  });
  const trackDiv = useRef<HTMLDivElement>(null);
  initDetails.current.time = timelineCurrentTime;

  const progress = (timelineCurrentTime / 10) * 100;

  const handleMouseUp = useCallback((e: Pick<MouseEvent, "clientX">) => {
    if (!isMouseDown.current) return;
    isMouseDown.current = false;
  }, []);

  const seekToMousePosition = useCallback(
    (e: Pick<MouseEvent, "clientX">, skipMouseDownCheck = false) => {
      if (!skipMouseDownCheck && !isMouseDown.current) return;
      const deltaX = e.clientX - initDetails.current.startX;
      const time = initDetails.current.scrubStartTime;
      if (deltaX < 0 && time <= 0) return;
      const playHeadPosition = time + (deltaX / initDetails.current.timelineWidth) * TOTAL_TIMELINE;
      canvasContext.seekTimeLine(playHeadPosition);
    },
    [canvasContext],
  );

  const handleClick = (e: Pick<MouseEvent, "clientX">) => {
    if (!timelineHeaderRef.current) return;
    const { left = 0 } = timelineHeaderRef.current.getBoundingClientRect();
    const timelineOffset = Math.max(0, e.clientX - left - PADDING_LEFT);
    const playHeadPosition = Math.min(
      Math.max(0, (timelineOffset / initDetails.current.timelineWidth) * duration),
      TOTAL_TIMELINE,
    );
    trackDiv.current?.style.setProperty("transition", "left 0.5s");
    canvasContext.seekTimeLine(playHeadPosition);
  };

  const saveTimelineWidth = (node: HTMLElement | null) => {
    if (!node || width) return;
    const elementWidth = node.getBoundingClientRect().width;
    initDetails.current.timelineWidth = elementWidth;
    setWidth(elementWidth);
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
      className="z-10 h-full"
      ref={timelineHeaderRef}
      onMouseDown={handleClick}
      style={{ paddingLeft: PADDING_LEFT, paddingRight: PADDING_RIGHT }}
    >
      <div className="bg-red relative h-full" ref={saveTimelineWidth}>
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
              initDetails.current.scrubStartTime = initDetails.current.time;
            }}
            onDragStart={(e) => e.preventDefault()}
            className="relative z-20 -translate-x-1/2 cursor-grab rounded-sm bg-blue-400 p-1 px-2 text-[10px] font-semibold active:cursor-grabbing"
          >
            <span className="pointer-events-none select-none">
              {timelineCurrentTime.toFixed(2)}s
            </span>
          </div>
          <div className="h-[400px] w-0.5 bg-blue-400" />
        </div>
        {/* ========= */}
        <div className="relative z-10 flex h-full items-end">
          <div className="flex w-full flex-1">
            {new Array(duration).fill("").map((_, index) => (
              <div className="flex-1">
                <Time time={index} key={index} />
              </div>
            ))}
            <div className="translate-x-[calc(100%-1px)]">
              <Time time={duration} />
            </div>
          </div>
        </div>
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

const AllKeyFrames = () => {
  const shapeIds = useAppSelector((state) => state.shapes.ids);
  return (
    <>
      {shapeIds.map((id) => (
        <div key={id} className="min-h-[37px] border-b border-gray-300"></div>
      ))}
    </>
  );
};

export default FloatingTimeline;
