import { IS_WEB_WORKER } from "../web-workers/globals";
import { App } from "./rectangle";

if (IS_WEB_WORKER) {
  self.document = {
    //@ts-expect-error createElement is declared globally.
    createElement: (args: string) => {
      switch (args) {
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
              ownerDocument: {
                documentElement: {
                  clientLeft: 0,
                },
              },
              defaultView: {},
            };
          }
          break;
        case "canvas": {
          const id = crypto.randomUUID();

          const canvas = new OffscreenCanvas(100, 100);
          Object.assign(canvas, {
            style: {
              setProperty: () => {},
            },
            getBoundingClientRect: async () => {
              const res = await App.getUpperCanvasBoundingClient();
              return res;
            },
            hasAttribute: () => {},
            setAttribute: () => {},
            addEventListener: (...args: Parameters<HTMLCanvasElement["addEventListener"]>) => {
              const [type, func = () => {}, options = {}] = args;
              App.addEventListeners[type] = func;
            },
            ownerDocument: {
              documentElement: {
                clientLeft: 0,
                // addEventListener: () => {},
              },
              addEventListener: () => {},
              defaultView: {
                // attached resize observer to detect changes in size of the canvas
                addEventListener: () => {},
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
  self.window = {
    // @ts-expect-error requestAnimationFrame is declared globally
    requestAnimationFrame: () => {},
    devicePixelRatio: 2,
  };
}
