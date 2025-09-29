import { motion } from "motion/react";
import { useRef } from "react";
import { IoChevronDown } from "react-icons/io5";
import { PiPause, PiPlayBold } from "react-icons/pi";
import { TbZoom } from "react-icons/tb";
import { Fragment } from "react/jsx-runtime";
import { twMerge } from "tailwind-merge";
import type { NodeType } from "../../../types";
import { useScreenContext } from "../../context/screenContext/context";
import useTimeLine from "../../hooks/useTimeLine";
import AspectRatioButton from "./aspect-ratio-button";
import KeyFrames from "./keyframes";

const TIMELINE_DURATION = 10; // seconds
const FRAME_RATE = 24; // frames per second
function Timeline() {
  const timeLine = useTimeLine((e) => e.timeline);
  const isPaused = useTimeLine((e) => e.isPaused);
  const nodes = useTimeLine((e) => e.nodesIndex);
  const play = useTimeLine((e) => e.togglePlayBack);
  const c = useScreenContext();
  const timelineRef = useRef<HTMLDivElement>(null);
  const progress = useTimeLine((e) => e.progress);
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
    <>
      <div className="flex items-center justify-center gap-4 border-b-2 border-gray-600 px-6 [&>div]:py-2">
        <div className="flex-1">
          <TbZoom
            size={20}
            color="black"
            onClick={() => c?.fitStageToViewport()}
          />
        </div>
        <div className="flex flex-1 items-center justify-center gap-4">
          <TimeStamp />
          <div onClick={() => play()}>
            {isPaused ? (
              <PiPlayBold color="black" />
            ) : (
              <PiPause color="black" />
            )}
          </div>
        </div>
        <div className="flex flex-1 justify-end">
          <AspectRatioButton />
        </div>
      </div>
      {/*  */}
      <div className="relative mr-4 flex-1">
        <div className="flex min-h-4 border-b bg-gray-300">
          <div className="w-[20%]" />
          <motion.div
            drag="x"
            whileDrag={{ transform: "translateX(0%) " }}
            animate={{ transform: "translateX(0%) " }}
            dragElastic={0}
            dragMomentum={false}
            onMouseDown={onTimeLineClick}
            className="relative z-20 flex-1 bg-gray-400"
            onDrag={(e, info) => {
              const boundindClient =
                timelineRef.current?.getBoundingClientRect();
              const post = Math.min(
                Math.max(info.point.x - (boundindClient?.left || 0), 0),
                boundindClient?.width || 0,
              );
              console.log(e.target);

              const limit =
                (post / (boundindClient?.width || 1)) * TIMELINE_DURATION;
              timeLine.seek(limit, false);
              //

              console.log(limit, info.point.x);
            }}
          >
            <div // Base background for the timeline progress
              ref={timelineRef}
              className="absolute top-0 left-0 h-4 w-full border-b bg-gray-300"
            />

            <div // Highlighted background that moves when timeline is playing
              style={{ width: `${(progress || 0) * 100}%` }}
              className="absolute top-0 left-0 flex h-4 border-b bg-gray-400"
            >
              <motion.div className="absolute right-0 h-[200px] w-1 translate-x-1/2 bg-[orangered]" />
              <motion.div className="absolute right-0 size-4 translate-x-1/2 bg-[orangered]" />
            </div>
            <div
              className="pointer-events-none absolute top-0 left-0 grid w-full"
              style={{
                gridTemplateColumns: `repeat(${TIMELINE_DURATION}, minmax(0, 1fr))`,
              }}
            >
              {new Array(TIMELINE_DURATION).fill(0).map((_, i) => (
                <Fragment key={i}>
                  <div className="pointer-events-none relative translate-x-[0.5px] flex-col items-end overflow-visible opacity-50">
                    <p className="absolute right-0 translate-x-1/2 text-right text-xs font-medium text-black">
                      {i + 1}s
                    </p>
                    <div
                      className="absolute top-4 right-0 h-full w-[0.5px] flex-1 -translate-x-1/2 bg-black"
                      style={{ height: "200px" }}
                    />
                  </div>
                </Fragment>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="relative h-[200px] flex-1 overflow-auto">
          {nodes?.map((id) => (
            <NodeKeyFrames key={id} id={id} />
          ))}
        </div>
      </div>
    </>
  );
}

const NodeKeyFrames = ({ id }: { id: string }) => {
  const node = useTimeLine((e) => e.nodes[id]);
  const isSelected = useTimeLine((e) => e.selectedNodeId === id);
  const selectNode = useTimeLine((e) => e.selectNode);
  const screenContext = useScreenContext();
  if (!node) return null;

  return (
    <div className="item flex w-full border-b border-gray-500">
      <div
        className={twMerge(
          "flex w-[20%] items-center gap-2 overflow-hidden border-r border-gray-500 bg-gray-200 p-2",
          isSelected ? "bg-blue-300" : "bg-gray-200",
        )}
        onClick={() => {
          selectNode(id);
          if (node?.element)
            screenContext?.transformNode?.current?.nodes([node.element]);
        }}
      >
        <IoChevronDown className="-rotate-90" />
        <p className="truncate text-black">{nodeTitleRecord?.[node?.type]}</p>
      </div>
      <div className="flex flex-1 items-center bg-green-100">
        <KeyFrames id={id} />
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
const TimeStamp = () => {
  const progress = useTimeLine((e) => e.progress);

  const minutes = Math.floor((progress * TIMELINE_DURATION) / 60);
  const seconds = Math.floor((progress * TIMELINE_DURATION) % 60);
  const milliseconds = Math.floor(((progress * TIMELINE_DURATION) % 1) * 100);
  //
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(
    seconds,
  ).padStart(2, "0")}:${String(milliseconds).padStart(2, "0")}`;
  return (
    <div className="min-w-[90px] rounded-md border px-2 text-center text-black">
      <p>{formattedTime}</p>
    </div>
  );
};

const nodeTitleRecord: Record<NodeType, string> = {
  circle: "Circle",
  rectangle: "Rectangle",
  image: "Image",
  text: "Text",
  square: "Square",
};

export default Timeline;
