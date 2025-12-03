import {
  ActiveSelection,
  Canvas,
  config,
  controlsUtils,
  Ellipse,
  FabricImage,
  FabricObject,
  FabricText,
  InteractiveFabricObject,
  Rect,
  Textbox,
  type BasicTransformEvent,
  type TPointerEvent,
  type TPointerEventInfo,
} from "fabric";
import { initAligningGuidelines } from "fabric/extensions";
import { IS_WEB_WORKER } from "./globals";
import type { CreateShapeArgs, FrontendCallback } from "./types";

// Needed handle missing API in worker
import type { EditorMode } from "@/types";
import { proxy } from "comlink";
import { addPropertiesToCanvas, debounce, getShapeCoordinates } from "../../util";
import { AnimatableObject, type AnimatableProperties } from "../shapes/animatable-object/object";
import "./fabric-polyfill";

type TransformEvent = BasicTransformEvent<TPointerEvent> & {
  target: FabricObject;
};

export class MotionEditor {
  /**Main fabric canvas instance */
  private canvas: Canvas;
  /**A record of all fabric object in the canvas */
  private shapeRecord = new Map<string, AnimatableObject>();
  /**ID of selected shapes in the canvas */
  private _selectedShapes: { id: string; property: Partial<{ left: number; top: number }> }[] = [];
  /**Fabric rect used to clip the canvas */
  private clipRect: Rect;

  /**Stores callback from the main thread */
  private frontEndCallBack: Partial<FrontendCallback> = {};
  private callBackIds = { animationFrameCallbackId: 0 };
  private reselectShape: (() => void) | undefined = undefined;
  private lastTime: number | null = performance.now();
  // private timeline = gsap.timeline({ paused: true });
  private debouncedAddKeyframe: typeof this.addKeyFrame;

  /* -------------------------------------------------------------------------- */
  // These static properties should only be used in web workers for polyfills to make fabric work from a webworker
  /* -------------------------------------------------------------------------- */
  /**Stores  callback functions for event listeners fired on the main canvas*/
  static fabricUpperCanvasEventListenersCallback: Record<string, (data: TPointerEvent) => void> =
    {};
  static upperCanvas: OffscreenCanvas;
  static getUpperCanvasBoundingClient = () => {};

  /* -------------------------------------------------------------------------- */
  /* -------------------------------------------------------------------------- */

