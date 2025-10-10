import {
  Box3,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
  type ColorRepresentation,
  type Object3DEventMap,
} from "three";
import type { CreateShapeArgs } from "../web-workers/types";
import AppImage from "./image";
import Transformer, { type TransformerKeys } from "./transformhandle";
type AppShapes = Rectangle | AppImage;

export class App {
  private z = 0;
  private camera;
  private threeJsRenderer;
  private scene = new Scene();
  private mouse = new Vector2();
  private raycaster = new Raycaster();
  private shapeMap = new Map<string, AppShapes>();
  private transformerHandle: Transformer;
  private transformhandle: TransformerKeys = "";
  private selectedShapeId = "";
  /**
   *  Multiply by this value to get the world equivalent
   *  Divide by this value to get the canvas equivalent
   */
  private sizeRelativeDimension = new Float32Array(2);

  constructor(
    offscreenCanvas: OffscreenCanvas,
    width: number,
    height: number,
    devicePixelRatio = 1,
  ) {
    this.threeJsRenderer = new WebGLRenderer({
      antialias: true,
      canvas: offscreenCanvas,
    });

    this.threeJsRenderer.setPixelRatio(devicePixelRatio);
    this.camera = new PerspectiveCamera(75, width / height, 1, 1000);
    this.camera.position.set(0, 0, 2);
    this.threeJsRenderer.setClearColor(0x000000, 1); // black background
    this.transformerHandle = new Transformer((mesh) => {
      this.scene.add(mesh);
      this.shapeMap.set("transformer", { group: mesh });
    });

    this.fitCanvas(width, height);

    // App.app = this;
  }

  fitCanvas(width: number, height: number) {
    if (!this.threeJsRenderer) {
      console.warn("Renderer not initialized yet");
      return;
    }
    this.threeJsRenderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    const [x] = this.updateRelativeSize();

    this.transformerHandle.updateSize(10 * x);
    this.render();
  }

  private render() {
    this.threeJsRenderer?.render(this.scene, this.camera);
  }

  /* -------------------------------------------------------------------------- */
  /* -------------------------------------------------------------------------- */
  private updateRelativeSize = () => {
    // Calculate visible dimensions at z=0
    const distance = this.camera.position.z; // camera distance to plane z=0
    const fov = this.camera.fov;
    const vFov = (fov * Math.PI) / 180; // vertical FOV in radians
    const width = this.threeJsRenderer.domElement.width;
    const height = this.threeJsRenderer.domElement.height;
    const visibleHeight = 2 * Math.tan(vFov / 2) * distance;
    const visibleWidth = visibleHeight * (width / height);
    const pixelRatio = this.threeJsRenderer.getPixelRatio();

    const canvasToWorldX = (1 / width) * visibleWidth * pixelRatio;
    const canvasToWorldY = (1 / height) * visibleHeight * pixelRatio;
    this.sizeRelativeDimension = new Float32Array([canvasToWorldX, canvasToWorldY]);
    return this.sizeRelativeDimension;
  };

  /**
   * The rate of change from the plane to at a z distance int he world
   * @param z The z axis to do calculation from
   * @returns
   */
  private getShapePositionChangeRatio = (z = 0) => {
    const distance = Math.abs(this.camera.position.z - z);
    const vFOV = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(vFOV / 2) * distance;
    const x = (height * this.camera.aspect) / this.threeJsRenderer.domElement.width;
    const y = height / this.threeJsRenderer.domElement.height;
    return { x, y };
  };

  /* -------------------------------------------------------------------------- */
  /* -------------------------------------------------------------------------- */

  getShapeAtCoordinate = (x: number, y: number) => {
    const pixelRatio = this.threeJsRenderer.getPixelRatio();

    const width = this.threeJsRenderer.domElement.width / pixelRatio;
    const height = this.threeJsRenderer.domElement.height / pixelRatio;

    this.mouse.x = (x / width) * 2 - 1;
    this.mouse.y = -(y / height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const allShapes = [...this.shapeMap.entries()].map((i) => i[1].group);

    const intersects = this.raycaster
      .intersectObjects(allShapes)
      .sort((a, b) => ((a.object.userData.z || 0) > (b.object.userData.z || 0) ? -1 : 1));

    console.log(intersects);

    // If the raycaster hit a nested mesh (child of the Group), climb up
    // to find the top-level Group that represents the logical shape.
    let shapeObj = intersects?.[0]?.object;
    const isTransformHandle = shapeObj?.userData?.isTransformHandle;

    if (isTransformHandle) {
      console.log("transformerhandle");
      this.transformhandle = shapeObj.name as TransformerKeys;
      return;
    }

    if (!shapeObj) {
      this.transformerHandle.hide();
      this.transformhandle = "";
      this.selectedShapeId = "";
    } else {
      while (shapeObj?.parent && !shapeObj.userData?.canSelect) {
        shapeObj = shapeObj.parent;
      }
      this.selectedShapeId = shapeObj.userData.id;
      if (this.selectedShapeId)
        this.transformerHandle.align(shapeObj, this.z, 10 * this.sizeRelativeDimension[0]);
    }

    this.render();

    return;
    //
    const shape = shapeObj as Mesh | Group;
    // ensure world matrix is up to date before getting world position
    shape.updateMatrixWorld();
    // Project to normalized device coordinates (NDC)

    const worldVector = new Vector3(shape.position.x, shape.position.y, shape.position.z); // Your 3D world coordinate
    worldVector.project(this.camera); // Projects the vector onto the camera's near plane

    const cw = this.threeJsRenderer.domElement.width / pixelRatio;
    const vh = this.threeJsRenderer.domElement.height / pixelRatio;

    const cx = ((worldVector.x + 1) / 2) * cw;
    const cy = (-(worldVector.y - 1) / 2) * vh; // Invert y-axis as canvas y is typically positive downwards

    shape.updateMatrixWorld(); // ensure world matrix is up to date
    // compute bounding box in world units to determine size
    const box = new Box3().setFromObject(shape as unknown as Object3D);
    const size = box.getSize(new Vector3());
    const shapeWidth = size.x;
    const shapeHeight = size.y;
    const canvasShapeWidth = shapeWidth / this.sizeRelativeDimension[0];
    const canvasShapeHeight = shapeHeight / this.sizeRelativeDimension[1];

    const shapeDataf = {
      id: shape.userData.id,
      x: cx - canvasShapeWidth / 2,
      y: cy - canvasShapeHeight / 2,
      shapeWidth: canvasShapeWidth,
      shapeHeight: canvasShapeHeight,
      scale: {
        x: shape.scale.x,
        y: shape.scale.y,
      },
    };

    return shapeDataf;
  };

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

      this.z = group.position.z + group.position.z / 10;
      console.log("z", currentNumberOfShapes, this.z, group.position.z);
      group.userData.id = shapeId;
      group.userData.canSelect = true;
      group.userData.z = currentNumberOfShapes;

      this.scene.add(group);
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
