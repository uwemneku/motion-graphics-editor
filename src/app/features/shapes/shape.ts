import { Group, Object3D } from "three";

export class Shape {
  group = new Group();
  constructor(...args: Object3D[]) {
    this.group.add(...args);
  }
}
