import { expose } from "comlink";
import { FabricObject } from "fabric";
import gsap from "gsap";
import type { Node } from "konva/lib/Node";
import type { ShapeConfig } from "konva/lib/Shape";
import type { Vector2d } from "konva/lib/types";
import {
  BufferTarget,
  CanvasSource,
  getFirstEncodableVideoCodec,
  Mp4OutputFormat,
  Output,
  QUALITY_MEDIUM,
} from "mediabunny";
import * as THREE from "three";
import type { KeyFrame, NodeType, TimeLineStore } from "../../../types";

const fabricPlugin: GSAPPlugin = {
  name: "fabric",
  init(
    target: object,

    values: Record<string, unknown>,
    // _tween: gsap.core.Tween,
    // _index: number,
    // _targets: object[]
  ) {
    if (!(target instanceof FabricObject)) return false; // only handle Konva nodes

    this._target = target as unknown as FabricObject;
    this._props = [];

    for (const p in values) {
      console.log({ p, target });

      const _p = p as keyof FabricObject;
      const start = target[_p] as number;
      const end = values[p] as number | string;
      let change: number | object = 0;

      if (typeof end === "number") {
        change = end - start;
      }

      // @ts-expect-error Need to check type definition for custom plugin
      this._props.push({ prop: p, start, end, change });
    }

    // mark layer for redraw on each tick
    // this._layer = target.getLayer();
  },
  render(ratio, data) {
    const t = data._target;
    const _data = data as unknown as {
      _props: Array<{
        prop: string;
        start: number | string;
        change: number | object;
      }>;
    };

    _data._props.forEach((obj) => {
      const _start = obj.start as number;
      const _change = obj.change as number;
      const newValue = _start + _change * ratio;
      t.set({ [obj.prop]: newValue });
      console.log(_start, newValue, data);
    });
    data._target.canvas?.requestRenderAll();
  },
};

gsap.registerPlugin(fabricPlugin);

export async function start_worker(
  videoDimensions: TimeLineStore["videoDimensions"],
  videoBoundaryPos: Vector2d,
  videoDuration: number,
  scale: number,
  nodes: {
    keyframe: KeyFrame[] | undefined;
    type: NodeType;
    init: ReturnType<Node<ShapeConfig>["getAttr"]>;
  }[],
  p: (progress: number) => void,
  exportQuality = 1,
  // _canvas: OffscreenCanvas,
) {
  // return;
  const output = new Output({
    target: new BufferTarget(), // Stored in memory
    format: new Mp4OutputFormat({}),
  });
  console.log("worker started");
  const width = videoDimensions.width * exportQuality;
  const height = videoDimensions.height * exportQuality;
  const videoCodec = await getFirstEncodableVideoCodec(output.format.getSupportedVideoCodecs(), {
    width: width,
    height: height,
  });

  if (!videoCodec) {
    throw new Error("Your browser doesn't support video encoding.");
  }

  //
  //

  const v = new OffscreenCanvas(width, height);

  // Scene
  const scene = new THREE.Scene();

  // Camera with white background
  scene.background = new THREE.Color(0xffffff);
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.z = 5;

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: v });
  renderer.setPixelRatio(2);
  renderer.setSize(width, height, false);

  // Rectangle (increased size)
  // doubled from 2x1 to 4x2
  const geometry = new THREE.PlaneGeometry(4, 2);
  const material = new THREE.MeshBasicMaterial({
    color: "blue",
    side: THREE.DoubleSide,
  });
  const group = new THREE.Group();
  const rectangle = new THREE.Mesh(geometry, material);
  // left border
  const leftBoder = new THREE.Mesh(
    // height matches rectangle height
    new THREE.PlaneGeometry(0.1, 2),
    new THREE.MeshBasicMaterial({ color: "red" }),
  );
  // place at left edge (half width + small gap)
  leftBoder.position.x = -2.05;
  group.add(leftBoder);
  // right border
  const rightBorder = new THREE.Mesh(
    new THREE.PlaneGeometry(0.1, 2),
    new THREE.MeshBasicMaterial({ color: "red" }),
  );
  rightBorder.position.x = 2.05;
  group.add(rightBorder);

  // top border
  const topBorder = new THREE.Mesh(
    // width slightly larger than rectangle width
    new THREE.PlaneGeometry(4.2, 0.1),
    new THREE.MeshBasicMaterial({ color: "red" }),
  );
  topBorder.position.y = 1.05;
  group.add(topBorder);
  // bottom border
  const bottomBorder = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 0.1),
    new THREE.MeshBasicMaterial({ color: "red" }),
  );
  bottomBorder.position.y = -1.05;
  group.add(bottomBorder);

  group.add(rectangle);
  scene.add(group);
  renderer.render(scene, camera);

  const frameRate = 60;
  const canvasSource = new CanvasSource(v, {
    codec: videoCodec,
    bitrate: QUALITY_MEDIUM,
  });

  //

  const timline = gsap.timeline({
    paused: true,
    onUpdate: () => {},
  });

  try {
    output.addVideoTrack(canvasSource, { frameRate });
    await output.start();
    timline.to(group.rotation, {
      duration: videoDuration,
      z: Math.PI * 2,
      y: Math.PI * 2,
      x: Math.PI * 2,
      ease: "none",

      onUpdate: () => {},
    });

    const TOTAL_DURATION = 10; // seconds
    const totalFrames = frameRate * TOTAL_DURATION;
    let droppedFrames = 0;
    const expectedFrameDuration = 1000 / frameRate; // ms

    for (let i = 1; i < totalFrames; i++) {
      const frameStart = performance.now();
      const timeStamp = (i / totalFrames) * TOTAL_DURATION;
      const progress = i / totalFrames;

      timline.seek(timeStamp, false);
      renderer.render(scene, camera);

      await canvasSource.add(timeStamp, 1 / frameRate);
      p(progress);
      const frameEnd = performance.now();
      const actualFrameDuration = frameEnd - frameStart;
      if (actualFrameDuration > expectedFrameDuration) {
        droppedFrames++;
        console.warn(
          `Frame drop detected at frame ${i}: took ${actualFrameDuration.toFixed(2)}ms (expected ${expectedFrameDuration.toFixed(2)}ms)`,
        );
      }
    }
    if (droppedFrames > 0) {
      console.warn(`Total dropped frames: ${droppedFrames} out of ${totalFrames}`);
    }
    //
    canvasSource.close();
    await output.finalize();
    const videoBlob = new Blob([output.target.buffer!], {
      type: output.format.mimeType,
    });
    const resultVideo = URL.createObjectURL(videoBlob);
    return resultVideo;
  } catch (error) {
    console.error("Export failed", { error });
  }
}

const g = { start: start_worker };
export type WorkerAPI = typeof g;
expose(g);
