import { useScreenContext } from "@/app/context/screenContext/context";
import { useAppSelector } from "@/app/store";
import type Konva from "konva";
import type { KonvaEventObject, Node, NodeConfig } from "konva/lib/Node";
import type { ImageConfig } from "konva/lib/shapes/Image";
import type { Transformer } from "konva/lib/shapes/Transformer";
import { ALL_FORMATS, BlobSource, Input, VideoSampleSink } from "mediabunny";
import { motion, useMotionValue } from "motion/react";
import { Fragment, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { MdDelete } from "react-icons/md";
import { Circle, Image, Rect, Text } from "react-konva";
import { Html } from "react-konva-utils";
import useImage from "use-image";
import { useTimelineContext } from "../timeline/context/useTimelineContext";
import { useShapesRecordContext } from "./useShapesRecordContext";

interface Props {
  id: string;
  transformerRef: React.RefObject<Transformer | null>;
  stageWidth: number;
  stageHeight: number;
  videoWidth: number;
  videoHeight: number;
}
function AppShapes(props: Props) {
  const shapesContext = useShapesRecordContext();
  const timelineContext = useTimelineContext();
  const screenContext = useScreenContext();
  const shapeDetails = useAppSelector((state) => state.shapes.data[props.id]);
  console.log({ shapeDetails });

  const isSelected = useAppSelector((state) => state.shapes.selectedNodeId === props.id);
  //
  const hasAddedNode = useRef(false);
  const isFirstRender = useRef(true);
  const floatingRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<Node<NodeConfig> | null>(null);
  //
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  //
  const shapeId = props.id;
  const isImage = shapeDetails?.type === "image";

  if (isFirstRender.current && nodeRef.current) {
    props.transformerRef?.current?.nodes([nodeRef.current]);
    isFirstRender.current = false;
  }

  const sharedProps: NodeConfig = {
    id: shapeId,
    y: (props.stageHeight - 200) / 2,
    x: (props.stageWidth - 200) / 2,
    width: 200,
    height: 200,
    stroke: "red",
    strokeWidth: isImage ? 0 : 5,
    fill: isImage ? undefined : "rgba(0,225,0,1)",
    //
    draggable: true,
    isClickable: true,
    strokeScaleEnabled: false,
    //
    onClick,
    onMouseDown: onClick,
    onDragEnd: handleDragEnd,
    onDragMove: handleDragMove,
    ref: handleNodeRef,
    onTransformEnd: handleTransformEnd,
  };

  function onClick(node: KonvaEventObject<MouseEvent, Node<NodeConfig>>) {
    if (node) {
      handleDragMove();
    }
  }

  function handleDragMove() {
    if (!nodeRef?.current) return;
    const elementRef = floatingRef?.current?.getBoundingClientRect();
    const _x = nodeRef?.current?.x();
    const _y = nodeRef?.current?.y();
    const _offset = nodeRef?.current?.offset();
    const height = nodeRef?.current?.height() || 0;
    console.log(nodeRef?.current?.isVisible());
    const max_x = props.stageWidth - (elementRef?.width || 0);
    const max_y = props.stageHeight - (elementRef?.height || 0);

    x.set(Math.max(0, Math.min(_x, max_x)));
    y.set(Math.max(0, Math.min(_y, max_y)));
  }

  function handleNodeRef(node: Node<NodeConfig> | null) {
    if (node && !hasAddedNode.current) {
      shapesContext.saveShape(shapeId, node);
      nodeRef.current = node;
      hasAddedNode.current = true;
    }
  }

  function handleDragEnd(e: KonvaEventObject<DragEvent, Node<NodeConfig>>) {
    const x = e.currentTarget?.x();
    const y = e?.currentTarget?.y();
    const timeStamp = timelineContext.getPlayHeadPosition();
    timelineContext.addKeyFrame(shapeId, {
      animatable: {
        x,
        y,
      },
      timeStamp: timeStamp || 0,
    });
  }

  function handleTransformEnd(e: KonvaEventObject<Event, Node<NodeConfig>>) {}

  let node: ReactNode = null;

  switch (shapeDetails?.type) {
    case "circle":
      node = <Circle {...sharedProps} />;
      break;
    case "square":
      node = <Rect {...sharedProps} />;
      break;
    case "text":
      sharedProps.strokeWidth = 0;
      sharedProps.width = undefined;
      sharedProps.height = undefined;
      node = <CustomText {...sharedProps} />;
      break;
    case "image":
      node = (
        <URLImage
          {...sharedProps}
          videoHeight={props.videoHeight}
          videoWidth={props.videoWidth}
          src={shapeDetails?.src || ""}
        />
      );
      break;
    case "video":
      {
        const f = async () => {
          // create blob source from url
          console.log("Processing video...", shapeDetails?.src);
          if (!shapeDetails?.src) return;
          const blob = await fetch(shapeDetails.src).then((r) => r.blob());
          const input = new Input({
            source: new BlobSource(blob), // or BlobSource if local file
            formats: ALL_FORMATS,
          });

          const videoTrack = await input.getPrimaryVideoTrack();

          if (!videoTrack) return;
          const sink = new VideoSampleSink(videoTrack);

          let i = 0;
          for await (const frame of sink.samples()) {
            // `frame` is a VideoFrame-like object (pixel data, timestamp, etc.)
            // You can draw it to a canvas, extract as image, etc.
            // e.g.:
            const imageBitmap = (await frame.toCanvasImageSource()) as VideoFrame;

            // crate image blob link
            const canvas = new OffscreenCanvas(frame.displayWidth, frame.displayHeight);
            const ctx = canvas.getContext("2d")!;

            // Draw the frame onto canvas
            ctx.drawImage(imageBitmap, 0, 0);

            // Convert to Blob (PNG by default, can be "image/jpeg")
            const blob = await canvas.convertToBlob({ type: "image/png" });
            const url = URL.createObjectURL(blob);
            console.log({ url });

            // setVideoSrc(url);
            // then you can save or process the bitmap
            console.log("Got frame", i, "timestamp", frame.timestamp);
            i++;

            frame.close();
            break;
          }
          f();
        };
        f();
        node = null;
      }
      break;
    default:
      node = null;
  }

  return (
    <Fragment>
      {isSelected && (
        <Html
          transform
          groupProps={{}}
          divProps={{ style: { zIndex: 30 } }}
          parentNodeFunc={() => {
            return screenContext?.getStageNode()?.container() || (document.body as HTMLDivElement);
          }}
        >
          <motion.div
            ref={floatingRef}
            style={{ top: y, left: x }}
            className="fixed z-40 flex items-center gap-2 rounded-md border bg-white p-2 shadow"
          >
            <MdDelete
              size={24}
              onClick={() => {
                shapesContext.deleteShape(shapeId);
                props?.transformerRef?.current?.nodes([]);
              }}
            />
            <motion.div className="size-6 rounded-full bg-black" />
          </motion.div>
        </Html>
      )}
      {node}
    </Fragment>
  );
}

interface URLImageProps extends Omit<ImageConfig, "image"> {
  src: string;
  ref?: (node: Node<NodeConfig> | null) => void;
  videoWidth: number;
  videoHeight: number;
}
const URLImage = ({ src, ...props }: { src: string } & URLImageProps) => {
  const [image] = useImage(src, "anonymous");
  const imageRef = useRef<Konva.Image>(null);
  const hasCenteredImage = useRef(false);

  const IMAGE_MAX_HEIGHT = props.videoHeight * 0.8;
  const height = Math.min(IMAGE_MAX_HEIGHT, image?.height || 0);
  const imageRatio = (image?.width || 0) / (image?.height || 1);
  const width = height * imageRatio;

  console.log({ width, height, props, src });

  return (
    <Image
      image={image}
      {...props}
      width={width}
      height={height}
      ref={(node) => {
        imageRef.current = node;
        props.ref?.(node);
      }}
    />
  );
};

const CustomText = (
  props: ComponentProps<typeof Text> & {
    ref?: (node: Node<NodeConfig> | null) => void;
  },
) => {
  const [showInput, setShowInput] = useState(false);
  const textRef = useRef<Konva.Text>(null);
  const hasCenteredText = useRef(false);
  const screenContext = useScreenContext();

  if (!hasCenteredText.current && textRef.current) {
    const stageSize = screenContext?.getStageNode()?.size() || {
      width: 0,
      height: 0,
    };
    const x = (stageSize.width - textRef.current.width()) / 2;
    const y = (stageSize.height - textRef.current.height()) / 2;
    textRef.current.x(x);
    textRef.current.y(y);
    hasCenteredText.current = true;
  }

  return (
    <Text
      text="A wild text appears!"
      fontSize={20}
      {...props}
      onDblClick={(node) => {
        setShowInput(true);
        node?.currentTarget?.hide();
      }}
      ref={(node) => {
        textRef.current = node;
        props.ref?.(node);
      }}
    />
  );
};

export default AppShapes;
