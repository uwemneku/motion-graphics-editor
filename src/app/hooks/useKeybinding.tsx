import { useEffect } from "react";
import { useShapesRecordContext } from "../features/shapes/useShapesRecordContext";
import { useTimelineContext } from "../features/timeline/context/useTimelineContext";
import { dispatchableSelector, useAppDispatch } from "../store";

function useKeybinding() {
  const timelineContext = useTimelineContext();
  const shapeContext = useShapesRecordContext();
  const dispatch = useAppDispatch();
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Delete":
        case "Backspace":
          {
            const selectedShapeId = dispatch(
              dispatchableSelector((s) => s.shapes.selectedNodeId),
            );
            if (selectedShapeId) {
              shapeContext.deleteShape(selectedShapeId);
            }
          }
          break;
        case "z":
          if (e.ctrlKey || e.metaKey) {
            // Handle undo action
            console.log("Undo action triggered");
          }
          break;
        case "y":
          if (e.ctrlKey || e.metaKey) {
            // Handle redo action
            console.log("Redo action triggered");
          }
          break;
        case " ":
          {
            timelineContext.play();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
  return null;
}

export default useKeybinding;
