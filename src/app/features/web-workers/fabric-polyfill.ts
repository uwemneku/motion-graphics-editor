import { MotionEditor } from "./app";
import { IS_WEB_WORKER } from "./globals";

if (IS_WEB_WORKER) {
  let isUpperCanvasCreated = false;
  self.document = {
    //@ts-expect-error createElement is declared globally.
    createElement: (args: string) => {
      switch (args) {
        // case "textarea": {
        //   return {
        //     addEventListener: () => {},
        //   };
        // }
        case "div":
          {
            return {
              style: {
                setProperty: () => {},
              },
              setAttribute: () => {},
              classList: {
                add: () => {},
                remove: () => {},
              },
              append: () => {},
              addEventListener: () => {},
              removeEventListener: () => {},
              ownerDocument: {
                documentElement: {
                  clientLeft: 0,
                },
                defaultView: {
                  getComputedStyle() {},
                },
              },
              defaultView: {},
            };
          }
          break;
        case "canvas": {
          let isUpperCanvas = false;

          class A extends OffscreenCanvas {
            constructor(width: number, height: number) {
              super(width, height);
            }
          }

          const canvas = isUpperCanvasCreated ? new A(100, 100) : MotionEditor.upperCanvas;
          isUpperCanvasCreated = true;

          Object.assign(canvas, {
            style: {
              setProperty: () => {},
            },

            getBoundingClientRect: async () => {
              const res = await MotionEditor.getUpperCanvasBoundingClient();
              return res;
            },
            hasAttribute: () => {},
            setAttribute: ((qualifiedName, value) => {
              if (qualifiedName === "data-fabric" && value == "top") {
                isUpperCanvas = true;
              }
            }) as HTMLElement["setAttribute"],
            addEventListener: (type: string, func: (...f: unknown[]) => void, options: object) => {
              if (isUpperCanvas) {
                // const [type, func = () => {}] = args;
                MotionEditor.fabricUpperCanvasEventListenersCallback[type] = (...g) => {
                  return func?.(...g);
                };
              }
            },
            removeEventListener() {},
            ownerDocument: {
              documentElement: {
                clientLeft: 0,
                addEventListener: () => {},
                removeEventListener: () => {},
              },
              addEventListener: () => {},
              removeEventListener: () => {},
              defaultView: {
                // attached resize observer to detect changes in size of the canvas
                addEventListener: () => {},
                getComputedStyle() {},
              },
            },
            classList: {
              add: () => {},
              remove: () => {},
            },
          });

          return canvas;
        }
        case "img": {
          class CustomImage {
            _src = "";
            _onLoad = () => {};
            _onError = () => {};
            constructor() {}
            set src(source: string) {
              if (!source) return;
              (async () => {
                try {
                  const imgBlob = await (await fetch(source)).blob();
                  const bitmapImage = await createImageBitmap(imgBlob);
                  this._onLoad();
                  console.log({ bitmapImage });
                } catch (error) {
                  this._onError();
                }
              })();
            }
            get src() {
              return this._src;
            }
            set onload(callback: () => void) {
              console.log({ callback });

              this._onLoad = callback;
            }
            set onError(callback: () => void) {
              this._onError = callback;
            }
          }
          return new CustomImage();
        }
        default:
      }
    },
  };

  const r = requestAnimationFrame;
  self.window = {
    // @ts-expect-error requestAnimationFrame is declared globally
    requestAnimationFrame: (...d) => {
      r(...d);
    },
    devicePixelRatio: 1,
    // @ts-expect-error this function is needed when fabric is working in a web worker
    getComputedStyle: () => {},
  };
}
