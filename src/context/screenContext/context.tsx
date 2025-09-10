import type Konva from "konva";
import { createContext, useContext, type RefObject } from "react";

interface IScreenContext {
  transformNode: RefObject<Konva.Transformer | null>;
  saveTransformNode: (node: Konva.Transformer) => void;
  attachTransformerToNode(...nodes: Konva.Node[]): void;
}
export const ScreenContext = createContext<IScreenContext | null>(null);

export const useScreenContext = () => useContext(ScreenContext);
