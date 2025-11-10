import { useAppDispatch } from "@/app/store";
import { Icon } from "@iconify/react";
import { motion } from "motion/react";
import { useState, type ReactNode } from "react";
import type { EditorMode, NodeType } from "../../../types";
import { useCanvasWorkerContext } from "../screen/canvas-worker-context";
import { addShape } from "./slice";

interface Props {
  onModeSwitch: (mode: EditorMode) => void;
}
function ShapePicker(props: Props) {
  const dispatch = useAppDispatch();
  const canvasContext = useCanvasWorkerContext();

  function handleAddNode(shape: NodeType) {
    const app = canvasContext.app;
    return async function () {
      let id: string | undefined = "";
      switch (shape) {
        case "image":
        case "video":
          break;
        case "square":
          id = await app?.createShape({ type: "rect", width: 200, height: 200, borderWidth: 0 });
          if (id) dispatch(addShape({ id, type: "rectangle" }));
          break;
        case "circle":
          id = await app?.createShape({ type: "circle", radius: 20 });
          if (id) dispatch(addShape({ id, type: "circle" }));
          break;
        case "text":
          id = await app?.createShape({ type: "text", text: "HEllo" });
          if (id) dispatch(addShape({ id, type: "text" }));
          break;

        default:
          break;
      }
    };
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async function (event) {
        // check of file is video
        const isVideo = file.type.startsWith("video/");

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

          const id = await canvasContext.app?.createShape({
            type: "image",
            width: width,
            height: height,
            src: imgSrc,
          });
          if (id) dispatch(addShape({ id, type: "image", previewImage: imgSrc, image: imgSrc }));
        }
      };
      reader.readAsDataURL(file);
    }
  }

  return (
    <div className="relative flex text-xl">
      <div className="flex items-center gap-4 border-r-2 border-gray-300 p-2 px-4">
        <button className="relative">
          <input
            type="file"
            className="absolute left-0 z-10 h-full w-full cursor-pointer bg-black opacity-0"
            accept="image/*,video/*"
            onChange={handleImageChange}
          />
          <Icon className="z-0" icon={"material-symbols:image-outline"} />
        </button>
        <div className="group relative">
          <Icon className="z-0" icon={"streamline-ultimate:shapes"} />
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
        <Icon onClick={handleAddNode("text")} className="z-0" icon={"fluent:text-t-16-filled"} />
      </div>
      <SwitchMode onModeSwitch={props.onModeSwitch} />
    </div>
  );
}

const SwitchMode = (props: Pick<Props, "onModeSwitch">) => {
  const [mode, setMode] = useState<EditorMode>("design");

  const isDesignMode = mode === "design";
  const translateX = isDesignMode ? "0%" : "100%";
  const borderRadius = isDesignMode ? "0.25rem" : "0.5rem";

  const toggleMode = (_mode: typeof mode) => () => {
    setMode(_mode);
    props.onModeSwitch(_mode);
  };
  return (
    <div className="relative flex min-h-[40px] items-center overflow-hidden text-black">
      <motion.div
        className="absolute top-0 left-0 h-full w-1/2 p-1"
        animate={{ translateX }}
        transition={{ bounce: 0 }}
      >
        <motion.div
          className="h-full w-full bg-blue-400"
          animate={{
            borderRadius: "0.25rem",
            borderTopRightRadius: borderRadius,
            borderBottomRightRadius: borderRadius,
          }}
        />
      </motion.div>

      <motion.button className="relative z-10 h-full px-3" onClick={toggleMode("design")}>
        <Icon
          icon="fluent:design-ideas-48-regular"
          className="transition-colors"
          color={isDesignMode ? "white" : "black"}
        />
      </motion.button>
      <motion.button className="relative z-10 h-full px-3" onClick={toggleMode("animate")}>
        <Icon
          icon="tabler:video"
          color={!isDesignMode ? "white" : "black"}
          className="transition-colors"
        />
      </motion.button>
    </div>
  );
};

const nodeData: { type: NodeType; el: ReactNode }[] = [
  // { type: "text", el: <PiTextAaBold className="z-0" size={24} /> },
  { type: "circle", el: <Icon className="z-0" icon={"material-symbols:image-outline"} /> },
  { type: "square", el: <Icon className="z-0" icon={"streamline-ultimate:shapes"} /> },
];

export default ShapePicker;
