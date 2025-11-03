import { useAppDispatch } from "@/app/store";
import { type ReactNode } from "react";
import { CiImageOn } from "react-icons/ci";
import { FaRegCircle, FaRegSquare } from "react-icons/fa6";
import { LuShapes } from "react-icons/lu";
import { RiText } from "react-icons/ri";
import type { NodeType } from "../../../types";
import { useCanvasWorkerContext } from "../screen/canvas-worker-context";
import { addShape } from "./slice";

function ShapePicker() {
  const dispatch = useAppDispatch();
  const canvasContext = useCanvasWorkerContext();

  function handleAddNode(shape: NodeType) {
    const app = canvasContext.app;
    return function () {
      switch (shape) {
        case "image":
        case "video":
          break;
        case "square":
          app?.createShape({ type: "rect", width: 200, height: 200, borderWidth: 0 });
          break;
        case "circle":
          app?.createShape({ type: "circle", radius: 20 });
          break;

        default:
          dispatch(addShape({ type: shape }));
          break;
      }
    };
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async function (event) {
        // check of file is video
        const isVideo = file.type.startsWith("video/");
        console.log({ isVideo });

        const imgSrc = event.target?.result;
        if (typeof imgSrc === "string") {
          const image = new Image();
          image.src = imgSrc;
          await image.decode();
          const bitmapImage = await createImageBitmap(image);
          let width = image.width;
          let height = image.height;
          const aspectRation = width / height;
          const isLandscape = image.width > image.height;
          const maxWidth = document.body.clientWidth * 0.2;
          const maxHeight = document.body.clientHeight * 0.6;
          const shouldScale = isLandscape ? width > maxWidth : height > maxHeight;

          // ensure image is always in screen
          if (shouldScale) {
            if (isLandscape) {
              width = maxWidth;
              height = maxWidth / aspectRation;
            } else {
              height = maxHeight;
              width = maxHeight * aspectRation;
            }
          }

          canvasContext.app?.createShape({
            type: "image",
            width: width,
            height: height,
            src: imgSrc,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  }

  return (
    <div className="relative flex gap-2">
      <div className="flex items-center">
        <button className="relative">
          <input
            type="file"
            className="absolute left-0 z-10 h-full w-full cursor-pointer bg-black opacity-0"
            accept="image/*,video/*"
            onChange={handleImageChange}
          />
          <CiImageOn className="z-0" size={24} />
        </button>
        <div className="group relative">
          <LuShapes size={24} />
          <div className="absolute -top-[200%] bottom-0 -left-full hidden -translate-x-[40%] pl-5 group-hover:block">
            <div className="flex gap-3 rounded-full border bg-white px-3 py-1">
              {nodeData.map((e) => (
                <button
                  className="relative rounded-full p-1 transition-transform hover:scale-[105%] hover:bg-black hover:text-white active:scale-95 hover:[&>svg]:scale-75"
                  key={e.type}
                  onClick={handleAddNode(e.type)}
                >
                  {e.el}
                </button>
              ))}
            </div>
          </div>
        </div>
        <RiText className="z-0" size={24} />
      </div>
      <div className="p-2">
        <div className="rounded-sm bg-black p-2 text-white">
          <button>Animate</button>
          <button>De</button>
        </div>
      </div>
    </div>
  );
}

const nodeData: { type: NodeType; el: ReactNode }[] = [
  // { type: "text", el: <PiTextAaBold className="z-0" size={24} /> },
  { type: "circle", el: <FaRegCircle className="z-0" size={24} /> },
  { type: "square", el: <FaRegSquare className="z-0" size={24} /> },
];

export default ShapePicker;
