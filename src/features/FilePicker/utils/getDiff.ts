import pixelmatch from "pixelmatch";

const getDiff = (img1: OffscreenCanvas, img2: OffscreenCanvas) => {
  const width = img1.width;
  const height = img1.height;
  const r1 = img1.getContext("2d")!.getImageData(0, 0, width, height);
  const r2 = img2.getContext("2d")!.getImageData(0, 0, width, height);

  return (
    pixelmatch(r1.data, r2.data, undefined, width, height, {
      threshold: 0.1,
    }) /
    (width * height)
  );
};

export { getDiff };
