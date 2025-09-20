import Konva from "konva";
import { useRef, type PropsWithChildren } from "react";
import { ScreenContext } from "./context";

export default function ScreenContextProvider({ children }: PropsWithChildren) {
  const transformerRef = useRef<Konva.Transformer>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
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
      }}
    >
      {children}
    </ScreenContext.Provider>
  );
}
