import useTimeLine from "../hooks/useTimeLine";

function Timeline() {
  const timeLine = useTimeLine((e) => e.keyFrames);
  const play = useTimeLine((e) => e.play);

  return (
    <div className=" h-full text-white">
      <button onClick={play} className="p-2">
        Play
      </button>
      <div className="flex gap-5 p-2">
        {timeLine.map((e) => (
          <div key={e.id} className="size-2 bg-white rotate-45"></div>
        ))}
      </div>
    </div>
  );
}

export default Timeline;
