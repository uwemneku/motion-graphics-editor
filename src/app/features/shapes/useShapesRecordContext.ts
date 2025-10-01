import type { Node, NodeConfig } from "konva/lib/Node";
import { createContext, useContext } from "react";

export interface IShapesRecordContext {
  shapesRecord: Record<string, { node: Node<NodeConfig> }>;
  saveShape: (id: string, node: Node<NodeConfig>) => void;
  deleteShape: (id: string) => void;
  getShape: (id: string) => Node<NodeConfig> | undefined;
}
export const ShapesRecordContext = createContext<IShapesRecordContext>({
  shapesRecord: {},
  saveShape: () => {},
  deleteShape: () => {},
  getShape: () => undefined,
});
export const useShapesRecordContext = () => {
  return useContext(ShapesRecordContext);
};
