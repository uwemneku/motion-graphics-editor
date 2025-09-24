import { useEffect } from "react";
import useTimeLine from "./useTimeLine";

function useKeybinding() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const timeLineState = useTimeLine.getState();

      switch (e.key) {
        case "Delete":
        case "Backspace":
          {
            const selectNode = timeLineState.selectNode;
            // Handle delete action
            console.log("Delete action triggered");
            const selectedShape = timeLineState.selectedNodeId;

            if (selectedShape) {
              timeLineState.deleteNode(selectedShape);
              selectNode(undefined);
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
            const isPlaying = timeLineState.timeline.isActive();
            const playHeadPosition = timeLineState.timeline.time();
            const progress = timeLineState.timeline.progress();
            if (isPlaying) timeLineState.togglePlayBack("pause");
            else timeLineState.togglePlayBack(playHeadPosition);
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
