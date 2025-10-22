import {
  Box3,
  EdgesGeometry,
  Group,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  Vector3,
  type Object3DEventMap,
} from "three";

export type TransformerKeys = `${"left" | "right"}${"Top" | "Bottom"}` | "border" | "";

class Transformer {
  private meshes = {} as Record<TransformerKeys, Mesh | LineSegments>;
  private size: number;
  private group: Group;
  private startData = {
    startWidth: 0,
    startHeight: 0,
    edges: new Float32Array([
      //
      0, 0,
      //
      0, 0,
      //
      0, 0,
      //
      0, 0,
    ]),
  };
  padding = 0;

  constructor(onCreate: (allMesh: Group) => void, padding = 0) {
    this.group = new Group();
    this.size = 0;
    const border = new LineSegments();
    border.position.z = 0;
    border.userData.canSelect = false;
    this.meshes["border"] = border;
    border.name = "border";
    border.raycast = () => {};
    this.group.add(border);
    const material = new MeshBasicMaterial({ color: "red" });
    const plane = new PlaneGeometry(0, 0);
    this.padding = 0;
    (["leftTop", "leftBottom", "rightTop", "rightBottom"] as const).forEach((position) => {
      const rect = new Mesh(plane, material);
      rect.name = position;
      rect.userData.isTransformHandle = true;
      rect.position.z = 0;
      this.meshes[position] = rect;
      this.group.add(rect);
      return rect;
    });

    onCreate(this.group);
  }

  updateSize(size: number, z?: number) {
    this.size = size;
    Object.entries(this.meshes).forEach(([_, mesh]) => {
      mesh.geometry.dispose();
      mesh.geometry = new PlaneGeometry(size, size);
      if (z) {
        mesh.position.z = z;
      }
    });
  }

  align(mesh: Object3D<Object3DEventMap>, z: number, padding = this.padding) {
    const box = new Box3().setFromObject(mesh);
    const size = box.getSize(new Vector3());
    const w = size.x;
    const h = size.y;
    const p = this.size + padding;
    this.startData = {
      ...this.startData,
      startHeight: h + p,
      startWidth: w + p,
    };

    this.meshes.border.geometry.dispose();
    this.meshes.border.geometry = new EdgesGeometry(new PlaneGeometry(w + p, h + p));
    this.meshes.border.position.z = z;
    // this.meshes.border.position.x = mesh.position.x;

    this.meshes.leftTop.position.x = -w / 2 - this.size;
    this.meshes.leftTop.position.y = h / 2 + this.size;
    this.meshes.leftTop.position.z = z;
    this.startData.edges[0] = this.meshes.leftTop.position.x;
    this.startData.edges[1] = this.meshes.leftTop.position.y;

    this.meshes.rightTop.position.x = w / 2 + this.size;
    this.meshes.rightTop.position.y = h / 2 + this.size;
    this.meshes.rightTop.position.z = z;
    this.startData.edges[2] = this.meshes.rightTop.position.x;
    this.startData.edges[3] = this.meshes.rightTop.position.y;

    this.meshes.rightBottom.position.x = w / 2 + this.size;
    this.meshes.rightBottom.position.y = -h / 2 - this.size;
    this.meshes.rightBottom.position.z = z;
    this.startData.edges[4] = this.meshes.rightBottom.position.x;
    this.startData.edges[5] = this.meshes.rightBottom.position.y;

    this.meshes.leftBottom.position.x = -w / 2 - this.size;
    this.meshes.leftBottom.position.y = -h / 2 - this.size;
    this.meshes.leftBottom.position.z = z;
    this.startData.edges[6] = this.meshes.leftBottom.position.x;
    this.startData.edges[7] = this.meshes.leftBottom.position.y;

    this.group.visible = true;
    this.group.position.x = mesh.position.x;
    this.group.position.y = 0;
    this.group.scale.x = 1;
    this.group.scale.y = 1;
  }

  translate(x: number, y: number) {
    this.group.position.x += x;
    this.group.position.y += y;
  }

  scale(x: number, y: number) {
    this.group.scale.x += x;
    this.group.scale.y += y;
  }

  resize(deltaX: number, deltaY: number, activeHandle: TransformerKeys, shiftKey: boolean) {
    const borer = this.meshes.border;

    const { startHeight, startWidth } = this.startData;
    const aspectRatio = startWidth / startHeight;
    const reverseX = activeHandle.startsWith("left");
    const reverseY = activeHandle.endsWith("Bottom");
    const newHeight = startHeight + deltaY * (reverseY ? -1 : 1);
    let newWidth = startWidth + deltaX * (reverseX ? -1 : 1);

    const edgeYChange = (deltaY / 2) * (reverseY ? -1 : 1);
    let edgeXChange = (deltaX / 2) * (reverseX ? 1 : -1);

    if (shiftKey) {
      edgeXChange = edgeYChange * aspectRatio;
      newWidth = newHeight * aspectRatio;
    }

    this.group.children.map((i) => {
      switch (i.name as TransformerKeys) {
        case "border":
          {
            borer.geometry.dispose();
            borer.geometry = new EdgesGeometry(new PlaneGeometry(newWidth, newHeight));
          }
          break;
        case "leftTop":
          {
            i.position.x = this.startData.edges[0] + edgeXChange;
            i.position.y = this.startData.edges[1] + edgeYChange;
          }
          break;
        case "rightTop":
          {
            i.position.x = -this.meshes.leftTop.position.x;
            i.position.y = this.meshes.leftTop.position.y;
          }
          break;
        case "rightBottom":
          {
            i.position.x = this.meshes.rightTop.position.x;
            i.position.y = -this.meshes.rightTop.position.y;
          }
          break;
        case "leftBottom": {
          i.position.x = -this.meshes.rightBottom.position.x;
          i.position.y = -this.meshes.leftTop.position.y;
        }
      }
    });
  }

  hide() {
    this.group.visible = false;
    this.startData.startHeight = 0;
    this.startData.startWidth = 0;
  }
}

export default Transformer;
