import { dispatchableSelector, useAppDispatch } from "@/app/store";
import { insertKeyFrameIntoElementTimeline } from "@/app/util/timeline";
import type { KeyFrame } from "@/types";
import gsap from "gsap";
import type { Node, NodeConfig } from "konva/lib/Node";
import { useMotionValue } from "motion/react";
import { useRef, type PropsWithChildren } from "react";
import { useShapesRecordContext } from "../../shapes/useShapesRecordContext";
import { setCurrentTime, setIsPaused, updateKeyFrame } from "../slice";
import { TimeLineContext, type ITimeLineContext } from "./useTimelineContext";

function TimeLineContextProvider(props: PropsWithChildren) {
  const dispatch = useAppDispatch();
  const motionValueTimelineProgress = useMotionValue(0);
  const shapesRecordContext = useShapesRecordContext();
  const timeline = useRef(
    gsap.timeline({
      paused: true,
      onUpdate() {
        const time = timeline.time();
        motionValueTimelineProgress.set(timeline.progress());
        dispatch(setCurrentTime(time));
      },
    }),
  ).current;
  const has = useRef(false);
  if (!has.current) {
    timeline.to("#root", { duration: 10 });
    has.current = true;
  }

  const play = () => {
    const isPlaying = timeline.isActive();
    const playHeadPosition = timeline.time();
    const progress = timeline.progress();
    if (isPlaying) {
      timeline.pause(undefined, false);
      dispatch(setIsPaused(true));
    } else {
      const isComplete = progress === 1;
      timeline.play(isComplete ? 0 : playHeadPosition, false);
      dispatch(setIsPaused(false));
    }
  };

  const getPlayHeadPosition = () => timeline.time();
  //
  const addKeyFrame: ITimeLineContext["addKeyFrame"] = (shapeId, _keyFrame) => {
    const keyframeId = crypto.randomUUID();
    const keyFrame = { ..._keyFrame, id: keyframeId };
    const node = shapesRecordContext.getShape(shapeId);
    if (!node) return;
    const nodeKeyFrames =
      dispatch(
        dispatchableSelector((state) => state.timeline.keyFrames[shapeId]),
      ) || [];
    if (!node) return;
    const { insertIndex, keyframes } = insertKeyFrameIntoElementTimeline(
      keyFrame,
      nodeKeyFrames,
    );
    addTimeline(shapeId, node, insertIndex, keyFrame, keyframes, timeline);
    dispatch(updateKeyFrame({ keyframes, shapeId: shapeId }));
  };
  //

  return (
    <TimeLineContext.Provider
      value={{
        timeline,
        addKeyFrame,
        play,
        seek: timeline.seek,
        getPlayHeadPosition,
        motionValueTimelineProgress,
      }}
    >
      {props.children}
    </TimeLineContext.Provider>
  );
}

const addTimeline = (
  elementId: string,
  node: Node<NodeConfig>,
  curIndex: number,
  keyFrame: KeyFrame,
  allKeyFrames: KeyFrame[],
  timeline: gsap.core.Timeline,
) => {
  if (!node) return;
  const isFirstKeyFrame = allKeyFrames.length === 1;
  if (isFirstKeyFrame) {
    timeline.set(node, { konva: keyFrame.animatable, duration: 0 }, 0);
    timeline.invalidate(); // to recalculate the timeline
    return;
  }
  const prevKeyFrame = allKeyFrames[curIndex - 1];
  const nextKeyFrame = allKeyFrames[curIndex + 1];

  // Animate from previous keyframe to current keyframe
  if (prevKeyFrame) {
    timeline.pause(prevKeyFrame?.timeStamp || 0);
    const t = timeline.getById(`${keyFrame.timeStamp}${elementId}`);
    if (t) timeline.remove(t); // remove existing tween with same id
    const keyFrameDuration =
      keyFrame?.timeStamp - (prevKeyFrame?.timeStamp || 0);

    timeline.to(
      node,
      {
        konva: keyFrame.animatable,
        duration: keyFrameDuration,
        ease: "none",
        id: `${keyFrame.timeStamp}${elementId}`,
      },

      prevKeyFrame?.timeStamp || 0,
    );
    timeline.invalidate(); // to recalculate the timeline

    // If there is a next keyframe, animate from current to next
    if (nextKeyFrame) {
      const t = timeline.getById(`${nextKeyFrame.timeStamp}${elementId}`);

      if (t) timeline.remove(t);
      timeline.to(
        node,
        {
          ...nextKeyFrame.animatable,
          duration: nextKeyFrame.timeStamp - keyFrame.timeStamp,
          ease: "none",
          id: `${nextKeyFrame.timeStamp}${elementId}`,
        },
        keyFrame.timeStamp,
      );
    }
    timeline.invalidate(); // to recalculate the timeline
    timeline.progress(keyFrame.timeStamp / timeline.duration());
  }
};

export default TimeLineContextProvider;
