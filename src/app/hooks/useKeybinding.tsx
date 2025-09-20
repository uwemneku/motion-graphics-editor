import { useEffect } from "react";
import useTimeLine from "./useTimeLine";

function useKeybinding() {
  const selectNode = useTimeLine((e) => e.selectNode);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Example: Log the key that was pressed
      console.log(`Key pressed: ${e.key}`);
      // Add your keybinding logic here

      switch (e.key) {
        case "Delete":
        case "Backspace":
          {
            // Handle delete action
            console.log("Delete action triggered");
            const selectedShape = useTimeLine.getState().selectedNodeId;

            if (selectedShape) {
              useTimeLine.getState().deleteNode(selectedShape);
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
