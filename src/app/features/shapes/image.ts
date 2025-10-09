import { CanvasTexture, DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry } from "three";
import { Shape } from "./shape";

class AppImage extends Shape {
  constructor(bitmapImage: ImageBitmap, width: number, height: number) {
    const texture = new CanvasTexture(bitmapImage);
    texture.colorSpace = "srgb"; // remove image whitening effect
    const material = new MeshBasicMaterial({
      map: texture,
      side: DoubleSide,
      transparent: true,
    });
    const geometry = new PlaneGeometry(width, height);
    const img = new Mesh(geometry, material);
    super(img);
    this.group.scale.y = -1;
  }
}

export default AppImage;
