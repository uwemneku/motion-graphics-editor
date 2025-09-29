import Konva from "konva";
import { useRef, type PropsWithChildren } from "react";
import { ScreenContext } from "./context";

export default function ScreenContextProvider({ children }: PropsWithChildren) {
  const transformerRef = useRef<Konva.Transformer>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const screenContainerRef = useRef<HTMLDivElement>(null);
  const scrubPosition = useRef(0);

  function saveTransformNode(node: Konva.Transformer) {
    transformerRef.current = node;
  }

  function setStageNode(node: Konva.Stage | null) {
    stageRef.current = node;
  }

  function getStageNode() {
    return stageRef.current;
  }

  const attachTransformerToNode = (...nodes: Konva.Node[]) => {
    const _nodes = nodes;
    transformerRef?.current?.nodes(_nodes);
  };
  const setScrubPosition = (value: number) => {
    scrubPosition.current = value;
  };
  const saveScreenContainerRef = (node: HTMLDivElement | null) => {
    screenContainerRef.current = node;
  };
  const getScreenContainerRef = () => screenContainerRef.current;

  const fitStageToViewport = () => {
    const stage = stageRef.current;
    const container = screenContainerRef.current;
    stage?.to({
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      duration: 0.3,
      easing: Konva.Easings.EaseInOut,
    });
    if (!container) return;
    container.style.setProperty("--left-width", "var(--init-x)");
    container.style.setProperty("--right-width", "var(--init-x)");
    container.style.setProperty("--top-height", "var(--init-y)");
    container.style.setProperty("--bottom-height", "var(--init-y)");
  };

  return (
    <ScreenContext.Provider
      value={{
        attachTransformerToNode,
        saveTransformNode,
        transformNode: transformerRef,
        scrubPosition,
        setScrubPosition,
        getStageNode,
        setStageNode,
        fitStageToViewport,
        saveScreenContainerRef,
        getScreenContainerRef,
      }}
    >
      {children}
    </ScreenContext.Provider>
  );
}
