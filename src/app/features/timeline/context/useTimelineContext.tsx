import type { KeyFrame } from "@/types";
import gsap from "gsap";
import type { MotionValue } from "motion";
import { createContext, useContext } from "react";

export interface ITimeLineContext {
  timeline: gsap.core.Timeline;
  addKeyFrame: (elementId: string, keyFrame: Omit<KeyFrame, "id">) => void;
  play: () => void;
  getPlayHeadPosition: () => number;
  seek: gsap.core.Timeline["seek"];
  motionValueTimelineProgress: MotionValue<number>;
}
export const TimeLineContext = createContext<ITimeLineContext>({
  timeline: gsap.timeline({ paused: true }),
  addKeyFrame: () => {},
  play: () => {},
  seek: (() => {}) as unknown as gsap.core.Timeline["seek"],
  getPlayHeadPosition: () => 0,
  motionValueTimelineProgress: {} as MotionValue<number>,
});

export const useTimelineContext = () => useContext(TimeLineContext);
