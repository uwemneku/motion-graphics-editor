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
            const selectedShapeId = timeLineState.selectedNodeId;
            const node = timeLineState.nodes?.[selectedShapeId || ""];
            node?.element?.destroy();
            // Handle delete action
            console.log("Delete action triggered");

            if (selectedShapeId) {
              timeLineState.deleteNode(selectedShapeId);
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
            useTimeLine.getState().togglePlayBack();
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
