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

//
export function debounce<G = unknown, T extends Array<G> = G[], Y = unknown>(
  func: (...a: T) => Y,
  delay: number,
) {
  let timer: NodeJS.Timeout | null = null;
  return (...args: T): Promise<Y> => {
    if (timer) clearTimeout(timer);
    return new Promise((res) => {
      timer = setTimeout(() => {
        const response = func(...args);
        res(response);
      }, delay);
    });
  };
}

//
export function getShapeCoordinates(object: FabricObject) {
  const width = object.width * object.scaleX + (object.strokeWidth || 0);
  const height = object.height * object.scaleY + (object.strokeWidth || 0);
  const left = object.left;
  const top = object.top;
  return { width, height, top, left, angle: object.angle };
}

/**Adds polyfill properties to lower canvas to make it work in a web worker */
export function addPropertiesToCanvas(canvas: OffscreenCanvas, width: number, height: number) {
  canvas.width = width;
  canvas.height = height;
  Object.assign(canvas, {
    style: {
      width: `${width}px`,
      height: `${width}px`,
      isMain: true,
      // main-canvas-styles
      setProperty: () => {},
    },
    addEventListener: () => {},

    ownerDocument: {
      ...self.document,
      documentElement: {
        clientLeft: 0,
        addEventListener: () => {},
      },
      defaultView: {
        getComputedStyle() {},
      },
    },
    hasAttribute: () => {},
    setAttribute: () => {},
    classList: {
      add: () => {},
    },
  });
}
