import { Fragment, useRef } from "react";
import { PiPause, PiPlayBold } from "react-icons/pi";
import { TbZoom } from "react-icons/tb";
import { useScreenContext } from "../../context/screenContext/context";
import useTimeLine from "../../hooks/useTimeLine";
import AspectRatioButton from "./aspect-ratio-button";

const TIMELINE_DURATION = 10; // seconds
const FRAME_RATE = 24; // frames per second
function Timeline() {
  const keyFrames = useTimeLine((e) => e.nodesIndex);
  const progress = useTimeLine((e) => e.progress);
  const timeLine = useTimeLine((e) => e.timeline);
  const isPaused = useTimeLine((e) => e.isPaused);
  const nodes = useTimeLine((e) => e.nodesIndex);
  const containerRef = useRef<HTMLDivElement>(null);
  const play = useTimeLine((e) => e.togglePlayBack);
  const c = useScreenContext();
  //
  // convert progress to 00m:00s:00ms format
  const minutes = Math.floor((progress * TIMELINE_DURATION) / 60);
  const seconds = Math.floor((progress * TIMELINE_DURATION) % 60);
  const milliseconds = Math.floor(((progress * TIMELINE_DURATION) % 1) * 100);
  //
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(
    seconds,
  ).padStart(2, "0")}:${String(milliseconds).padStart(2, "0")}`;

  const onTimeLineClick = (e: React.MouseEvent) => {
    console.log("ddd");
    const width = e?.currentTarget?.clientWidth || 0;
    const left = e?.currentTarget?.getBoundingClientRect().left || 0;

    console.log({ rect: e?.currentTarget?.clientWidth });

    const x = e.clientX - left; // x position within the element.
    const newProgress = x / width;
    const newTime = newProgress * TIMELINE_DURATION;
    timeLine.seek(newTime, false);
  };

  return (
    <div className="relative h-full text-white">
      <div className="flex items-center justify-center gap-4 border-b-2 border-gray-600 px-4 [&>div]:py-2">
        <div className="flex-1">
          <TbZoom color="black" onClick={() => c?.fitStageToViewport()} />
        </div>
        <div className="flex flex-1 items-center justify-center gap-4">
          <div className="rounded-md border px-2 text-black">
            <p>{formattedTime}</p>
          </div>
          <div onClick={() => play()}>
            {isPaused ? (
              <PiPause color="black" />
            ) : (
              <PiPlayBold color="black" />
            )}
          </div>
        </div>
        <div className="flex flex-1 justify-end">
          <AspectRatioButton />
        </div>
      </div>
      {/*  */}
      <div className="relative h-full border-[.1px]">
        <div // Timeline ruler
          className="absolute top-0 left-0 flex h-full w-full overflow-hidden"
        >
          <div //Space for the shape labels
            className="h-full w-[25%] overflow-hidden border-r-1 border-black"
          />

          <div className="relative mr-6 flex-1">
            <div onClick={onTimeLineClick} className="z-20">
              <div // Base background for the timeline progress
                className="absolute top-0 left-0 h-4 w-full bg-gray-300"
              />
              <div // Highlighted background that moves when timeline is playing
                className="absolute top-0 left-0 h-4 bg-gray-400"
                style={{ width: `${(progress || 0) * 100}%` }}
              />
              <div // Vertical line that moves when timeline is playing
                className="absolute top-0 left-0 flex h-full flex-col items-center"
                style={{
                  left: `${(progress || 0) * 100}%`,
                  transform: "translateX(-50%)",
                }}
              >
                <div className="size-4 bg-[orangered]" />
                <div className="w-1 flex-1 bg-[orangered]" />
              </div>
            </div>
            <div
              className="pointer-events-none grid h-full flex-1"
              style={{
                gridTemplateColumns: `repeat(${TIMELINE_DURATION}, minmax(0, 1fr))`,
              }}
            >
              {new Array(TIMELINE_DURATION).fill(0).map((_, i) => (
                <Fragment key={i}>
                  <div className="flex h-full translate-x-[0.5px] flex-col items-end opacity-50">
                    <p className="w-[16px] translate-x-1/2 text-center text-xs text-black">
                      {i + 1}s
                    </p>
                    <div className="w-[0.5px] flex-1 -translate-x-1/2 bg-black" />
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 h-full max-h-[200px] min-h-[150px] overflow-hidden overflow-y-auto">
          {nodes?.map((id) => (
            <NodeKeyFrames key={id} id={id} />
          ))}
        </div>
      </div>
    </div>
  );
}

const NodeKeyFrames = ({ id }: { id: string }) => {
  const node = useTimeLine((e) => e.nodes[id]);
  if (!node) return null;

  return (
    <div className="w-full border-b border-gray-500">
      <div className="w-[25%] overflow-hidden border-r border-gray-500 p-2">
        <p className="truncate text-black">Circle</p>
      </div>
    </div>
  );
};

export default Timeline;
