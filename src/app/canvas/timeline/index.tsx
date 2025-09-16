import { useRef } from "react";
import { useScreenContext } from "../../context/screenContext/context";
import useTimeLine from "../../hooks/useTimeLine";
import KeyFrames from "./keyframes";

const TIMELINE_DURATION = 10; // seconds
const SLIDER_MAX = 1;
function Timeline() {
  const keyFrames = useTimeLine((e) => e.nodesIndex);
  const timeLine = useTimeLine((e) => e.timeline);
  const containerRef = useRef<HTMLDivElement>(null);
  const play = useTimeLine((e) => e.play);
  const c = useScreenContext();

  return (
    <div className="relative h-full text-white">
      <div className="relative mx-4 h-full">
        <div
          ref={containerRef}
          className="pointer-events-none absolute top-2 left-0 h-full"
        >
          {/* <div className="size-2  bg-blue-400 -translate-x-1" /> */}
          <div className="size-[1px] h-full bg-blue-400" />
        </div>
        <input
          type="range"
          className="w-full"
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
          className={`absolute grid h-2/5 w-full grid-rows-1 border-l border-white`}
          style={{
            gridTemplateColumns: `repeat(${TIMELINE_DURATION}, minmax(0, 1fr))`,
          }}
        >
          {new Array(TIMELINE_DURATION).fill(0).map((_, i) => (
            <div
              key={i}
              className="h-full translate-x-[0.5px] border-r border-amber-400"
            />
          ))}
        </div>
        <button onClick={play} className="p-2">
          Play
        </button>
        <div className="grid gap-2">
          {keyFrames.map((e) => (
            <KeyFrames key={e} id={e} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Timeline;
