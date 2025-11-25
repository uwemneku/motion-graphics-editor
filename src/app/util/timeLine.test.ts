import { describe, expect, test } from "vitest";
import type { KeyFrame } from "../../types";
import { insertKeyFrameIntoElementTimeline } from "./timeline";

describe("Adding element keyframe", () => {
  const initKeyFrame: KeyFrame[] = [];
  const keyFrame: KeyFrame = { timeStamp: 5, animatable: {}, id: "" };
  const res = insertKeyFrameIntoElementTimeline(keyFrame, initKeyFrame).keyframes;

  test("Should add keyframe", () => {
    expect(res.length).toBe(1);
  });
  test("Should not modify argument", () => {
    expect(initKeyFrame.length).toBe(0);
  });

  test("Should replace the same time Stamp", () => {
    const f = insertKeyFrameIntoElementTimeline(
      { timeStamp: 5, animatable: {}, id: "" },
      res,
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
    const _ = insertKeyFrameIntoElementTimeline(newKeyframe, currentKeyFrames).keyframes;

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
    const _ = insertKeyFrameIntoElementTimeline(newKeyframe, currentKeyFrames).keyframes;

    expect(_.length).toBe(3);
    expect(_[1]?.timeStamp).toBe(6);

    const __ = insertKeyFrameIntoElementTimeline(newKeyframe, _).keyframes;

    expect(__.length).toBe(3);

    // Add the last keyframe from current keyframes
    const ___ = insertKeyFrameIntoElementTimeline(
      { timeStamp: 7, animatable: {}, id: "" },
      __,
    ).keyframes;
    expect(___.length).toBe(3);
  });

  test("Should insert at the start", () => {
    const newKeyframe: KeyFrame = {
      timeStamp: 2,
      animatable: {},
      id: "",
    };
    const currentKeyFrames: KeyFrame[] = [
      { timeStamp: 5, animatable: {}, id: "" },
      { timeStamp: 7, animatable: {}, id: "" },
    ];
    const res = insertKeyFrameIntoElementTimeline(newKeyframe, currentKeyFrames);
    expect(res.insertIndex).toBe(0);
    expect(res.keyframes.length).toBe(3);
    expect(res.keyframes.map((i) => i.timeStamp)).toStrictEqual([2, 5, 7]);
  });

  test("should insert keyframe at penultimate index", () => {
    const newKeyframe = {
      timeStamp: 11,
      animatable: {},
      id: "",
    };
    const keyframes = [
      {
        timeStamp: 0,
        animatable: {},
        id: "",
      },
      {
        timeStamp: 2,
        animatable: {},
        id: "",
      },
      {
        timeStamp: 5,
        animatable: {},
        id: "",
      },
      {
        timeStamp: 10,
        animatable: {},
        id: "",
      },
      {
        timeStamp: 12,
        animatable: {},
        id: "",
      },
    ];
    const res = insertKeyFrameIntoElementTimeline(newKeyframe, keyframes);
    expect(res.keyframes.length).toBe(keyframes.length + 1);
    expect(res.keyframes[4]).toStrictEqual(newKeyframe);

    //
    const newKeyframe1 = {
      timeStamp: 3,
      animatable: {},
      id: "",
    };
    const res1 = insertKeyFrameIntoElementTimeline(newKeyframe1, keyframes);
    expect(res1.keyframes[2]).toStrictEqual(newKeyframe1);
  });
});
