import { expose } from "comlink";
import {
  Box3,
  CircleGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  RingGeometry,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { App } from "../shapes/rectangle";
import { IS_WEB_WORKER } from "./globals";
import type { IOffscreenRenderer } from "./types";

if (IS_WEB_WORKER) {
  self.document = {
    createElement: (args: string) => {
      console.log({ args });

      switch (args) {
        case "div":
          console.log("creating div");

          {
            return {
              style: {
                setProperty: (...divStyles) => {
                  console.log({ divStyles });
                },
              },
              setAttribute: () => {},
              classList: {
                add: () => {},
                remove: () => {},
              },
              append: () => {},
              // addEventListener: () => {},
              ownerDocument: {
                documentElement: {
                  clientLeft: 0,
                },
                // addEventListener: () => {},
              },
              defaultView: {},
            };
          }
          break;
        case "canvas": {
          console.log("creating canvas");
          // canvasCount++;
          // console.log({ canvasCount });

          const canvas = new OffscreenCanvas(100, 100);

          canvas.style = {
            setProperty: (...styles) => {
              console.log(canvasCount, { customcanvas: styles });
            },
          };
          canvas.style.setProperty = () => {};
          canvas.hasAttribute = () => {};
          canvas.setAttribute = () => {};
          canvas.addEventListener = (
            ...args: Parameters<HTMLCanvasElement["addEventListener"]>
          ) => {
            const [type, func = () => {}, options = {}] = args;
            App.addEventListeners[type] = func;
            // console.log(canvasCount, { func, options });
          };

          canvas.ownerDocument = {
            documentElement: {
              clientLeft: 0,
              // addEventListener: () => {},
            },
            addEventListener: () => {},
            defaultView: {
              addEventListener: (...d) => {
                console.log({ d });
              },
            },
          };
          // canvas.defaultView = {
          //   // addEventListener: () => {},
          // };
          canvas.classList = {
            add: (...a) => {
              console.log({ a });
            },
            remove: () => {},
          };
          return canvas;
        }
        case "img":
          return new Image();
        default:
      }
    },
  };
  self.window = {
    requestAnimationFrame: () => {},
  };
}

let threeJsRenderer: WebGLRenderer;
const raycaster = new Raycaster();
const mouse = new Vector2();
const scene = new Scene();
let camera: PerspectiveCamera;
let pixelRatio = 1;

const shapeMap = new Map<string, Mesh | Group>();
let app: App;

const offScreenRenderer: IOffscreenRenderer["init"] = (
  offscreenCanvas,
  width,
  height,
  devicePixelRatio = 1,
) => {
  app = new App(offscreenCanvas, width, height, devicePixelRatio);
  console.log("Offscreen canvas initialized", { offscreenCanvas });
  //
  pixelRatio = devicePixelRatio || 1;
  threeJsRenderer = new WebGLRenderer({
    antialias: true,
    canvas: offscreenCanvas,
  });
  threeJsRenderer.setPixelRatio(pixelRatio);
  camera = new PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(0, 0, 2);
  threeJsRenderer.setClearColor(0x000000, 1); // black background

  onCanvasResize(width, height);
  animate();
};

const getRelativeSize = (w: number, h: number, returnType: "world" | "canvas") => {
  // Calculate visible dimensions at z=0
  const distance = camera.position.z; // camera distance to plane z=0
  const fov = camera.fov;
  const vFov = (fov * Math.PI) / 180; // vertical FOV in radians
  const width = threeJsRenderer.domElement.width;
  const height = threeJsRenderer.domElement.height;
  const visibleHeight = 2 * Math.tan(vFov / 2) * distance;
  const visibleWidth = visibleHeight * (width / height);
  const pixelRatio = threeJsRenderer.getPixelRatio();

  // Now size things relative to canvas
  // If canvas is 1920x1080, and you want a rect that's 200px wide and 100px tall:
  if (returnType === "world") {
    const _w = (w / width) * visibleWidth * pixelRatio;
    const _H = (h / height) * visibleHeight * pixelRatio;
    return { _w, _H };
  }
  const _w = (w / (visibleWidth * pixelRatio)) * width;
  const _H = (h / (visibleHeight * pixelRatio)) * height;
  return { _w, _H };
};

/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
const onCanvasResize = (width: number, height: number) => {
  if (!threeJsRenderer) {
    console.warn("Renderer not initialized yet");
    return;
  }
  threeJsRenderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  animate();
};

/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
const createRectangle = (width: number, height: number, border: number = 0) => {
  const group = new Group();
  const borderThickness = border;

  // main rect
  const geometry = new PlaneGeometry(width, height);
  const material = new MeshBasicMaterial({ color: "royalblue" });
  const rect = new Mesh(geometry, material);
  group.add(rect);

  // Top border
  const topBorder = new Mesh(
    new PlaneGeometry(width, borderThickness),
    new MeshBasicMaterial({ color: "0xffffff", opacity: 1, transparent: true }),
  );
  topBorder.position.y = height / 2 - borderThickness / 2;
  topBorder.userData.isBorder = true;
  group.add(topBorder);
  console.log(topBorder.geometry.attributes?.position);

  // Bottom border
  const bottomBorder = new Mesh(
    new PlaneGeometry(width, borderThickness),
    new MeshBasicMaterial({ color: "0xffffff", opacity: 1, transparent: true }),
  );
  bottomBorder.position.y = -height / 2 + borderThickness / 2;
  bottomBorder.userData.isBorder = true;

  group.add(bottomBorder);

  // left border
  const leftBorder = new Mesh(
    new PlaneGeometry(borderThickness, height),
    new MeshBasicMaterial({
      color: "0xffffff",
      opacity: 1,
      transparent: true,
    }),
  );
  leftBorder.position.x = -width / 2 + borderThickness / 2;
  leftBorder.userData.isBorder = true;
  group.add(leftBorder);

  // left border
  const rightBorder = new Mesh(
    new PlaneGeometry(borderThickness, height),
    new MeshBasicMaterial({
      color: "0xffffff",
      opacity: 1,
      transparent: true,
    }),
  );
  rightBorder.position.x = width / 2 - borderThickness / 2;
  rightBorder.userData.isBorder = true;
  group.add(rightBorder);

  scene.add(group);
  return group;
};

const createCircle = (radius: number) => {
  const borderWidth = radius * 0.2;
  // main circle
  const group = new Group();
  const geometry = new CircleGeometry(radius, 128);
  const material = new MeshBasicMaterial({ color: "lightgreen" });
  const circle = new Mesh(geometry, material);
  group.add(circle);

  const circleBorder = new Mesh(
    new RingGeometry(radius - borderWidth / 2, radius + borderWidth / 2, 128),
    new MeshBasicMaterial({ color: "red", side: DoubleSide }),
  );
  circleBorder.userData.isBorder = true;
  group.add(circleBorder);

  scene.add(group);
  return group;
};

/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
const createShape: IOffscreenRenderer["createShape"] = (args) => {
  const shapeId = crypto.randomUUID();
  const currentNumberOfShapes = shapeMap.size;
  // const z = 0 + currentNumberOfShapes / 100;
  let shape: Mesh | null = null;
  switch (args.type) {
    case "rect":
      {
        const { _w, _H } = getRelativeSize(args.width || 1000, args.height || 200, "world");
        const { _w: b } = getRelativeSize(5, 0, "world");
        const rect = createRectangle(_w, _H, b);
        shape = rect;
      }
      break;
    case "circle":
      {
        const { _w } = getRelativeSize(args.radius || 200, 0, "world");
        const circle = createCircle(_w);
        shape = circle;
      }
      // createCircle(args.radius);
      break;
    case "image":
      // createImage(args.src, args.width, args.height);
      break;
    default:
      console.warn("Unknown shape type", args);
  }
  if (shape) {
    shape.children?.forEach((i) => {
      i.userData.z = currentNumberOfShapes;
    });

    shape.position.z = 0 + currentNumberOfShapes / 10000;
    shape.userData.id = shapeId;
    shape.userData.z = currentNumberOfShapes;

    shapeMap.set(shapeId, shape);
    animate();
  }
  return { id: shapeId };
};

/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
const getShapeAtCoordinates = (x: number, y: number) => {
  const pixelRatio = threeJsRenderer.getPixelRatio();

  const width = threeJsRenderer.domElement.width / pixelRatio;
  const height = threeJsRenderer.domElement.height / pixelRatio;
  mouse.x = (x / width) * 2 - 1;
  mouse.y = -(y / height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const allShapes = [...shapeMap.entries()].map((i) => i[1]);

  console.log({ allShapes });

  const intersects = raycaster
    .intersectObjects(allShapes)
    .sort((a, b) => ((a.object.userData.z || 0) > (b.object.userData.z || 0) ? -1 : 1));

  console.log({ intersects });

  if (intersects.length > 0) {
    const worldPosition = new Vector3();
    // If the raycaster hit a nested mesh (child of the Group), climb up
    // to find the top-level Group that represents the logical shape.
    let shapeObj = intersects[0].object as Object3D;
    while (shapeObj && !shapeObj.userData?.id && shapeObj.parent) {
      shapeObj = shapeObj.parent;
    }
    const shape = shapeObj as Mesh | Group;
    // ensure world matrix is up to date before getting world position
    shape.updateMatrixWorld();
    // Project to normalized device coordinates (NDC)
    const ndcPosition =
      shape.getWorldPosition(worldPosition) || worldPosition.clone().project(camera);
    const canvasX = (ndcPosition.x * 0.5 + 0.5) * width;
    const canvasY = (ndcPosition.y * -0.5 + 0.5) * height;
    shape.updateMatrixWorld(); // ensure world matrix is up to date
    // compute bounding box in world units to determine size
    const box = new Box3().setFromObject(shape as unknown as Object3D);
    const size = box.getSize(new Vector3());
    const shapeWidth = size.x;
    const shapeHeight = size.y;
    const canvasShapeSize = getRelativeSize(shapeWidth, shapeHeight, "canvas");

    const shapeData = {
      id: shape.userData.id,
      x: canvasX - canvasShapeSize._w / 2,
      y: canvasY - canvasShapeSize._H / 2,
      shapeWidth: canvasShapeSize._w,
      shapeHeight: canvasShapeSize._H,
    };

    console.log({ shapeData });

    return shapeData;
  }
};
function getPixelToWorldRatio(objectZ = 0) {
  const distance = Math.abs(camera.position.z - objectZ);
  const vFOV = (camera.fov * Math.PI) / 180;
  const height = 2 * Math.tan(vFOV / 2) * distance;

  return {
    x: (height * camera.aspect) / threeJsRenderer.domElement.width,
    y: height / threeJsRenderer.domElement.height,
  };
}
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
const modifyShape: IOffscreenRenderer["modifyShape"] = (id, args) => {
  const shape = shapeMap.get(id);
  if (!shape) {
    console.warn("Shape not found", id);
    return;
  }
  const box = new Box3().setFromObject(shape as unknown as Object3D);
  const size = box.getSize(new Vector3());
  const ratio = getPixelToWorldRatio(shape.position.z);
  const canvasShapeSize = getRelativeSize(size.x, size.y, "canvas");

  if (args.x !== undefined) {
    // const { _w: _x } = getRelativeSize(args.x, 0, "world");
    shape.position.x += args.x * ratio.x;
  }
  if (args.y !== undefined) {
    const { _H: _y } = getRelativeSize(0, args.y, "world");
    shape.position.y += -args.y * ratio.y; // Invert y to match canvas coordinates
  }
  if (args.scaleX) {
    shape.scale.x = args.scaleX;
    shape.children.forEach((i) => {
      if (i.userData.isBorder) {
        // i.scale.x = 1 / args.scaleX;
      }
    });
  }
  if (args.scaleY !== undefined) {
    shape.scale.y = args.scaleY;
    shape.children.forEach((i) => {
      if (i.userData.isBorder) {
        // i.scale.y = 1 / args.scaleY;
      }
    });
  }
  animate();
};

const animate = () => {
  // camera.updateProjectionMatrix();
  threeJsRenderer.render(scene, camera);
};

export const exposedFunctions: IOffscreenRenderer = {
  createShape,
  onCanvasResize,
  init: offScreenRenderer,
  onCanvasMouseMove: getShapeAtCoordinates,
  getShapeUsingCoordinates: (x: number, y: number) => getShapeAtCoordinates(x, y),
  modifyShape,
};
export type WorkerAPI = typeof exposedFunctions;

expose(App);
