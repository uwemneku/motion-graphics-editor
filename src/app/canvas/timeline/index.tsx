import { useRef } from "react";
import { PiPlayBold } from "react-icons/pi";
import { useScreenContext } from "../../context/screenContext/context";
import useTimeLine from "../../hooks/useTimeLine";
import KeyFrames from "./keyframes";

const TIMELINE_DURATION = 10; // seconds
const FRAME_RATE = 24; // frames per second
function Timeline() {
  const keyFrames = useTimeLine((e) => e.nodesIndex);
  const timeLine = useTimeLine((e) => e.timeline);
  const containerRef = useRef<HTMLDivElement>(null);
  const play = useTimeLine((e) => e.play);
  const c = useScreenContext();
  //
  const TOTAL_FRAMES = TIMELINE_DURATION * FRAME_RATE;

  return (
    <div className="relative h-full text-white">
      <div onClick={play}>
        <PiPlayBold color="black" />
      </div>
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
          max={TOTAL_FRAMES}
          step={1}
          onChange={(E) => {
            const value = parseFloat(E.target.value);
            const progress = value / TOTAL_FRAMES;
            const timePosition = progress * TIMELINE_DURATION;
            if (!isNaN(value)) {
              if (timeLine.isActive()) {
                timeLine.pause();
              }
              containerRef.current!.style.left = `${progress * 100}%`;

              timeLine.seek(timePosition);
              console.log({ timePosition });

              c?.setScrubPosition(timePosition);
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
