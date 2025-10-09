import { getObjectSize } from "@/app/util";
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

class Transformer {
  private meshes = {} as Record<
    "leftTop" | "leftBottom" | "rightTop" | "rightBottom" | "border",
    Mesh | LineSegments
  >;
  private size: number;
  private group: Group;
  private startData = {
    startWidth: 0,
    startHeight: 0,
  };

  constructor(onCreate: (allMesh: Group) => void) {
    this.group = new Group();
    this.size = 0;
    const border = new LineSegments();
    border.position.z = 0;
    border.userData.canSelect = false;
    this.meshes["border"] = border;
    border.raycast = () => {};
    this.group.add(border);
    const material = new MeshBasicMaterial({ color: "red" });
    const plane = new PlaneGeometry(0, 0);

    (["leftTop", "leftBottom", "rightTop", "rightBottom"] as const).forEach((position) => {
      const rect = new Mesh(plane, material);
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

  align(mesh: Object3D<Object3DEventMap>, z: number, padding = 0) {
    const box = new Box3().setFromObject(mesh);
    const size = box.getSize(new Vector3());
    const w = size.x;
    const h = size.y;
    const p = this.size + padding;
    this.startData = {
      startHeight: h,
      startWidth: w,
    };

    this.meshes.border.geometry.dispose();
    this.meshes.border.geometry = new EdgesGeometry(new PlaneGeometry(w + p, h + p));
    this.meshes.border.position.z = z;

    this.meshes.rightTop.position.x = w / 2 + this.size;
    this.meshes.rightTop.position.y = h / 2 + this.size;
    this.meshes.rightTop.position.z = z;

    this.meshes.rightBottom.position.x = w / 2 + this.size;
    this.meshes.rightBottom.position.y = -h / 2 - this.size;
    this.meshes.rightBottom.position.z = z;

    this.meshes.leftTop.position.x = -w / 2 - this.size;
    this.meshes.leftTop.position.y = h / 2 + this.size;
    this.meshes.leftTop.position.z = z;

    this.meshes.leftBottom.position.x = -w / 2 - this.size;
    this.meshes.leftBottom.position.y = -h / 2 - this.size;
    this.meshes.leftBottom.position.z = z;

    this.group.visible = true;
    this.group.position.x = mesh.position.x;
    this.group.position.y = mesh.position.y;
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

  resize(width: number, height: number) {
    const borer = this.meshes.border;
    const size = getObjectSize(borer);
    const { startHeight, startWidth } = this.startData;
    borer.geometry.dispose();
    borer.geometry = new EdgesGeometry(new PlaneGeometry(startWidth + width, startHeight + height));
  }

  hide() {
    this.group.visible = false;
    this.startData = { startHeight: 0, startWidth: 0 };
  }
}

export default Transformer;
