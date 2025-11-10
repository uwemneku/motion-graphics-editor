export type ShapeArgs = {
  rect: { width: number; height: number };
  circle: { radius: number };
  image: { src: string; width?: number; height?: number };
  text: { text: string; fontSize?: string; color?: string };
};
export type CreateShapeArgs = {
  [K in keyof ShapeArgs]: ShapeArgs[K] & { type: K; x?: number; y?: number; borderWidth?: number };
}[keyof ShapeArgs];
export type OffscreenCanvasInit = (
  canvas: OffscreenCanvas,
  width: number,
  height: number,
  devicePixelRatio: number,
) => void;

export type ShapeType = keyof ShapeArgs;
export type ShapeRecord = Record<string, { id: string; type: ShapeType }>;

export interface IOffscreenRenderer {
  init: OffscreenCanvasInit;
  onCanvasResize: (width: number, height: number) => void;
  onCanvasMouseMove: (x: number, y: number, isDragging?: boolean) => void;
  getShapeUsingCoordinates: (
    x: number,
    y: number,
  ) => {
    id: string;
    x: number;
    y: number;
    shapeWidth: number;
    shapeHeight: number;
  } | void;
  createShape: (args: CreateShapeArgs) => { id: string };
  modifyShape: (
    id: string,
    args: Partial<{
      x: number;
      y: number;
      radius: number;
      scaleX: number;
      scaleY: number;
      fill: string | number;
    }>,
  ) => void;
}

export type FrontendCallback = {
  getBoundingClientRect: () => DOMRect | undefined;
  updateCursor: (e: string) => void;
  onDeleteObject: (id: string) => void;
  onSelectShape: (id: string[]) => void;
  highlightShape: (width: number, height: number, top: number, left: number, angle: number) => void;
  clearShapeHighlight: () => void;
  "object:scaling": (id: string, width: number, height: number) => void;
  "object:rotating": (id: string, angle: number) => void;
  "object:moving": (id: string, left: number, top: number) => void;
};
