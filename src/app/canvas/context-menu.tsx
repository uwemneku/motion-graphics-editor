import { useScreenContext } from "../context/screenContext/context";
import useTimeLine from "../hooks/useTimeLine";

function ContextMenu() {
  const selectedNode = useTimeLine(
    (e) => e.nodes[e.selectedNodeId || ""]?.element,
  );
  const screenContext = useScreenContext();
  console.log("selectedNode", { selectedNode });

  if (!selectedNode) return null;

  const stage = screenContext?.getStageNode();
  const stageScale = stage?.scaleX() || 1;
  const X_OFFSET = 10;
  const mousePosition = stage?.getPointerPosition() || {
    x: 0,
    y: 0,
  };
  const mouseRelativePosition = selectedNode.getRelativePointerPosition() || {
    x: 0,
    y: 0,
  };

  selectedNode.getRelativePointerPosition();
  const left =
    mousePosition.x +
    (selectedNode.width() - mouseRelativePosition.x) * stageScale +
    X_OFFSET;

  return (
    <div
      className="fixed z-30 border bg-red-400 p-10"
      style={{
        top: mousePosition.y,
        left,
      }}
    >
      ContextMenu
      <div>
        <input
          type="text"
          placeholder="border"
          onChange={(e) => {
            const sanitizedValue = e.target.value.replace(/\D/g, "");
            if ("strokeWidth" in selectedNode)
              selectedNode.strokeWidth(parseInt(sanitizedValue));
          }}
        />
      </div>
    </div>
  );
}

export default ContextMenu;
