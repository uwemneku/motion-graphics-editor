import { Canvas, Circle, config, Object as fabricObject, Image, Rect } from "fabric";
import gsap from "gsap";
import { IS_WEB_WORKER } from "../web-workers/globals";
import type { CreateShapeArgs } from "../web-workers/types";
import AppImage from "./image";
import { type TransformerKeys } from "./transformhandle";

// Needed handle missing API in worker
import "./fabric-polyfill";

type AppShapes = AppImage;

export class App {
  //
  // The two properties are used to bound mouse events
  static addEventListeners: Record<string, unknown> = {};
  static getUpperCanvasBoundingClient = () => {};
  //
  //
  private canvas: Canvas;
  private shapeMap = new Map<string, AppShapes>();
  private transformhandle: TransformerKeys = "";
  private selectedShapeId = "";
  /**
   *  Multiply by this value to get the world equivalent
   *  Divide by this value to get the canvas equivalent
   */
  private sizeRelativeDimension = new Float32Array(2);

  constructor(
    lowerOffscreenCanvas: OffscreenCanvas,
    width: number,
    height: number,
    devicePixelRatio = 2,
  ) {
    if (IS_WEB_WORKER) {
      lowerOffscreenCanvas.width = width;
      lowerOffscreenCanvas.height = height;
      Object.assign(lowerOffscreenCanvas, {
        style: {
          width: `${width}px`,
          height: `${width}px`,
          isMain: true,
          // main-canvas-styles
          setProperty: () => {},
        },
        ownerDocument: {
          documentElement: {
            clientLeft: 0,
            addEventListener: () => {},
            defaultView: {},
          },
        },
        defaultView: {
          addEventListener: () => {},
        },
        hasAttribute: () => {},
        setAttribute: () => {},
        classList: {
          add: () => {},
        },
      });
    }

    config.configure({ devicePixelRatio });
    this.canvas = new Canvas(lowerOffscreenCanvas as unknown as HTMLCanvasElement, {
      enableRetinaScaling: true,
      width,
      height,
    });

    // this.canvas.add(helloWorld);
    // this.canvas.centerObject(helloWorld);

    this.fitCanvas(width, height);
    this.startRenderLoop();

    const f = () => {
      this.canvas.requestRenderAll();
      requestAnimationFrame(f);
    };
    // f();
    this.createImage("https://picsum.photos/100/100");
  }

  registerUpperC(s: Element["getBoundingClientRect"]) {
    App.getUpperCanvasBoundingClient = s;
  }

  fitCanvas(width: number, height: number) {
    const devicePixelRatio = config.devicePixelRatio;
    this.canvas.setDimensions({
      height: height * devicePixelRatio,
      width: width * devicePixelRatio,
    });
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.renderAll();
    this.render();
  }

  async createImage(src: string, options?: { width?: number; height?: number }) {
    try {
      const imgBlob = await (await fetch(src)).blob();
      const bitmapImage = await createImageBitmap(imgBlob);
      const offscreen = new OffscreenCanvas(bitmapImage.width, bitmapImage.height);
      const ctx = offscreen.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(bitmapImage, 0, 0);

      const fabricImage = new Image(offscreen as unknown as HTMLCanvasElement);
      if (options) {
        if (options.height) fabricImage.scaleToHeight(options.height);
        if (options.width) fabricImage.scaleToWidth(options.width);
      } else {
        const imageAspectRation = bitmapImage.width / bitmapImage.height;
        const maxImageWidth = this.canvas.width * 0.5;
        console.log(bitmapImage.width, this.canvas.width);
        if (bitmapImage.width > maxImageWidth) {
          fabricImage.scaleToWidth(maxImageWidth);
          fabricImage.scaleToHeight(maxImageWidth / imageAspectRation);
        }
      }

      this.canvas.add(fabricImage);
      this.canvas.centerObject(fabricImage);
      this.canvas.renderAll();
      return fabricImage;
    } catch (error) {
      console.log({ error });
    }
  }
  handleMouseCallback(type: keyof HTMLElementEventMap, data: any) {
    if (type === "mouseup") {
      this.canvas._onMouseUp(data);
      return;
    }

    App.addEventListeners[type]?.(data);
    this.canvas.renderAll();
  }

