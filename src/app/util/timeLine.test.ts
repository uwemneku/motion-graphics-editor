import { describe, expect, test } from "vitest";
import type { KeyFrame } from "../../types";
import { insertKeyFrameIntoElementTimeline } from "./timeline";

describe("Adding element keyframe", () => {
  const initKeyFrame: KeyFrame[] = [];
  const keyFrame: KeyFrame = { timeStamp: 5, animatable: {}, id: "" };
  const res = insertKeyFrameIntoElementTimeline(
    keyFrame,
    initKeyFrame
  ).keyframes;

  test("Should add keyframe", () => {
    expect(res.length).toBe(1);
  });
  test("Should not modify argument", () => {
    expect(initKeyFrame.length).toBe(0);
  });

  test("Should replace the same time Stamp", () => {
    const f = insertKeyFrameIntoElementTimeline(
      { timeStamp: 5, animatable: {}, id: "" },
      res
    ).keyframes;

    expect(f.length).toBe(1);
    expect(f[0]?.timeStamp).toEqual(5);
  });

  /* -------------------------------------------------------------------------- */
  /* -------------------------------------------------------------------------- */
  test("Should Add keyframe at the end", () => {
    const newKeyframe: KeyFrame = {
      timeStamp: 10,
      animatable: {},
      id: "",
    };
    const currentKeyFrames: KeyFrame[] = [
      { timeStamp: 5, animatable: {}, id: "" },
      { timeStamp: 7, animatable: {}, id: "" },
    ];
    const _ = insertKeyFrameIntoElementTimeline(
      newKeyframe,
      currentKeyFrames
    ).keyframes;

    expect(_.length).toBe(3);
    expect(_[2]?.timeStamp).toBe(10);

    const __ = insertKeyFrameIntoElementTimeline(newKeyframe, _).keyframes;

    expect(__.length).toBe(3);
  });
  /* -------------------------------------------------------------------------- */
  /* -------------------------------------------------------------------------- */
  test("Should insert keyframe at middle", () => {
    const newKeyframe: KeyFrame = {
      timeStamp: 6,
      animatable: {},
      id: "",
    };
    const currentKeyFrames: KeyFrame[] = [
      { timeStamp: 5, animatable: {}, id: "" },
      { timeStamp: 7, animatable: {}, id: "" },
    ];
    const _ = insertKeyFrameIntoElementTimeline(
      newKeyframe,
      currentKeyFrames
    ).keyframes;

    expect(_.length).toBe(3);
    expect(_[1]?.timeStamp).toBe(6);

    const __ = insertKeyFrameIntoElementTimeline(newKeyframe, _).keyframes;

    expect(__.length).toBe(3);

    // Add the last keyframe from current keyframes
    const ___ = insertKeyFrameIntoElementTimeline(
      { timeStamp: 7, animatable: {}, id: "" },
      __
    ).keyframes;
    expect(___.length).toBe(3);
  });
});
