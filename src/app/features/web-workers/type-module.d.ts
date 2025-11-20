import type { FabricObject } from "fabric";

declare module "fabric" {
  interface FabricObject {
    id?: string;
    name?: string;
    src?: string;
    previewImage?: string;
    keyFrames?: Partial<Record<string, number[]>>;
  }

  interface SerializedObjectProps {
    id?: string;
    name?: string;
  }
}

FabricObject.customProperties = ["name", "id", "keyFrames"];