  mainThreadTime = 0;
  mode: EditorMode = "animate";
  isPlaying: boolean = false;
  time = 0;
  totalDuration = 10;

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
      console.log({ IS_WEB_WORKER });
      if (IS_WEB_WORKER) {
        addPropertiesToCanvas(upperOffscreenCanvas as OffscreenCanvas, width, height);
        MotionEditor.upperCanvas = upperOffscreenCanvas as OffscreenCanvas;
        addPropertiesToCanvas(lowerOffscreenCanvas as OffscreenCanvas, width, height);
      }
    }

    // Default fabric object configurations
    config.configure({ devicePixelRatio });
    const controls = controlsUtils.createObjectDefaultControls();
    controls.mr.sizeX = controls.ml.sizeX = 5;
    controls.mr.sizeY = controls.ml.sizeY = 20;
    controls.mt.sizeY = controls.mb.sizeY = 5;
    controls.mt.sizeX = controls.mb.sizeX = 20;

    // Styles default controls
    InteractiveFabricObject.ownDefaults.originX = "center";
    InteractiveFabricObject.ownDefaults.originY = "center";
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
      uniformScaling: false,
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
    this.clipRect.top = this.clipRect.top * 0.8;
    this.clipRect.lockMovementX = true;
    this.clipRect.lockMovementY = true;
    this.clipRect.lockRotation = true;
    this.clipRect.centeredScaling = true;
    this.clipRect.strokeUniform = true;
    this.canvas.clipPath = this.clipRect;
    this.canvas.add(this.clipRect);

    this.fitCanvas(width, height);

    /* -------------------------------------------------------------------------- */
    this.debouncedAddKeyframe = debounce(this.addKeyFrame.bind(this), 100).bind(this);
    /* -------------------------------------------------------------------------- */
    /* -------------------------------------------------------------------------- */

    /* -------------------------------------------------------------------------- */

    /* -------------------------------------------------------------------------- */
    // Canvas event listeners
    /* -------------------------------------------------------------------------- */
    this.canvas.on("object:scaling", this.onObjectScale.bind(this));
    this.canvas.on("object:moving", this.onObjectMove.bind(this));
    this.canvas.on("object:rotating", this.onObjectRotate.bind(this));
    this.canvas.on("mouse:over", this.onObjectMouseOver.bind(this));

    this.canvas.on("mouse:dblclick", ({ target, subTargets }) => {
      if (target?.type === "text") {
        const _target = target as FabricText;
        const text = _target.text;
        const textAlign = _target.textAlign;
        const fontSize = _target.CACHE_FONT_SIZE;
      }
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
    this.canvas.on("mouse:out", () => {
      this.frontEndCallBack?.clearShapeHighlight?.();
    });
    initAligningGuidelines(this.canvas, { color: "rgb(81 162 255)" });
  }

  set selectedShapes(ids: string[]) {
    this.frontEndCallBack?.clearShapeHighlight?.();
    this.frontEndCallBack?.onSelectShape?.(ids);
    this._selectedShapes = ids.map((i) => {
      const shape = this.shapeRecord.get(i)?.fabricObject;
      return {
        id: i,
        property: {
          left: shape?.left,
          top: shape?.top,
        },
      };
    });
  }
  get selectedShapes() {
    return this._selectedShapes.map((i) => i.id);
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

  private onObjectScale(e: TransformEvent) {
    const keyframes: Parameters<typeof this.addKeyFrame> = [];
    this.selectedShapes?.forEach((id) => {
      const shape = this.shapeRecord.get(id)?.fabricObject;
      if (!shape) return;
      const shapeType = shape.type;
      const isTextBox = shapeType === "textbox";
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
      console.log(newWidth);

      keyframes.push([
        id,
        this.time,
        {
          width: newWidth,
          height: newHeight,
          left: shape.getX(),
          top: shape.getY(),
          ...(shape instanceof Ellipse
            ? {
                rx: shape.scaleX * shape.rx,
                ry: shape.scaleY * shape.ry,
              }
            : {}),
        },
      ]);
    });
    this.debouncedAddKeyframe(...keyframes);
  }

  private onObjectMove(e: TransformEvent) {
    const keyframes: Parameters<typeof this.addKeyFrame> = [];
    this.canvas.getActiveObjects().map((i) => {
      const shapeId = i.id;
      if (!shapeId) return;
      this.frontEndCallBack?.["object:moving"]?.(shapeId, i.getX(), i.getY());
      keyframes.push([shapeId, this.time, { left: i.getX(), top: i.getY() }]);
    });

    this.debouncedAddKeyframe(...keyframes);
  }

  private onObjectRotate(e: TransformEvent) {
    let objects: FabricObject[] = [];
    console.log(e);
    if ("_objects" in e.target) {
      objects = e.target._objects as FabricObject[];
    } else {
      objects = [e.target];
    }

    this.frontEndCallBack?.["object:rotating"]?.("", e.target.getTotalAngle());

    const keyframes: Parameters<typeof this.addKeyFrame> = [];
    objects?.forEach((shape) => {
      const shapeId = shape.id;
      if (!shapeId) return;
      let additionalProperties: Partial<AnimatableProperties> = {};
      // For group selection, rotating will chnage the x and y position of object
      if (this.selectedShapes.length > 1) {
        const { x, y } = shape.getXY();
        additionalProperties = { left: x, top: y };
      }

      keyframes.push([shapeId, this.time, { angle: e.target.angle, ...additionalProperties }]);
    });

    this.debouncedAddKeyframe(...keyframes);
  }

  private onObjectMouseOver(e: TPointerEventInfo<TPointerEvent>) {
    if (this.isPlaying) return;
    if (e.target) {
      const isActive = this.selectedShapes?.includes(e.target.id || "");
      console.log({ a: this.selectedShapes, t: e.target });

      const isMultipleItemsSelcted = this.selectedShapes.length > 1;
      if (isActive || isMultipleItemsSelcted) return;
      const coordinates = getShapeCoordinates(e.target);
      this.frontEndCallBack?.highlightShape?.(
        coordinates.width,
        coordinates.height,
        coordinates.top,
        coordinates.left,
        coordinates.angle,
      );
    }
  }

  addEventListener(
    ...args: {
      [key in keyof Required<FrontendCallback>]: [key, FrontendCallback[key]];
    }[keyof FrontendCallback]
  ) {
    switch (args[0]) {
      case "getBoundingClientRect":
        MotionEditor.getUpperCanvasBoundingClient = args[1];
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
        {
          const originalFunc = args[1];
          let isLocked = false;
          this.frontEndCallBack[args[0]] = (time) => {
            if (isLocked) return;
            isLocked = true;

            originalFunc?.(
              time,
              proxy((timestamp: number) => {
                isLocked = false;
              }),
            );
          };
        }
        break;
      case "registerFont":
        this.frontEndCallBack[args[0]] = args[1];
        break;
      case "keyframe:add":
        this.frontEndCallBack[args[0]] = args[1];
        break;
      case "keyframe:delete":
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
    if (type === "mousedown") {
      console.log("hello");
    }
    MotionEditor.fabricUpperCanvasEventListenersCallback[type]?.(data);
    this.canvas.renderAll();
  }

  private render() {
    this.canvas.renderAll();
    this.canvas.renderTop();
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
    const defaultStroke = "black";

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

          MotionEditor.loadFont();

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
            strokeWidth: 1,
            stroke: defaultStroke,
            hasControls: true,
          });
          shape = rect;
        }
        break;
      case "circle":
        {
          shape = new Ellipse({
            rx: 60,
            ry: 60,
            fill: defaultFill,
            stroke: defaultStroke,
            strokeWidth: 1,
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
        originX: "center", // or 'right', 'center', numeric value too
        originY: "center", // or 'bottom', 'center', numeric value too
      });

      this.canvas.centerObject(shape);
      this.shapeRecord.set(id, new AnimatableObject(shape));
      this.canvas.add(shape);
      return id;
    }
  }

  deleteShape(id: string) {
    const shape = this.shapeRecord.get(id)?.fabricObject;
    if (shape) {
      this.canvas.remove(shape);
      shape.dispose();
      this.shapeRecord.delete(id);
    }
  }

  selectShape(id: string) {
    const shape = this.shapeRecord.get(id)?.fabricObject;
    if (shape) {
      this.canvas.setActiveObject(shape);
      this.canvas.renderAll();
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
    const shape = this.shapeRecord.get(id)?.fabricObject;
    if (shape) {
      return getShapeCoordinates(shape);
    }
  }
  getShapeByCoordinates() {
    // this.canvas.findTarget({});
  }

  async getShapeImage(id: string) {
    const shape = this.shapeRecord.get(id)?.fabricObject;

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

  highlightShape(shape: string | FabricObject) {
    let _shape: FabricObject | undefined;

    if (typeof shape == "string") {
      const fabricObject = this.shapeRecord.get(shape)?.fabricObject;
      if (fabricObject) {
        _shape = fabricObject;
      }
    } else {
      _shape = shape;
    }

    if (!_shape || (_shape.id && this.selectedShapes.includes(_shape.id))) return;

    const coordinates = getShapeCoordinates(_shape);
    this.frontEndCallBack?.highlightShape?.(
      coordinates.width,
      coordinates.height,
      coordinates.top,
      coordinates.left,
      coordinates.angle,
    );
  }
  /* -------------------------------------------------------------------------- */
  // Animation functions
  /* -------------------------------------------------------------------------- */
  private addKeyFrame(
    ...args: [shapeId: string, time: number, keyframe: Partial<AnimatableProperties>][]
  ) {
    args.forEach((keyframeData) => {
      const [shapeId, time, keyframe] = keyframeData;
      const shape = this.shapeRecord.get(shapeId);
      if (!shape) return;

      Object.entries(keyframe).forEach((args) => {
        const [animatableProperty, value] = args as {
          [K in keyof AnimatableProperties]: [K, AnimatableProperties[K]];
        }[keyof AnimatableProperties];
        const keyframeDetails = shape.addKeyframe({
          property: animatableProperty as keyof AnimatableProperties,
          time,
          value,
          easing: "",
        });
        if (!keyframeDetails) return;

        this.frontEndCallBack["keyframe:add"]?.(
          shapeId,
          time,
          keyframeDetails,
          animatableProperty,
          value,
        );
      });
    });
  }

  onMouseUp() {}
  play() {
    this.isPlaying = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.startPlayingLoop.bind(this));
    // this.timeline.play();
  }
  startPlayingLoop(timestamp: number) {
    if (!this.isPlaying) return;

    if (this.lastTime == null) {
      this.lastTime = timestamp;
    }

    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    this.time += dt;

    this.seek(this.time);
    this.frontEndCallBack?.["timeline:update"]?.(this.time);

    if (this.time >= 10) {
      this.time = 0;
    }

    this.callBackIds.animationFrameCallbackId = requestAnimationFrame(
      this.startPlayingLoop.bind(this),
    );
  }
  pause() {
    this.isPlaying = false;
    cancelAnimationFrame(this.callBackIds.animationFrameCallbackId);
    this.lastTime = null;
    this.reselectShape?.();
  }
  seek(time: number) {
    const selectedShape = this.canvas.getActiveObjects();

    if (selectedShape.length > 0) {
      this.canvas.discardActiveObject();
      this.reselectShape = () => {
        const selection = new ActiveSelection([], { canvas: this.canvas });
        selection.multiSelectAdd(...selectedShape);
        this.canvas._hoveredTarget = selection;
        this.canvas.setActiveObject(selection);
        this.canvas.getActiveObjects().forEach((e) => e.setCoords());
        this.render();
        this.reselectShape = undefined;
      };
    }
    const _time = Math.min(this.totalDuration, Math.max(0, time));
    this.shapeRecord.forEach((shape) => {
      shape.seek(_time);
    });
    if (!this.isPlaying) {
      this.time = _time;
      this.shapeRecord.forEach((value) => {
        value.fabricObject.setCoords();
      });
      this.reselectShape?.();
    }
    this.canvas.renderAll();
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
