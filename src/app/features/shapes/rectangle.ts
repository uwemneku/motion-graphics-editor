import {
  AlwaysStencilFunc,
  EqualStencilFunc,
  Group,
  IncrementStencilOp,
  KeepStencilOp,
  Material,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Raycaster,
  ReplaceStencilOp,
  Scene,
  Shape,
  ShapeGeometry,
  Vector2,
  WebGLRenderer,
  type ColorRepresentation,
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
      stencil: true,
    });

    this.threeJsRenderer.setPixelRatio(2);
    this.camera = new PerspectiveCamera(75, width / height, 1, 1000);
    this.camera.position.set(0, 0, 2);
    this.threeJsRenderer.setClearColor(0x000000, 1); // black background
    this.transformerHandle = new Transformer((mesh) => {
      this.scene.add(mesh);
      mesh.visible = false;
      this.shapeMap.set("transformer", { group: mesh });
    });

    this.fitCanvas(width, height);
  }

  fitCanvas(width: number, height: number) {
    if (!this.threeJsRenderer) {
      console.warn("Renderer not initialized yet");
      return;
    }
    // All settings for the primary canvas
    const [_x, _y] = this.sizeRelativeDimension;
    const rec = new Rectangle(-0.5, -0.5, _x * (width / 2), _y * (height / 2), 4 * _x, 0);

    const fillMaterial = rec.fillMesh.material as Material;
    fillMaterial.colorWrite = false;
    fillMaterial.depthWrite = false;
    fillMaterial.stencilWrite = true;
    fillMaterial.stencilRef = 1;
    fillMaterial.stencilFunc = AlwaysStencilFunc;
    fillMaterial.stencilFail = ReplaceStencilOp;
    fillMaterial.stencilZFail = ReplaceStencilOp;
    fillMaterial.stencilZPass = ReplaceStencilOp;

    this.scene.add(rec.group);

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
    console.log({ allShapes });

    const intersects = this.raycaster
      .intersectObjects(allShapes)
      .sort((a, b) => ((a.object.userData.z || 0) > (b.object.userData.z || 0) ? -1 : 1));

    console.log(this.shapeMap);

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
  };

  // Create shapes
  createShape = (args: CreateShapeArgs) => {
    const shapeId = crypto.randomUUID();

    let shape: AppShapes | null = null;

    const x = this.sizeRelativeDimension[0];
    const y = this.sizeRelativeDimension[1];
    switch (args.type) {
      case "rect":
        {
          const rect = new Rectangle(0, 0, args.width * x, args.height * y, 0.05, 0.08);
          rect.group.children.forEach((mesh) => {
            const material = mesh.material as Material;
            material.stencilWrite = true;
            material.stencilRef = this.shapeMap.size;
            material.stencilFunc = EqualStencilFunc;
            material.stencilFail = KeepStencilOp;
            material.stencilZFail = KeepStencilOp;
            material.stencilZPass = IncrementStencilOp;
            shape = rect;
          });
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
    delta: { x: number; y: number },
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
        const _x = x * (delta.x * 2) * pixelRatio;
        const _y = -y * (delta.y * 2) * pixelRatio;

        this.transformerHandle.resize(_x, _y, this.transformhandle, shiftKey);
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
  static fillShapeLabel = "Fill_Shape_label";
  static bordersShapeLabel = "Border_Shape_label";
  //
  borderMesh: Mesh;
  fillMesh: Mesh;
  group = new Group();

  //
  constructor(
    x = 0,
    y = 0,
    width: number,
    height: number,
    borderThickness: number = 0,
    borderRadius = 0,
    fillColor: ColorRepresentation = "white",
    borderColor: ColorRepresentation = "red",
  ) {
    // border shape
    const outerShape = Rectangle.createRoundedRectangle(x, y, width, height, borderRadius);
    const innerRadius = Math.max(0, borderRadius - borderThickness);

    const hole = Rectangle.createRoundedRectangle(
      x + borderThickness,
      y + borderThickness,
      width - borderThickness * 2,
      height - borderThickness * 2,
      innerRadius,
    );

    outerShape.holes.push(hole);

    this.borderMesh = new Mesh(
      new ShapeGeometry(outerShape),
      new MeshBasicMaterial({ color: borderColor }),
    );
    this.borderMesh.position.z = 0.0001;
    this.borderMesh.name = Rectangle.bordersShapeLabel;
    this.group.add(this.borderMesh);

    // fill shape
    const fillShape = Rectangle.createRoundedRectangle(
      x + borderThickness,
      y + borderThickness,
      width - borderThickness * 2,
      height - borderThickness * 2,
      innerRadius,
    );

    this.fillMesh = new Mesh(
      new ShapeGeometry(fillShape),
      new MeshBasicMaterial({ color: fillColor }),
    );
    this.fillMesh.name = Rectangle.fillShapeLabel;
    this.group.add(this.fillMesh);
  }

  static createRoundedRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ) {
    const shape = new Shape();
    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);
    return shape;
  }
}
