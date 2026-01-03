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
  StaticCanvas,
  Textbox,
  type BasicTransformEvent,
  type TPointerEvent,
  type TPointerEventInfo,
} from "fabric";
import { initAligningGuidelines } from "fabric/extensions";
import {
  BufferTarget,
  CanvasSource,
  getFirstEncodableVideoCodec,
  Mp4OutputFormat,
  Output,
  QUALITY_VERY_HIGH,
} from "mediabunny";
import { IS_WEB_WORKER } from "./globals";
import type { CreateShapeArgs, FrontendCallback, MainThreadFunctions } from "./types";

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

  /**Stores callback from the main thread for when actions happens in the worker*/
  private frontEndCallBack: Partial<FrontendCallback> = {};
  #frontendFunctions: Partial<{
    [key in keyof MainThreadFunctions]: (
      ...args: Parameters<MainThreadFunctions[key]>
    ) => Promise<ReturnType<MainThreadFunctions[key]>>;
  }> = {};
  /**The minimum time after which the frontend "timeline:update" callback is called */
  #nextFrontendTickTime = 0;
  /**The average time ti takes for the frontend to receive and render timeline update */
  #frontendTickDelay?: number;

  private reselectShape: (() => void) | undefined = undefined;
  private debouncedAddKeyframe: typeof this.addKeyFrame;

  /* -------------------------------------------------------------------------- */
  /* -------------------------------------------------------------------------- */
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
  /* -------------------------------------------------------------------------- */

  mode: EditorMode = "animate";
  totalDuration = 10;
  timeline = new Timeline(10, true);

  /* -------------------------------------------------------------------------- */
  /* -------------------------------------------------------------------------- */
  /* -------------------------------------------------------------------------- */

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
      console.info({ IS_WEB_WORKER });
      if (IS_WEB_WORKER) {
        addPropertiesToCanvas(upperOffscreenCanvas as OffscreenCanvas, width, height);
        MotionEditor.upperCanvas = upperOffscreenCanvas as OffscreenCanvas;
        addPropertiesToCanvas(lowerOffscreenCanvas as OffscreenCanvas, width, height);
      }
    }
    // Default fabric object configurations
    config.configure({ devicePixelRatio });
    addCustomControls();

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
    // Canvas event listeners
    /* -------------------------------------------------------------------------- */
    this.canvas.on("object:scaling", this.onObjectScale.bind(this));
    this.canvas.on("object:moving", this.onObjectMove.bind(this));
    this.canvas.on("object:rotating", this.onObjectRotate.bind(this));
    this.canvas.on("mouse:over", this.onObjectMouseOver.bind(this));

    this.canvas.on("mouse:dblclick", ({ target, subTargets }) => {
      if (this.timeline.isPlaying) return;
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
      if (this.timeline.isPlaying) return;
      this.frontEndCallBack?.clearShapeHighlight?.();
    });

    /* -------------------------------------------------------------------------- */
    /* -------------------------------------------------------------------------- */
    initAligningGuidelines(this.canvas, { color: "rgb(81 162 255)" });
    /* -------------------------------------------------------------------------- */
    /* -------------------------------------------------------------------------- */

    /* -------------------------------------------------------------------------- */
    /* -------------------------------------------------------------------------- */
    const COUNT = 20;
    const frontendTickDelayArray: number[] = [];
    let sent = 0;

    this.timeline.addEventListener("onUpdate", async (time) => {
      this.seekShapes(time);

      // only notify frontend if tickDelay
      const hasCalculatedAverageDelay = this.#frontendTickDelay !== undefined;
      const shouldNotifyFrontend = hasCalculatedAverageDelay && time < this.#nextFrontendTickTime;
      // if (time >= this.timeline.duration || this.#nextFrontendTickTime >= this.timeline.duration) {
      //   this.#nextFrontendTickTime = 0;
      // }

      if (!hasCalculatedAverageDelay && frontendTickDelayArray.length === COUNT) {
        const average =
          frontendTickDelayArray.reduce((prev, acc) => prev + acc, 0) /
          frontendTickDelayArray.length;
        this.#frontendTickDelay = average * 0.5;
        sent = 0;
      }

      if (shouldNotifyFrontend || sent === COUNT) return;

      const _nextTick = time + (this.#frontendTickDelay || 0);
      this.#nextFrontendTickTime = _nextTick;
      const timeSent = Date.now();
      if (!this.#frontendTickDelay) sent++;
      this.frontEndCallBack?.["timeline:update"]?.(
        time,
        proxy(async (timeReceived: number) => {
          const diff = (timeReceived - timeSent) / 1000;
          if (!this.#frontendTickDelay) {
            frontendTickDelayArray.push(diff);
          }
        }),
        this.timeline.isPlaying,
      );
    });
    this.timeline.addEventListener("onComplete", async (time) => {
      this.#nextFrontendTickTime = 0;
    });

    /* -------------------------------------------------------------------------- */
    /* -------------------------------------------------------------------------- */
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

  /**
   * Callback function for when a shape is scaled.
   */
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

      keyframes.push([
        id,
        this.timeline.time,
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

  /**
   * Callback function for when a shape is moved.
   */
  private onObjectMove(e: TransformEvent) {
    const keyframes: Parameters<typeof this.addKeyFrame> = [];
    const selectedShapes = this.canvas.getActiveObjects();
    selectedShapes.map((i, index) => {
      const shapeId = i.id;
      if (!shapeId) return;
      // setTimeout callback to give allowance for alignment snapping which might change object position after callback is fired
      setTimeout(() => {
        const { x, y } = i.getXY();
        this.frontEndCallBack?.["object:moving"]?.(shapeId, x, y);
        keyframes.push([shapeId, this.timeline.time, { left: x, top: y }]);
        if (index === selectedShapes.length - 1) {
          this.debouncedAddKeyframe(...keyframes);
        }
      }, 250);
    });
  }
  /**
   * Callback function for when a shape is rotated.
   */

  private onObjectRotate(e: TransformEvent) {
    let objects: FabricObject[] = [];
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

      keyframes.push([
        shapeId,
        this.timeline.time,
        { angle: e.target.angle, ...additionalProperties },
      ]);
    });

    this.debouncedAddKeyframe(...keyframes);
  }

  /**
   * Callback function for when a mouse is over a shape.
   */
  private onObjectMouseOver(e: TPointerEventInfo<TPointerEvent>) {
    if (this.timeline.isPlaying) return;
    if (e.target) {
      const isActive = this.selectedShapes?.includes(e.target.id || "");

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
        this.frontEndCallBack[args[0]] = args[1];

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
      case "onDeleteObject":
        this.frontEndCallBack[args[0]] = args[1];
        break;

      default: {
        const key = args[0];
        this.frontEndCallBack[key] = args[1];
      }
    }
  }

  /**
   * Stores frontend functions that can be called from a web worker
   */
  registerFrontendFunctions<Type extends keyof MainThreadFunctions>(
    type: Type,
    func: MainThreadFunctions[Type],
  ) {
    // @ts-expect-error function needs to be a promise due to how comlink works
    this.#frontendFunctions[type] = func;
  }
  handleMouseCallback(type: keyof HTMLElementEventMap, data: TPointerEvent) {
    if (type === "mouseup") {
      this.canvas._onMouseUp(data);
      return;
    }
    if (type === "mousedown") {
      //
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
    const defaultFill = "rgba(0,0,0,0.5)";
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
    if (this.timeline.isPlaying) return;
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

        this.frontEndCallBack["keyframe:add"]<keyof AnimatableProperties>?.(
          shapeId,
          time,
          keyframeDetails,
          // Todo: figure out how to fix TS error without type casting
          animatableProperty as "height",
          value as number,
        );
      });
    });
  }

  onMouseUp() {}
  togglePlay() {
    if (this.timeline.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }
  async play() {
    this.#nextFrontendTickTime = 0;
    this.timeline.play();
  }
  get time() {
    return this.timeline.time;
  }

  pause() {
    this.#nextFrontendTickTime = 0;
    if (this.timeline.isPlaying) this.frontEndCallBack?.["timeline:update"]?.(this.timeline.time);
    this.timeline.pause();
    this.reselectShape?.();
  }
  seekShapes(time: number) {
    const selectedShape = this.canvas.getActiveObjects();
    if (selectedShape.length > 0) {
      this.canvas.discardActiveObject();
      this.reselectShape = () => {
        const selection = new ActiveSelection([], {
          canvas: this.canvas,
          // this ensures that for single selected items, the canvas selection callbacks have the id property
          id: selectedShape.length == 1 ? selectedShape?.[0]?.id : undefined,
        });
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
    if (!this.timeline.isPlaying) {
      this.shapeRecord.forEach((value) => {
        value.fabricObject.setCoords();
      });
      this.reselectShape?.();
    }
    this.canvas.renderAll();
  }
  seekPlayHead(time: number) {
    this.pause();
    this.seekShapes(time);
    this.timeline.setTime(time, true);
  }
  async exportToVideo(onUpdate?: (progress: number) => void) {
    const videoWidth = 4096;
    const videoHeight = 2160;
    const offscreenCanvas = new OffscreenCanvas(videoWidth, videoHeight);
    addPropertiesToCanvas(offscreenCanvas as OffscreenCanvas, videoWidth, videoHeight);
    //
    this.shapeRecord.forEach((shape) => {
      const g = shape.fabricObject.clone();
    });
    const canvas = new StaticCanvas(offscreenCanvas as unknown as HTMLCanvasElement);
    //
    const output = new Output({
      target: new BufferTarget(), // Stored in memory
      format: new Mp4OutputFormat({}),
    });
    const videoCodec = await getFirstEncodableVideoCodec(output.format.getSupportedVideoCodecs(), {
      width: videoWidth,
      height: videoHeight,
    });
    if (!videoCodec) return;
    const canvasSource = new CanvasSource(offscreenCanvas, {
      codec: videoCodec,
      bitrate: QUALITY_VERY_HIGH,
    });
    const frameRate = 100;
    output.addVideoTrack(canvasSource, { frameRate });
    await output.start();
    const TOTAL_DURATION = 10; // seconds
    const totalFrames = frameRate * TOTAL_DURATION;
    const rect = new Rect({
      fill: "red",
      width: videoWidth * 0.2,
      height: videoHeight * 0.2,
      left: 0,
      top: 0,
      objectCaching: false,
    });
    canvas.add(rect);
    canvas.renderAll();

    for (let i = 1; i < totalFrames; i++) {
      rect.top = i;
      rect.left = i;
      canvas.renderAll();
      await canvasSource.add((i / totalFrames) * TOTAL_DURATION, 1 / frameRate);
      const progress = i / totalFrames;
      onUpdate?.(progress);
    }
    canvasSource.close();
    await output.finalize();
    const videoBlob = new Blob([output.target.buffer!], {
      type: output.format.mimeType,
    });
    const resultVideo = URL.createObjectURL(videoBlob);
    return resultVideo;
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

type TimeLineCallback = {
  onUpdate?: ((time: number) => void)[];
  onPlay?: ((time: number) => void)[];
  onPause?: ((time: number) => void)[];
  onComplete?: ((time: number) => void)[];
};
class Timeline {
  #lastTime: null | number = null;
  #time = 0;
  #callback: TimeLineCallback = {};
  #animationFrameCallbackId = 0;

  isPlaying = false;

  constructor(
    public duration = 10,
    public shouldLoop = false,
  ) {}

  get time() {
    return this.#time;
  }
  setTime(t: number, shouldAlert?: boolean) {
    this.#time = t;
    if (shouldAlert) {
      this.#callback?.onUpdate?.forEach((func) => {
        func(this.#time);
      });
    }
  }

  play() {
    this.isPlaying = true;
    this.#lastTime = performance.now();
    this.#callback.onPlay?.forEach((func) => func(this.#time));
    requestAnimationFrame(this.#loop.bind(this));
  }
  pause() {
    this.isPlaying = false;
    cancelAnimationFrame(this.#animationFrameCallbackId);
    this.#callback.onPause?.forEach((func) => func(this.#time));
    this.#lastTime = null;
  }

  #loop(now: number) {
    if (!this.isPlaying) return;

    this.#animationFrameCallbackId = requestAnimationFrame(this.#loop.bind(this));

    if (this.#lastTime == null) {
      this.#lastTime = now;
    }

    const dt = Math.max(0, now - this.#lastTime) / 1000;
    this.#lastTime = now;

    const _time = Math.min(this.duration, this.#time + dt);
    this.setTime(_time, true);

    const isComplete = this.#time >= this.duration;

    if (isComplete) {
      this.#callback?.onComplete?.forEach((func) => {
        func(this.#time);
      });
      if (this.shouldLoop) {
        this.setTime(0, true);
      } else {
        this.pause();
      }
    }
  }
  addEventListener(type: keyof TimeLineCallback, func: (time: number) => void) {
    if (!this.#callback?.[type]) {
      this.#callback[type] = [];
    }
    this.#callback[type].push(func);
  }
}
function addCustomControls() {
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
}
