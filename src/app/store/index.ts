import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector, useStore } from "react-redux";
import { counterSlice } from "../features/shapes/slice";
import { timelineSlice } from "../features/timeline/slice";

export const store = configureStore({
  reducer: {
    [counterSlice.name]: counterSlice.reducer,
    [timelineSlice.name]: timelineSlice.reducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = useDispatch.withTypes<AppDispatch>(); // Export a hook that can be reused to resolve types
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppStore = useStore.withTypes<typeof store>();
export function dispatchableSelector<T>(selector: (state: RootState) => T) {
  return (_: unknown, getState: () => RootState) => selector(getState());
}
