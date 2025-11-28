import { createSlice } from "@reduxjs/toolkit";
import type { AnimatableProperties, Keyframe } from "../shapes/animatable-object/object";
import type { FrontendCallback } from "../web-workers/types";

export interface TimelineState {
  currentTime: number;
  isPaused?: boolean;
  keyFrames: Record<string, Partial<Record<keyof AnimatableProperties, Keyframe[]>>>;
}

const initialState: TimelineState = {
  currentTime: 0,
  keyFrames: {},
};

export const timelineSlice = createSlice({
  name: "timeline",
  initialState,
  reducers: {
    setCurrentTime: (state, action: { payload: number }) => {
      state.currentTime = action.payload;
    },
    addKeyFrame: (
      state,
      action: {
        payload: Parameters<FrontendCallback["keyframe:add"]>;
      },
    ) => {
      const [shapeId, time, keyframeDetails, animatableProperty, value] = action.payload;
      // create shape keyframe object if missing
      if (!state.keyFrames[shapeId]) {
        state.keyFrames[shapeId] = {};
      }
      // create animatable keyframe array if missing
      const shapeKeyFrames = state.keyFrames[shapeId];
      if (!shapeKeyFrames[animatableProperty]) {
        shapeKeyFrames[animatableProperty] = [];
      }
      // If keyframe already exist for that timestamp, delete it
      if (keyframeDetails.shouldReplace) {
        shapeKeyFrames[animatableProperty] = shapeKeyFrames[animatableProperty].filter(
          (i) => i.time !== time,
        );
      }
      shapeKeyFrames[animatableProperty]?.push({
        easing: "",
        id: keyframeDetails.keyframeId,
        property: animatableProperty,
        time: time,
        value: value,
      });
    },
    updateKeyFrame: (state, action: { payload: { keyframes: Keyframe[]; shapeId: string } }) => {
      // state.keyFrames[action.payload.shapeId] = action.payload.keyframes;
    },
    setIsPaused: (state, action: { payload: boolean }) => {
      state.isPaused = action.payload;
    },
  },
});

export default timelineSlice.reducer;

export const { setCurrentTime, updateKeyFrame, setIsPaused, addKeyFrame } = timelineSlice.actions;
