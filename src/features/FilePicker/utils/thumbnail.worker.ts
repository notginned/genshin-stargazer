import { Input, ALL_FORMATS, BlobSource, CanvasSink } from "mediabunny";
import { registerAc3Decoder } from "@mediabunny/ac3";
import { registerDtsDecoder } from "@mediabunny/dts";
import { registerProresDecoder } from "@mediabunny/prores";
import { dedupFrames } from "./processFrames";

// enabling non WebCodec decoders
registerAc3Decoder();
registerDtsDecoder();
registerProresDecoder();

self.onmessage = async (e) => {
  try {
    const type: string = e.data.type;
    const file: File = e.data.file;

    switch (type) {
      case "file":
        {
          const source = new BlobSource(file);
          const title = file.name;

          const input = new Input({
            source,
            formats: ALL_FORMATS,
          });

          const videoTrack = await input.getPrimaryVideoTrack();
          if (!videoTrack) {
            throw new Error("File has no video track.");
          }

          if ((await videoTrack.getCodec()) === null) {
            throw new Error("Unsupported video codec.");
          }

          if (!(await videoTrack.canDecode())) {
            throw new Error("Unable to decode the video track.");
          }

          const width = await videoTrack.getDisplayWidth();
          const height = await videoTrack.getDisplayHeight();

          // Prepare the timestamps for the thumbnails, equally spaced between the first and last timestamp of the video
          const FPS = 1;
          const firstTimestamp = await videoTrack.getFirstTimestamp();
          const lastTimestamp = await videoTrack.computeDuration();
          const THUMBNAIL_COUNT = lastTimestamp * FPS;

          const timestamps = Array.from(
            { length: THUMBNAIL_COUNT },
            (_, i) =>
              firstTimestamp +
              (i * (lastTimestamp - firstTimestamp)) / THUMBNAIL_COUNT,
          );

          // Create a CanvasSink for extracting resized frames from the video track
          const sink = new CanvasSink(videoTrack, {
            width,
            height,
            fit: "fill",
          });

          // Iterate over all thumbnail canvases
          let i = 0;
          const frames: OffscreenCanvas[] = [];

          for await (const wrappedCanvas of sink.canvasesAtTimestamps(
            timestamps,
          )) {
            if (!wrappedCanvas) {
              throw new Error("Thumbnail missing");
            }
            const canvas = wrappedCanvas.canvas as OffscreenCanvas;

            frames.push(canvas);
            i++;
            self.postMessage({ type: "progress", value: i });
          }

          const unique = await Promise.all(
            dedupFrames(frames).map(
              async (frame, i) =>
                new File([await frame.convertToBlob()], `${title}_${i}`),
            ),
          );

          self.postMessage({ type: "frames", frames: unique });
        }

        break;
    }
  } catch (error) {
    console.error(error);
    self.postMessage({ type: "error", error });
  }
};
