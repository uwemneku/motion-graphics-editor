import Konva from "konva";
import { useRef, type PropsWithChildren } from "react";
import { ScreenContext } from "./context";

export default function ScreenContextProvider({ children }: PropsWithChildren) {
  const transformerRef = useRef<Konva.Transformer>(null);
  function saveTransformNode(node: Konva.Transformer) {
    transformerRef.current = node;
  }

  const attachTransformerToNode = (...nodes: Konva.Node[]) => {
    const _nodes = nodes;
    transformerRef?.current?.nodes(_nodes);
  };

  return (
    <ScreenContext.Provider
      value={{
        attachTransformerToNode,
        saveTransformNode,
        transformNode: transformerRef,
      }}
    >
      {children}
    </ScreenContext.Provider>
  );
}
