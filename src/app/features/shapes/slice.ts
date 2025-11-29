import type { CreateNodeArgs, NodeRecord } from "@/types";
import { createSlice } from "@reduxjs/toolkit";

export interface ShapesState {
  ids: string[];
  selectedNodeId?: string;
  data: Record<string, NodeRecord>;
}

const initialState: ShapesState = {
  ids: [],
  data: {},
};

export const counterSlice = createSlice({
  name: "shapes",
  initialState,
  reducers: {
    addShape: (state, action: { payload: CreateNodeArgs & { id: string } }) => {
      const id = action.payload.id;
      state.ids.push(id);
      state.data[id] = action.payload;
    },
    selectShape: (state, action: { payload: string | undefined }) => {
      state.selectedNodeId = action.payload;
    },
    deleteShape: (state, action: { payload: string }) => {
      const id = action.payload;
      state.ids = state.ids.filter((shapeId) => shapeId !== id);
      delete state.data[id];
      if (state.selectedNodeId === id) {
        state.selectedNodeId = undefined;
      }
    },
  },
});

export default counterSlice.reducer;

export const { addShape, selectShape, deleteShape } = counterSlice.actions;
