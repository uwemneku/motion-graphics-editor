# Notes

- Trying resizing instead of scaling

01/10/24

- Was having issues where videos generated with a worker looked very pixelated, turns out it was because the  [pixelRatio](https://konvajs.org/api/Konva.Canvas.html#getPixelRatio) on the main thread is 2 but on a worker it had a value of 1.
To get the same quality from the worker thread, I had to set the pixelRatio to two, this made the export process slow but faster than the main thread.

- I tried the app on a low end laptop and it was very very slow compared with other tools like [pikimov](https://pikimov.com/). Did some debugging and the lag was due to how I handled state management with zustand. Zustand docs does show how to reduce rerenders but I think I'll just switch to redux toolkit.

- Took a look at [motionity](https://www.motionity.app/) and it's pretty cool, I tried to replicate the masking feature with knova but failed. I might switch and use Fabric .

<hr />
24/09/2024
- Decoding an svg image directly from the blob could lead to  issues.

  ```ts
        const imgBlob = await (await fetch("svg_image_url")).blob();
        const bitmapImage = await createImageBitmap(imgBlob);
  ```

  To handle such edge cases, better to use Image.decode

  ```ts
     const img = new Image();
      img.src = "svg_image_url";
      await img.decode();
      const bitmapImage = await createImageBitmap(img);
  ```

<hr />

23/09/2024

- Tried out [comlink](https://github.com/GoogleChromeLabs/comlink) for web workers and it really simplified things.

<hr />

22/09/2024

- Tried offloading video export to a web worker [(sample script)](https://gist.github.com/uwemneku/53da519d8f602098c9fb7dacba53a672). The resulting video had a very low quality. Turns out the dimensions were the issue, doubling the width and height of the stage fixed the issue.
This means I might be able to export videos in parallel.

<hr />

21/09/2024

- Did some experiments to try and find a good video export strategy.
  - Had severe video lagging issues when I tired to export video frames directly from the displayed canvas
  - Exporting from an offline canvas was way better and faster.
  - Exporting frames with a loop and [Media bunny](https://mediabunny.dev/examples/procedural-generation/) was faster than recording the animation with [canvasElement.captureStream()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream)
  - Currently leaning towards recreating all shapes in an offscreen canvas when preparing animations for rendering.
    - Need to do more experiments to see of it might be possible to use workers to split video rendering.
        With each worker rendering a segment of the animation and then using media bunny to join the videos.
  - Media bunny is really cool
  ![video](./docs/assets/export.gif "Video export")

- Honorable mention: Understood the math for animating circular progress bar with svg circle from this [codepen](https://codepen.io/JMChristensen/pen/AGbeEy?editors=1111)

<hr />

16/09/2024

- Added support for importing images
- Updated canvas design
<img src="./docs/assets/ezgif-2e8bcf8acdc3cd.gif" alt="">

<hr />

14/09/2024

- Switched from recreating timeline for every keyframe to adjusting the timeline dynamically. This caused a bug where after the second keyframe, gsap would jump to the next keyframe without any animation

<img src="./docs/assets/ezgif-6c0d5d1d59ebd8.gif" alt="bug gif" />

- The fix for this was to use timeline.invalidate() after adding a keyframe. This removed internally recording and recalculated tweens. [Thanks to Gemini](https://share.google/aimode/d90IQATrmRZCRKkDl)

  - Not so sure how expensive invalidating the entire timeline after  adding a keyframe is, but another option i noticed worked was adding the keyframe as a nested timeline. This worked without needing any timeline invalidation

        ```js
            function addKeyframe (keyframe) {
                timeline.add(
                    timeline.to(
                          konva: keyFrame.animatable,
                          duration: keyFrameDuration,
                          ease: "linear",
                          id: `${keyFrame.timeStamp}`,
                    ),
                    previousKeyFrame.timestamp
                )
            }
        ```

<hr />
12/09/2024

- For some reason when interpolation a color with gsap, when the initial color is a string, Nan is attached to the end

  - This was because the interpolate function of the custom gsap plugin for knova could not interpolate colors. Added a custom function to handle color interpolation. Considered copying code from `React native Reanimated` but that was too much.
