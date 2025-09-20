import type Konva from "konva";
import { createContext, useContext, type RefObject } from "react";

interface IScreenContext {
  transformNode: RefObject<Konva.Transformer | null>;
  saveTransformNode: (node: Konva.Transformer) => void;
  attachTransformerToNode(...nodes: Konva.Node[]): void;
  scrubPosition: RefObject<number>;
  setScrubPosition: (value: number) => void;
  setStageNode: (node: Konva.Stage | null) => void;
  getStageNode: () => Konva.Stage | null;
}
export const ScreenContext = createContext<IScreenContext | null>(null);

export const useScreenContext = () => useContext(ScreenContext);
