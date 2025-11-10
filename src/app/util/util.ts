import type { FabricObject } from "node_modules/fabric/dist/fabric";

export function throttle<G = unknown, T extends Array<G> = G[], Y = unknown>(
  mainFunction: (...a: T) => Y,
  delay: number,
) {
  let timer: NodeJS.Timeout | null = null;
  return (...args: T): Promise<Y> => {
    return new Promise((res) => {
      if (timer === null) {
        const response = mainFunction(...args);
        res(response);
        timer = setTimeout(() => {
          timer = null;
        }, delay);
      }
    });
  };
}
export function getShapeCoordinates(object: FabricObject) {
  const width = object.width * object.scaleX + (object.strokeWidth || 0);
  const height = object.height * object.scaleY + (object.strokeWidth || 0);
  const left = object.left;
  const top = object.top;
  return { width, height, top, left };
}
