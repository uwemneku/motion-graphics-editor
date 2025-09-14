import { useRef } from "react";
import { useScreenContext } from "../context/screenContext/context";
import useTimeLine from "../hooks/useTimeLine";

const TIMELINE_DURATION = 10; // seconds
const SLIDER_MAX = 1;
function Timeline() {
  const keyFrames = useTimeLine((e) => e.keyFrames);
  const timeLine = useTimeLine((e) => e.timeline);
  const containerRef = useRef<HTMLDivElement>(null);
  const play = useTimeLine((e) => e.play);
  const c = useScreenContext();

  // const step = SLIDER_MAX / TIMELINE_DURATION / FRAMES_PER_SECOND;
  // const g = `grid-cols-${TIMELINE_DURATION}`;

  return (
    <div className=" h-full text-white relative">
      <div className="mx-4 relative h-full">
        <div
          ref={containerRef}
          className="absolute top-2 left-0 h-full  pointer-events-none"
        >
          {/* <div className="size-2  bg-blue-400 -translate-x-1" /> */}
          <div className="size-[1px] bg-blue-400 h-full" />
        </div>
        <input
          type="range"
          className="w-full "
          defaultValue={0}
          min={0}
          max={SLIDER_MAX}
          step={Number.MIN_VALUE}
          onChange={(E) => {
            const value = parseFloat(E.target.value);
            if (!isNaN(value)) {
              containerRef.current!.style.left = `${value * 100}%`;
              if (timeLine.isActive()) {
                timeLine.pause();
              }

              timeLine.seek(value * 10);
              c?.setScrubPosition(value);
            }
          }}
        />
        <div
          className={`grid grid-rows-1 h-2/5 border-white border-l`}
          style={{
            gridTemplateColumns: `repeat(${TIMELINE_DURATION}, minmax(0, 1fr))`,
          }}
        >
          {new Array(TIMELINE_DURATION).fill(0).map((_, i) => (
            <div
              key={i}
              className="h-full border-r border-amber-400 translate-x-[0.5px]"
            />
          ))}
        </div>
        <button onClick={play} className="p-2">
          Play
        </button>
        <div className="flex gap-5 p-2 relative">
          {keyFrames.map((e) => (
            <div
              key={e.id}
              className="size-2 bg-white rotate-45 absolute top-0 translate-x-[-50%]"
              style={{ left: `${(e.timeStamp / 10) * 100}%` }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Timeline;
