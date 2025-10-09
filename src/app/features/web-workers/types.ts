export type ShapeArgs = {
  rect: { width: number; height: number };
  circle: { radius: number };
  image: { src: ImageBitmap; width: number; height: number };
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