  private render() {
    this.canvas.renderAll();
    this.canvas.renderTop();
  }
  private startRenderLoop() {
    this.render();
    requestAnimationFrame(this.startRenderLoop.bind(this));
  }

  /**
   * The rate of change from the plane to at a z distance int he world
   * @param z The z axis to do calculation from
   * @returns
   */
  private getShapePositionChangeRatio = (z = 0) => {
    return { x: 0, y: 0 };
  };

  /* -------------------------------------------------------------------------- */
  /* -------------------------------------------------------------------------- */

  // Create shapes
  async createShape(args: CreateShapeArgs) {
    const shapeId = crypto.randomUUID();

    let shape: fabricObject | null = null;
    console.log({ args });

    switch (args.type) {
      case "rect":
        {
          const rect = new Rect({
            left: 0,
            top: 0,
            fill: "red",
            width: args.width,
            height: args.height,
            strokeWidth: 1,
            stroke: "#880E4F",
            rx: 0,
            ry: 0,
            hasControls: true,
          });
          shape = rect;
        }
        break;
      case "circle":
        {
          shape = new Circle({
            radius: 65,
            fill: "#039BE5",
            left: 0,
            stroke: "red",
            strokeWidth: 3,
          });
        }
        // createCircle(args.radius);
        break;
      case "image":
        {
          shape = await this.createImage(args.src);
          console.log({ gsap, shape });
        }
        break;
      default:
        console.warn("Unknown shape type", args);
    }
    if (shape) {
      this.canvas.add(shape);
      this.canvas.centerObject(shape);
      if (shape) {
        gsap.to(shape, {
          rotate: 10,
          top: 100,
          delay: 10,
          onComplete() {
            //  This is needed to update hitbox
            shape.setCoords();
          },
        });
      }
    }
  }

  onMouseUp() {
    this.transformhandle = "";
  }

  onMouseMove(
    change: { x: number; y: number },
    movementX: number,
    movementY: number,
    isMouseDown: boolean,
    shiftKey: boolean,
  ) {
    if (this.selectedShapeId && isMouseDown) {
      const selectedShape = this.shapeMap.get(this.selectedShapeId);
      if (!selectedShape) return;

      const { x, y } = this.getShapePositionChangeRatio(selectedShape.group.position.z);
      const pixelRatio = this.threeJsRenderer.getPixelRatio();
      const changeX = x * movementX * pixelRatio;

      if (this.transformhandle) {
        const _x = x * (change.x * 2) * pixelRatio;
        const _y = -y * (change.y * 2) * pixelRatio;
        const p = x * 10;
        this.transformerHandle.resize(_x, _y, this.transformhandle);
      } else {
        const changeY = -y * movementY * pixelRatio;
        selectedShape.group.position.x += changeX;
        selectedShape.group.position.y += changeY;
        this.transformerHandle.translate(changeX, changeY);
      }
      this.render();
    }
  }
  transformShape(
    shapeId: string,
    data: {
      /**Change in x position of shape */
      xChange?: number;
      /**Change in y position of shape */
      yChange?: number;
      /**Change in width */
      widthChange?: number;
      /**Change in height */
      heightChange?: number;
      /**Shape x scale */
      scaleX?: number;
      /**Shape y scale */
      scaleY?: number;
    },
  ) {
    const shapeGroup = this.shapeMap.get(shapeId)?.group;
    if (shapeGroup) {
      const { x, y } = this.getShapePositionChangeRatio(shapeGroup.position.z);
      if (data.xChange) {
        shapeGroup.position.x += x * data.xChange;
      }
      if (data.yChange) {
        shapeGroup.position.y += -y * data.yChange;
      }
      //
      shapeGroup.scale.x = data?.scaleX || shapeGroup.scale.x;
      shapeGroup.scale.y = data?.scaleY || shapeGroup.scale.y;
      //
      this.render();
    }
  }
}
