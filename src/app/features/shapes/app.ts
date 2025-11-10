import {
  Canvas,
  Circle,
  config,
  controlsUtils,
  FabricImage,
  FabricObject,
  InteractiveFabricObject,
  IText,
  Rect,
  type TPointerEvent,
} from "fabric";
import { IS_WEB_WORKER } from "../web-workers/globals";
import type { CreateShapeArgs, FrontendCallback } from "../web-workers/types";

// Needed handle missing API in worker
import { getShapeCoordinates } from "@/app/util/util";
import "./fabric-polyfill";

export class App {
  private canvas: Canvas;
  private shapeMap = new Map<string, FabricObject>();

  private _selectedShapes: string[] = [];
  private clipRect: Rect;
  private highlightRect: Rect;

  // These static properties should only be used in web workers
  static addUpperCanvasEventListeners: Record<string, (data: TPointerEvent) => void> = {};
  static getUpperCanvasBoundingClient = () => {};

  /**Stores callback from the main thread */
  private frontEndCallBack: Partial<FrontendCallback> = {};

  constructor(
    /**
     * In web worker environments, this should be an offscreenCanvas
     */
    lowerOffscreenCanvas: OffscreenCanvas | HTMLCanvasElement,
    width: number,
    height: number,
    devicePixelRatio = 2,
  ) {
    App.loadFont();
    {
      // Add missing properties to make offscreen canvas work in web worker
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
    }

    // Default fabric object configurations
    config.configure({ devicePixelRatio });
    const controls = controlsUtils.createObjectDefaultControls();
    controls.mr.sizeX = controls.ml.sizeX = 5;
    controls.mr.sizeY = controls.ml.sizeY = 20;
    controls.mt.sizeY = controls.mb.sizeY = 5;
    controls.mt.sizeX = controls.mb.sizeX = 20;

    InteractiveFabricObject.ownDefaults.strokeUniform = true;
    InteractiveFabricObject.ownDefaults = {
      ...InteractiveFabricObject.ownDefaults,
      cornerStrokeColor: "rgb(81 162 255)",
      cornerColor: "rgb(255 255 255)",
      cornerSize: 8,
      padding: 0,
      transparentCorners: false,
      borderColor: "rgb(81 162 255)",
      borderScaleFactor: 1.05,
      borderOpacityWhenMoving: 1,
      controls: {
        ...controls,
      },
    };

    this.canvas = new Canvas(lowerOffscreenCanvas as unknown as HTMLCanvasElement, {
      enableRetinaScaling: true,
      width,
      height,
      controlsAboveOverlay: true,
    });

    this.clipRect = new Rect({
      width: 400,
      height: 400,
      absolutePositioned: true,
      strokeWidth: 2,
      stroke: "#d1d5dc",
      fill: "white",
      top: 0,
      left: 0,
      evented: false,
      selectable: false,
    });

    this.highlightRect = new Rect({
      evented: false,
      selectable: false,
      strokeWidth: 2,
      stroke: "rgb(81 162 255)",
      width: 10,
      height: 10,
      fill: "transparent",
      opacity: 1,
    });

    // add and position clip rect
    this.clipRect.width = this.canvas.width * 0.6;
    this.clipRect.height = this.canvas.height * 0.6;
    this.canvas.centerObject(this.clipRect);
    this.clipRect.top = this.clipRect.top * 0.5;
    this.clipRect.lockMovementX = true;
    this.clipRect.lockMovementY = true;
    this.clipRect.lockRotation = true;
    this.clipRect.centeredScaling = true;
    this.clipRect.strokeUniform = true;
    this.canvas.clipPath = this.clipRect;
    this.canvas.add(this.clipRect);

    this.fitCanvas(width, height);
    this.startRenderLoop();

    this.canvas.on("object:scaling", ({ target }) => {
      const newWidth = target.scaleX * target.width;
      const newHeight = target.scaleY * target.height;
      this.frontEndCallBack?.["object:scaling"]?.(newWidth, newHeight);
    });
    this.canvas.on("object:rotating", ({ target }) => {
      this.frontEndCallBack?.["object:rotating"]?.(target.angle);
    });
    this.canvas.on("selection:created", () => {
      const ids = this.getActiveObjectsId();
      this.selectedShapes = ids;
    });
    this.canvas.on("selection:updated", () => {
      const ids = this.getActiveObjectsId();
      this.selectedShapes = ids;
    });
    this.canvas.on("selection:cleared", () => {
      const ids = this.getActiveObjectsId();
      this.selectedShapes = ids;
    });
    this.canvas.on("mouse:over", ({ target }) => {
      if (target) {
        const isActive = this.selectedShapes?.includes(target.id || "");
        if (isActive) return;
        const coordinates = getShapeCoordinates(target);
        this.frontEndCallBack?.highlightShape?.(
          coordinates.width,
          coordinates.height,
          coordinates.top,
          coordinates.left,
        );
      }
    });
    this.canvas.on("mouse:out", () => {
      this.frontEndCallBack?.clearShapeHighlight?.();
    });

    // currently used to test
    this.createShape({ type: "rect", height: 200, width: 100 });
  }

