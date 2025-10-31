import { Canvas, config, Image, Rect } from "fabric";
import {
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  type ColorRepresentation,
  type Object3DEventMap,
} from "three";
import { IS_WEB_WORKER } from "../web-workers/globals";
import type { CreateShapeArgs } from "../web-workers/types";
import AppImage from "./image";
import { type TransformerKeys } from "./transformhandle";

// Needed handle missing API in worker
import "./fabric-polyfill";
type AppShapes = Rectangle | AppImage;

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

    console.log({ devicePixelRatio });

    config.configure({ devicePixelRatio });
    this.canvas = new Canvas(lowerOffscreenCanvas as unknown as HTMLCanvasElement, {
      enableRetinaScaling: true,
      width,
      height,
    });

    const helloWorld = new Rect({
      left: 100 / 2,
      top: 50 / 2,
      fill: "red",
      width: 50 / 2,
      height: 50 / 2,
      strokeWidth: 1,
      stroke: "#880E4F",
      rx: 10,
      ry: 10,
      angle: 45,
      scaleX: 3,
      scaleY: 3,
      hasControls: true,
    });

    this.createImage("https://picsum.photos/100/100");

    this.canvas.add(helloWorld);
    this.canvas.centerObject(helloWorld);

    this.fitCanvas(width, height);
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
    this.canvas.renderAll();
    this.render();
  }

  async createImage(src: string) {
    try {
      const imgBlob = await (await fetch(src)).blob();
      const bitmapImage = await createImageBitmap(imgBlob);
      const offscreen = new OffscreenCanvas(bitmapImage.width, bitmapImage.height);
      const ctx = offscreen.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(bitmapImage, 0, 0);

      const fabricImage = new Image(offscreen as unknown as HTMLCanvasElement);

      this.canvas.add(fabricImage);
      this.canvas.renderAll();
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
  createShape = (args: CreateShapeArgs) => {
    const shapeId = crypto.randomUUID();

    let shape: AppShapes | null = null;
    console.log({ args });

    const x = this.sizeRelativeDimension[0];
    const y = this.sizeRelativeDimension[1];
    switch (args.type) {
      case "rect":
        {
          const rect = new Rectangle(args.width * x, args.height * y);
          shape = rect;
        }
        break;
      case "circle":
        {
          // const { _w } = getRelativeSize(args.radius || 200, 0, "world");
          // const circle = createCircle(_w);
          // shape = circle;
        }
        // createCircle(args.radius);
        break;
      case "image":
        {
          const image = new AppImage(args.src, args.width * x, args.height * y);
          shape = image;
        }
        break;
      default:
        console.warn("Unknown shape type", args);
    }
    if (shape) {
      this.shapeMap.set(shapeId, shape);
      const currentNumberOfShapes = this.shapeMap.size;

      const group = shape.group;
      group.children?.forEach((i) => {
        i.userData.z = currentNumberOfShapes;
      });

      group.position.z = 0 + currentNumberOfShapes / 10000;

      console.log("z", currentNumberOfShapes, this.z, group.position.z);
      group.userData.id = shapeId;
      group.userData.canSelect = true;
      group.userData.z = currentNumberOfShapes;

      this.render();
      return { id: shapeId };
    }
  };

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

class Rectangle {
  private shape: Mesh<PlaneGeometry, MeshBasicMaterial, Object3DEventMap>;
  private geometry: PlaneGeometry;
  //
  group = new Group();
  //   shape:
  constructor(
    width: number,
    height: number,
    border: number = 0,
    fillColor: ColorRepresentation = "white",
  ) {
    // main rectangle
    this.geometry = new PlaneGeometry(width, height);
    const material = new MeshBasicMaterial({ color: (Math.random() * 0xffffff) | 0 });
    this.shape = new Mesh(this.geometry, material);
    this.group.add(this.shape);
  }
}
