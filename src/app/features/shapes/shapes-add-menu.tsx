import { useAppDispatch } from "@/app/store";
import { Icon } from "@iconify/react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState, type ReactNode } from "react";
import type { EditorMode, NodeType } from "../../../types";
import { useCanvasWorkerContext } from "../canvas/useCanvasContext";
import { TimeStamp } from "../timeline/Timestamp";
import { addShape } from "./slice";

interface Props {
  onModeSwitch: (mode: EditorMode) => void;
  initiMode: EditorMode;
}
function ShapePicker(props: Props) {
  const dispatch = useAppDispatch();
  const canvasContext = useCanvasWorkerContext();
  const [mode, setMode] = useState<EditorMode>(props.initiMode);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAddShape(shape: NodeType) {
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
          id = await app?.createShape({ type: "text", text: "HEllo Hellofoool hello 😂" });
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

          // await image.decode();
          // const bitmapImage = await createImageBitmap(image);
          // const width = image.width;
          // const height = image.height;
          // const aspectRation = width / height;
          // const isLandscape = image.width > image.height;
          // const maxWidth = document.body.clientWidth * 0.2;
          // const maxHeight = document.body.clientHeight * 0.6;
          // const shouldScale = isLandscape ? width > maxWidth : height > maxHeight;

          // ensure image is always in screen
          // if (shouldScale) {
          //   if (isLandscape) {
          //     width = maxWidth;
          //     height = maxWidth / aspectRation;
          //   } else {
          //     height = maxHeight;
          //     width = maxHeight * aspectRation;
          //   }
          // }

          const id = await canvasContext.app?.createShape({
            type: "image",
            src: imgSrc,
          });
          if (id) dispatch(addShape({ id, type: "image", previewImage: imgSrc, image: imgSrc }));
          if (inputRef.current) {
            inputRef.current.value = "";
          }
        }
      };
      reader.readAsDataURL(file);
    }
  }

  return (
    <div className="relative flex text-xl">
      <motion.div
        className="flex items-center gap-4 border-r-2 border-gray-300 p-2 px-4"
        layout="preserve-aspect"
      >
        <AnimatePresence>
          {mode === "design" ? (
            <motion.div
              layout="preserve-aspect"
              className="flex items-center gap-4"
              initial={{ backdropFilter: ["blur(5px)"], opacity: [0] }}
              animate={{ backdropFilter: "blur(0px)", opacity: 1, scale: 1 }}
              exit={{ backdropFilter: "blur(10px)", opacity: 0, scale: 0.9 }}
            >
              <button className="relative overflow-hidden">
                <input
                  type="file"
                  className="absolute left-0 z-10 h-full w-full cursor-pointer bg-black opacity-0"
                  accept="image/*,video/*"
                  onChange={handleImageChange}
                  ref={inputRef}
                />
                <Icon className="z-0" icon={"material-symbols:image-outline"} />
              </button>
              <div className="group relative">
                <Icon className="z-0" icon={"streamline-ultimate:shapes"} />
                <div className="absolute -top-[300%] bottom-0 -left-full hidden -translate-x-[25%] pl-5 group-hover:block">
                  <div className="flex gap-3 rounded-md border-2 border-gray-300 bg-white px-3 py-1">
                    {nodeData.map((e) => (
                      <button
                        className="relative rounded-full p-1 transition-transform hover:scale-[105%] hover:bg-black hover:text-white active:scale-95 hover:[&>svg]:scale-75"
                        key={e.type}
                        onClick={handleAddShape(e.type)}
                      >
                        {e.el}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <Icon
                onClick={handleAddShape("text")}
                className="z-0"
                icon={"fluent:text-t-16-filled"}
              />
            </motion.div>
          ) : (
            <motion.div
              layout="preserve-aspect"
              className="flex items-center gap-3 text-sm"
              initial={{ backdropFilter: ["blur(5px)"], opacity: [0] }}
              animate={{ backdropFilter: "blur(0px)", opacity: 1, scale: 1 }}
              exit={{ backdropFilter: "blur(10px)", opacity: 0, scale: 0.9 }}
            >
              <button>
                <Icon icon={"famicons:play"} className="text-blue-400" />
              </button>
              <div>
                <TimeStamp />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <SwitchMode
        onModeSwitch={(mode) => {
          props.onModeSwitch(mode);
          setMode(mode);
        }}
        mode={mode}
      />
    </div>
  );
}

const SwitchMode = (props: Pick<Props, "onModeSwitch"> & { mode: EditorMode }) => {
  const isDesignMode = props.mode === "design";
  const translateX = isDesignMode ? "0%" : "100%";
  const borderRadius = isDesignMode ? "0.25rem" : "0.5rem";

  const toggleMode = (_mode: typeof props.mode) => () => {
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
  { type: "circle", el: <Icon className="z-0" icon={"tdesign:circle"} /> },
  { type: "square", el: <Icon className="z-0" icon={"material-symbols-light:square-outline"} /> },
];

export default ShapePicker;
