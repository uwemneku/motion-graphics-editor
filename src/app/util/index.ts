import { Box3, Vector3, type Object3D } from "three";

export const getObjectSize = (object: Object3D) => {
  const box = new Box3().setFromObject(object);
  const size = box.getSize(new Vector3());
  return size;
};