  set selectedShapes(ids: string[]) {
    this.frontEndCallBack?.clearShapeHighlight?.();
    this.frontEndCallBack?.onSelectShape?.(ids);
    this._selectedShapes = ids;
  }
  get selectedShapes() {
    return this._selectedShapes;
  }

  addEventListener(
    ...args: {
      [key in keyof Required<FrontendCallback>]: [key, FrontendCallback[key]];
    }[keyof FrontendCallback]
  ) {
    switch (args[0]) {
      case "getBoundingClientRect":
        App.getUpperCanvasBoundingClient = args[1];
        break;
      case "updateCursor":
        this.canvas.setCursor = args[1];
        break;
      case "object:scaling":
        this.frontEndCallBack[args[0]] = args[1];
        break;
      case "object:rotating":
        this.frontEndCallBack[args[0]] = args[1];
        break;
      case "highlightShape":
        this.frontEndCallBack[args[0]] = args[1];
        break;
      case "clearShapeHighlight":
        this.frontEndCallBack[args[0]] = args[1];
        break;
      case "onSelectShape":
        this.frontEndCallBack[args[0]] = args[1];
        break;
      default: {
        const key = args[0];
        this.frontEndCallBack[key] = args[1];
      }
    }
  }

  fitCanvas(width: number, height: number) {
    const devicePixelRatio = config.devicePixelRatio;
    if (IS_WEB_WORKER) {
      this.canvas.setDimensions({
        height: height * devicePixelRatio,
        width: width * devicePixelRatio,
      });
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.canvas.renderAll();
    this.render();
  }

  private async createImage(src: string, options?: { width?: number; height?: number }) {
    try {
      const imgBlob = await (await fetch(src)).blob();
      const bitmapImage = await createImageBitmap(imgBlob);
      const offscreen = new OffscreenCanvas(bitmapImage.width, bitmapImage.height);
      const ctx = offscreen.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(bitmapImage, 0, 0);

      const fabricImage = new FabricImage(offscreen as unknown as HTMLCanvasElement, {
        height: bitmapImage.height,
        width: bitmapImage.width,
        left: 0,
        top: 0,
      });
      fabricImage.getSrc = () => src;

      const previewCanvas = new OffscreenCanvas(bitmapImage.height / 2, bitmapImage.width / 2);
      previewCanvas.getContext("2d")?.drawImage(bitmapImage, 0, 0);
      previewCanvas.convertToBlob().then(async (blob) => {
        const url = URL.createObjectURL(blob);
        fabricImage.previewImage = url;
      });

      if (options) {
        if (options.height) fabricImage.scaleToHeight(options.height);
        if (options.width) fabricImage.scaleToWidth(options.width);
      } else {
        const imageAspectRation = bitmapImage.width / bitmapImage.height;
        const maxImageWidth = this.clipRect.width * 0.7;
        const maxImageHeight = this.clipRect.height * 0.7;

        if (fabricImage.width > maxImageWidth) {
          fabricImage.scaleToWidth(maxImageWidth);
          fabricImage.scaleToHeight(maxImageWidth / imageAspectRation);
        }

        if (fabricImage.height > maxImageHeight) {
          fabricImage.scaleToHeight(maxImageHeight);
          fabricImage.scaleToWidth(maxImageHeight * imageAspectRation);
        }
      }
      fabricImage.dirty = true;
      return fabricImage;
    } catch (error) {
      console.log({ error });
    }
  }

  //
  handleMouseCallback(type: keyof HTMLElementEventMap, data: TPointerEvent) {
    if (type === "mouseup") {
      this.canvas._onMouseUp(data);
      return;
    }
    App.addUpperCanvasEventListeners[type]?.(data);
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

  /* -------------------------------------------------------------------------- */
  /* -------------------------------------------------------------------------- */

  async createShape(args: CreateShapeArgs) {
    let shape: FabricObject | null = null;
    const id = crypto.randomUUID();
    const defaultFill = "skyblue";
    const defaultStroke = "darkblue";

    switch (args.type) {
      case "text":
        {
          const text = new IText(args.text, {
            fontFamily: "lato",
          });
          shape = text;
        }
        break;
      case "rect":
        {
          const rect = new Rect({
            left: 0,
            top: 0,
            fill: defaultFill,
            width: args.width,
            height: args.height,
            strokeWidth: 2,
            stroke: defaultStroke,
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
            fill: defaultFill,
            left: 0,
            stroke: defaultStroke,
            strokeWidth: 3,
          });
        }
        break;
      case "image":
        {
          const _shape = await this.createImage(args.src);
          if (_shape) {
            shape = _shape;
          }
        }
        break;
      default:
        console.warn("Unknown shape type", args);
    }
    if (shape) {
      shape.id = id;
      this.shapeMap.set(id, shape);
      this.canvas.centerObject(shape);
      this.canvas.add(shape);
      return id;
    }
  }

  deleteShape(id: string) {
    const shape = this.shapeMap.get(id);
    if (shape) {
      this.canvas.remove(shape);
      shape.dispose();
      this.shapeMap.delete(id);
    }
  }

  selectShape(id: string) {
    const shape = this.shapeMap.get(id);
    if (shape) {
      this.canvas.setActiveObject(shape);
    }
  }

  deleteSelectedShapes() {
    const activeSelections = this.canvas.getActiveObjects();
    activeSelections.forEach((object) => {
      const id = object.id;
      if (id) {
        this.deleteShape(id);
      }
    });
    this.canvas.discardActiveObject();
  }

  getActiveObjectsId() {
    const ids = this.canvas
      .getActiveObjects()
      ?.map((i) => i.id)
      ?.filter((i): i is string => Boolean(i));

    return ids;
  }

  getShapeCoordinatesByID(id: string) {
    const shape = this.shapeMap.get(id);
    if (shape) {
      return getShapeCoordinates(shape);
    }
  }

  async getShapeImage(id: string) {
    const shape = this.shapeMap.get(id);
    if (shape) {
      if (shape instanceof FabricImage) {
        const canvas = shape._element as unknown as OffscreenCanvas;
        const blob = await canvas.convertToBlob({ quality: 0.5, type: "image/jpeg" });
        return await URL.createObjectURL(blob);
      }

      const t = shape.toCanvasElement({
        withoutShadow: true,
        enableRetinaScaling: false,
        multiplier: 0.5,
      }) as unknown as OffscreenCanvas;
      const b = await t.convertToBlob();
      return await URL.createObjectURL(b);
    }
  }
  onMouseUp() {}

  onMouseMove(
    change: { x: number; y: number },
    movementX: number,
    movementY: number,
    isMouseDown: boolean,
    shiftKey: boolean,
  ) {
    // if (this.selectedShapeId && isMouseDown) {
    //   const selectedShape = this.shapeMap.get(this.selectedShapeId);
    //   if (!selectedShape) return;
    //   this.render();
    // }
  }

  static async loadFont() {
    const fontUrl = new URL("./f.woff2", import.meta.url);
    const buffer = await (await fetch(fontUrl)).arrayBuffer();
    const font = new FontFace("lato", `url(${fontUrl.href})`);
    self.fonts.add(font);
    await font.load();
    console.log("loaded");
  }
}
