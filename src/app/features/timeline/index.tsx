import useKeybinding from "@/app/hooks/useKeybinding";
import { useAppDispatch, useAppSelector } from "@/app/store";
import { motion, useTransform } from "motion/react";
import { useRef } from "react";
import { IoChevronDown } from "react-icons/io5";
import { TbZoom } from "react-icons/tb";
import { Fragment } from "react/jsx-runtime";
import { twMerge } from "tailwind-merge";
import { useScreenContext } from "../../context/screenContext/context";
import { selectShape } from "../shapes/slice";
import { useShapesRecordContext } from "../shapes/useShapesRecordContext";
import { useTimelineContext } from "./context/useTimelineContext";
import { TimeStamp } from "./f";
import KeyFrames from "./keyframes";

const TIMELINE_DURATION = 10; // seconds
function Timeline() {
  const timeLineContext = useTimelineContext();
  const isPaused = useAppSelector((state) => state.timeline.isPaused);
  const nodes = useAppSelector((state) => state.shapes.ids);
  const c = useScreenContext();
  const timelineRef = useRef<HTMLDivElement>(null);
  const p = useTransform(
    timeLineContext.motionValueTimelineProgress,
    (v) => `${v * 100}%`,
  );
  console.log("rendering");

  const onTimeLineClick = (e: React.MouseEvent) => {
    console.log("ddd");
    const width = e?.currentTarget?.clientWidth || 0;
    const left = e?.currentTarget?.getBoundingClientRect().left || 0;

    console.log({ rect: e?.currentTarget?.clientWidth });

    const x = e.clientX - left; // x position within the element.
    const newProgress = x / width;
    const newTime = newProgress * TIMELINE_DURATION;
    timeLineContext.seek(newTime, false);
  };
  useKeybinding();
  return (
    <div>
      <div className="flex items-center justify-center gap-4 border-b-2 border-gray-600 px-6 [&>div]:py-2">
        <div className="flex-1">
          <ZoomButton />
        </div>
        <div className="flex flex-1 items-center justify-center gap-4">
          <TimeStamp />
          <div onClick={() => timeLineContext.play()}>
            {/* {isPaused ? (
              <PiPlayBold color="black" />
            ) : (
              <PiPause color="black" />
            )} */}
            play
          </div>
        </div>
        <div className="flex flex-1 justify-end">
          {/* <AspectRatioButton /> */}
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
              timeLineContext.seek(limit, false);
              //

              console.log(limit, info.point.x);
            }}
          >
            <div // Base background for the timeline progress
              ref={timelineRef}
              className="absolute top-0 left-0 h-4 w-full border-b bg-gray-300"
            />

            <motion.div // Highlighted background that moves when timeline is playing
              style={{ width: p }}
              className="absolute top-0 left-0 flex h-4 border-b bg-gray-400"
            >
              <motion.div className="absolute right-0 h-[200px] w-1 translate-x-1/2 bg-[orangered]" />
              <motion.div className="absolute right-0 size-4 translate-x-1/2 bg-[orangered]" />
            </motion.div>
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
    </div>
  );
}

const NodeKeyFrames = ({ id }: { id: string }) => {
  const shapeContext = useShapesRecordContext();
  const dispatch = useAppDispatch();

  const isSelected = useAppSelector(
    (state) => state.shapes.selectedNodeId === id,
  );
  // const node = useTimeLine((e) => e.nodes[id]);
  const selectNode = () => {
    dispatch(selectShape(id));
  };
  const screenContext = useScreenContext();

  return (
    <div className="item flex w-full border-b border-gray-500">
      <div
        className={twMerge(
          "flex w-[20%] items-center gap-2 overflow-hidden border-r border-gray-500 bg-gray-200 p-2",
          isSelected ? "bg-blue-300" : "bg-gray-200",
        )}
        onClick={() => {
          selectNode();
          const node = shapeContext.getShape(id);
          if (node) screenContext?.transformNode?.current?.nodes([node]);
        }}
      >
        <IoChevronDown className="-rotate-90" />
        <p className="truncate text-black">{"nodeTitleRecord?.[node?.type]"}</p>
      </div>
      <div className="flex flex-1 items-center bg-green-100">
        <KeyFrames id={id} />
      </div>
    </div>
  );
};

const ZoomButton = () => {
  console.log("rendering zoom button");
  return <div />;
  return (
    <TbZoom
      size={20}
      color="black"
      // onClick={() => c?.fitStageToViewport()}
    />
  );
};

/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */

export default Timeline;
