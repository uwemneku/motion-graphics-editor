import {
  Canvas,
  Circle,
  config,
  controlsUtils,
  FabricImage,
  FabricObject,
  FabricText,
  InteractiveFabricObject,
  Rect,
  Textbox,
  type TPointerEvent,
} from "fabric";
import gsap from "gsap";
import { IS_WEB_WORKER } from "./globals";
import type { CreateShapeArgs, FrontendCallback } from "./types";

// Needed handle missing API in worker
import { addPropertiesToCanvas, debounce, getShapeCoordinates } from "@/app/util/util";
import type { AnimatableProps, EditorMode, KeyFrame } from "@/types";
import "./fabric-polyfill";

export class App {
  /**Main fabric canvas instance */
  private canvas: Canvas;
  /**A record of all fabric object in the canvas */
  private shapeRecord = new Map<string, FabricObject>();
  /**Selected shapes in the canvas */
  private _selectedShapes: string[] = [];
  /**Fabric rect used to clip the canvas */
  private clipRect: Rect;

  private timeLine = new AppTimeline(10);

  /**Stores callback from the main thread */
  private frontEndCallBack: Partial<FrontendCallback> = {};

  /* -------------------------------------------------------------------------- */
  // These static properties should only be used in web workers for polyfills to make fabric work from a webworker
  /* -------------------------------------------------------------------------- */
  /**Stores  callback functions for event listeners fired on the main canvas*/
  static fabricUpperCanvasEventListenersCallback: Record<string, (data: TPointerEvent) => void> =
    {};
  static upperCanvas: OffscreenCanvas;
  static getUpperCanvasBoundingClient = () => {};
  /* -------------------------------------------------------------------------- */

  mainThreadTime = 0;
  mode: EditorMode = "animate";

