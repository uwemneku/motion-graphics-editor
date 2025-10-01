import type { KeyFrame } from "@/types";
import { createSlice } from "@reduxjs/toolkit";

export interface TimelineState {
  currentTime: number;
  isPaused?: boolean;
  keyFrames: Record<string, KeyFrame[]>;
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
    updateKeyFrame: (
      state,
      action: { payload: { keyframes: KeyFrame[]; shapeId: string } },
    ) => {
      state.keyFrames[action.payload.shapeId] = action.payload.keyframes;
    },
    setIsPaused: (state, action: { payload: boolean }) => {
      state.isPaused = action.payload;
    },
  },
});

export default timelineSlice.reducer;

export const { setCurrentTime, updateKeyFrame, setIsPaused } =
  timelineSlice.actions;
