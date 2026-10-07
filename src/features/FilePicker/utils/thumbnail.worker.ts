import { Input, ALL_FORMATS, BlobSource, CanvasSink } from "mediabunny";
import { registerAc3Decoder } from "@mediabunny/ac3";
import { registerDtsDecoder } from "@mediabunny/dts";
import { registerProresDecoder } from "@mediabunny/prores";
import { getDiff } from "./getDiff";

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
          const FPS = 2;
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
          const raws: OffscreenCanvas[] = [];
          const canvases = sink.canvasesAtTimestamps(timestamps);
          let buff = (await canvases.next()).value;

          if (!buff) {
            throw new Error("Thumbnail missing");
          }

          for await (const wrappedCanvas of canvases) {
            if (!wrappedCanvas) {
              throw new Error("Thumbnail missing");
            }

            const canvas = wrappedCanvas.canvas as OffscreenCanvas;

            const diffP = getDiff(canvas, buff.canvas as OffscreenCanvas) * 100;
            if (diffP >= 0.2) {
              raws.push(buff.canvas as OffscreenCanvas);
            }

            buff = wrappedCanvas;
            i++;
            self.postMessage({ type: "progress", value: i / THUMBNAIL_COUNT });
          }

          // Handling the last image
          const diffP =
            getDiff(buff.canvas as OffscreenCanvas, raws[raws.length - 1]) *
            100;
          if (diffP >= 0.2) raws.push(buff.canvas as OffscreenCanvas);

          const frames = await Promise.all(
            raws.map(
              async (raws) =>
                new File([await raws.convertToBlob()], crypto.randomUUID()),
            ),
          );

          self.postMessage({ type: "frames", frames });
        }

        break;
    }
  } catch (error) {
    console.error(error);
    self.postMessage({ type: "error", error });
  }
};