  constructor(
    /**
     * In web worker environments, this should be an offscreenCanvas
     */
    lowerOffscreenCanvas: OffscreenCanvas | HTMLCanvasElement,
    upperOffscreenCanvas: OffscreenCanvas | HTMLCanvasElement,
    /**Canvas width */
    width: number,
    /**Canvas height */
    height: number,
    /**Device pixel ratio */
    devicePixelRatio = 2,
  ) {
    // TODO: remove this as it was only added to test loading fonts
    {
      // Add missing properties to make offscreen canvas work in web worker
      if (IS_WEB_WORKER) {
        addPropertiesToCanvas(upperOffscreenCanvas as OffscreenCanvas, width, height);
        App.upperCanvas = upperOffscreenCanvas as OffscreenCanvas;
        addPropertiesToCanvas(lowerOffscreenCanvas as OffscreenCanvas, width, height);
      }
    }

    /* -------------------------------------------------------------------------- */
    this.timeLine.parentTimeLine.eventCallback("onUpdate", () => {
      this.frontEndCallBack?.["timeline:update"]?.(this.timeLine.parentTimeLine.time());
    });
    /* -------------------------------------------------------------------------- */

    // Default fabric object configurations
    config.configure({ devicePixelRatio });
    const controls = controlsUtils.createObjectDefaultControls();
    controls.mr.sizeX = controls.ml.sizeX = 5;
    controls.mr.sizeY = controls.ml.sizeY = 20;
    controls.mt.sizeY = controls.mb.sizeY = 5;
    controls.mt.sizeX = controls.mb.sizeX = 20;

    // Styles default controls
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
    this.createShape({ type: "text", text: "Hello hello hello hello" });

    /* -------------------------------------------------------------------------- */
    const onMoveEnd = debounce(this.onMoveEnd.bind(this), 100).bind(this);
    /* -------------------------------------------------------------------------- */

    /* -------------------------------------------------------------------------- */
    // Canvas event listeners
    /* -------------------------------------------------------------------------- */
    this.canvas.on("mouse:dblclick", ({ target, subTargets }) => {
      if (target?.type === "text") {
        const _target = target as FabricText;
        const text = _target.text;
        const textAlign = _target.textAlign;
        const fontSize = _target.CACHE_FONT_SIZE;
        console.log({ text, textAlign, fontSize, target });
      }
    });
    this.canvas.on("object:scaling", (e) => {
      console.log(e);

      this.selectedShapes?.forEach((id) => {
        const shape = this.shapeRecord.get(id);
        if (!shape) return;
        const isTextBox = shape.type === "textbox";
        /* -------------------------------------------------------------------------- */
        // in web worker this is needed to recalculate text wrapping
        if (IS_WEB_WORKER && isTextBox) {
          const _shape = shape as Textbox;
          _shape.width = _shape.scaleX * _shape.width;
          _shape.height = _shape.scaleY * _shape.height;
          _shape.scaleX = 1;
          _shape.scaleY = 1;
          _shape.initialized = true;
          _shape.initDimensions();
          _shape.dirty = true;
        }
        /* -------------------------------------------------------------------------- */

        const newWidth = shape.scaleX * shape.width;
        const newHeight = shape.scaleY * shape.height;
        this.frontEndCallBack?.["object:scaling"]?.(id, newWidth, newHeight);
      });
    });
    this.canvas.on("object:rotating", ({ target }) => {
      this.selectedShapes?.forEach((id) => {
        const shape = this.shapeRecord.get(id);
        if (!shape) return;
        this.frontEndCallBack?.["object:rotating"]?.(id, target.angle);
      });
    });
    this.canvas.on("object:moving", ({ target }) => {
      this.selectedShapes?.forEach((id) => {
        const shape = this.shapeRecord.get(id);
        if (!shape) return;
        this.frontEndCallBack?.["object:moving"]?.(id, shape.left, shape.top);
        onMoveEnd(id, target.left, target.top);
      });
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
        const isMultipleItemsSelcted = this.selectedShapes.length > 1;
        if (isActive || isMultipleItemsSelcted) return;
        const coordinates = getShapeCoordinates(target);
        this.frontEndCallBack?.highlightShape?.(
          coordinates.width,
          coordinates.height,
          coordinates.top,
          coordinates.left,
          coordinates.angle,
        );
      }
    });
    this.canvas.on("mouse:out", () => {
      this.frontEndCallBack?.clearShapeHighlight?.();
    });
  }

  set selectedShapes(ids: string[]) {
    this.frontEndCallBack?.clearShapeHighlight?.();
    this.frontEndCallBack?.onSelectShape?.(ids);
    this._selectedShapes = ids;
  }
  get selectedShapes() {
    return this._selectedShapes;
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
      case "object:moving":
        this.frontEndCallBack[args[0]] = args[1];
        break;
      case "timeline:update":
        this.frontEndCallBack[args[0]] = args[1];
        break;
      case "registerFont":
        this.frontEndCallBack[args[0]] = args[1];
        break;
      default: {
        const key = args[0];
        this.frontEndCallBack[key] = args[1];
      }
    }
  }
  handleMouseCallback(type: keyof HTMLElementEventMap, data: TPointerEvent) {
    if (type === "mouseup") {
      this.canvas._onMouseUp(data);
      return;
    }
    App.fabricUpperCanvasEventListenersCallback[type]?.(data);
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

  private async createImage(src: string, options?: { width?: number; height?: number }) {
    try {
      console.log("loading image");
      const imgBlob = await (await fetch(src)).blob();
      const bitmapImage = await createImageBitmap(imgBlob);
      const offscreen = new OffscreenCanvas(bitmapImage.width, bitmapImage.height);
      const ctx = offscreen.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(bitmapImage, 0, 0);

      console.log("Loading image into fabric");
      const fabricImage = new FabricImage(offscreen as unknown as HTMLCanvasElement, {
        height: bitmapImage.height,
        width: bitmapImage.width,
        left: 0,
        top: 0,
      });
      // fabricImage.getSrc = () => src;

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

  async createShape(args: CreateShapeArgs) {
    let shape: FabricObject | null = null;
    const id = crypto.randomUUID();
    const defaultFill = "lightgray";
    const defaultStroke = "darkgray";

    switch (args.type) {
      case "text":
        {
          const text = new Textbox(args.text, {
            textAlign: "center",
            fontSize: 20,
            fontStyle: "normal",
          });
          text.editable = false;
          text.setControlsVisibility({ mt: false, mb: false });
          text.on("mousedown", () => {
            text.fontFamily = "lato";
            text.set("dirty", true);
          });

          App.loadFont();

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
            //@ts-expect-error TODO: Read up on why FabricObject cannot be type casted to FabricImage
            shape = _shape;
          }
        }
        break;
      default:
        console.warn("Unknown shape type", args);
    }
    if (shape) {
      shape.id = id;
      shape.set({
        originX: 0.5, // or 'right', 'center', numeric value too
        originY: 0.5, // or 'bottom', 'center', numeric value too
      });

      this.shapeRecord.set(id, shape);
      this.canvas.centerObject(shape);
      this.canvas.add(shape);
      this.timeLine.parentTimeLine.to(shape, { top: shape.top, left: shape.left, duration: 0 }, 0);
      return id;
    }
  }

  deleteShape(id: string) {
    const shape = this.shapeRecord.get(id);
    if (shape) {
      this.canvas.remove(shape);
      shape.dispose();
      this.shapeRecord.delete(id);
    }
  }

  selectShape(id: string) {
    const shape = this.shapeRecord.get(id);
    if (shape) {
      this.canvas.setActiveObject(shape);
    }
  }

  deleteSelectedShapes() {
    const ids: string[] = [];
    const activeSelections = this.canvas.getActiveObjects();
    activeSelections.forEach((object) => {
      const id = object.id;
      if (id) {
        this.deleteShape(id);
        ids.push(id);
      }
    });
    this.canvas.discardActiveObject();
    return ids;
  }

  getActiveObjectsId() {
    const ids = this.canvas
      .getActiveObjects()
      ?.map((i) => i.id)
      ?.filter((i): i is string => Boolean(i));

    return ids;
  }

  getShapeCoordinatesByID(id: string) {
    const shape = this.shapeRecord.get(id);
    if (shape) {
      return getShapeCoordinates(shape);
    }
  }
  getShapeByCoordinates() {
    this.canvas.findTarget({});
  }

  async getShapeImage(id: string) {
    const shape = this.shapeRecord.get(id);
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

  private onMoveEnd(...[id, left, top]: Parameters<FrontendCallback["object:moving"]>) {
    const shape = this.shapeRecord.get(id);
    if (!shape) return;
    const keyframes = shape?.keyFrames;
    const timeStamp = this.timeLine.parentTimeLine.time();
    const tl = this.timeLine.parentTimeLine;

    if (!keyframes) {
      console.log({ keyframes, timeStamp, left, top });
      this.timeLine.parentTimeLine.to(
        shape,
        {
          left,
          top,
          duration: 4,
          onUpdate() {
            const timeStamp = tl.time();
            console.log({ timeStamp });
          },
          onComplete() {
            const timeStamp = tl.time();
            console.log("complete", { timeStamp });
          },
        },
        1,
      );
      return;
    }
  }
  onMouseUp() {}
  play() {
    if (this.timeLine.parentTimeLine.isActive()) {
      this.timeLine.parentTimeLine.pause();
      return;
    }
    this.frontEndCallBack.clearShapeHighlight?.();
    this.canvas.discardActiveObject();
    this.timeLine.parentTimeLine.play();
  }
  seek(...args: Parameters<gsap.core.Timeline["seek"]>) {
    this.frontEndCallBack.clearShapeHighlight?.();
    this.canvas.discardActiveObject();
    this.timeLine.parentTimeLine.seek(...args);
  }

  static async loadFont() {
    try {
      const fontUrl = new URL("./f.woff2", import.meta.url);
      // const buffer = await (await fetch(fontUrl)).arrayBuffer();
      console.log(fontUrl.href);

      const font = new FontFace("lato", `url(${fontUrl.href})`);
      //@ts-expect-error TODO: figure out how to add self.fonts to type declaration
      self.fonts.add(font);

      await font.load();

      // this.frontEndCallBack.registerFont?.("lato", fontUrl.href);
    } catch (error) {
      console.log({ error });
    }
  }
}

class AppTimeline {
  parentTimeLine = gsap.timeline({ paused: true });

  constructor(duration: number) {
    this.parentTimeLine.to({}, { duration });
  }
  addAnimation(object: FabricObject, keyframe: KeyFrame, startTime: number, duration: number) {
    for (const key in keyframe.animatable) {
      if (!Object.hasOwn(keyframe.animatable, key)) continue;
      const value = keyframe.animatable[key as keyof AnimatableProps];
      const animationKey = `${object.id}-${value}-${startTime}`;
      this.parentTimeLine.remove(animationKey);
      this.parentTimeLine.to(object, { [key]: value, id: animationKey, duration }, startTime);
    }
  }
}
