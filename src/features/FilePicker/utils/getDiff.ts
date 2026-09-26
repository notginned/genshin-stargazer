import pixelmatch from "pixelmatch";

const getDiff = async (
  img1: HTMLCanvasElement,
  img2: HTMLCanvasElement,
  width: number,
  height: number,
) => {
  const r1 = img1.getContext("2d")!.getImageData(0, 0, width, height);
  const r2 = img2.getContext("2d")!.getImageData(0, 0, width, height);

  return pixelmatch(r1.data, r2.data, undefined, width, height, {
    threshold: 0.1,
  });
};

export { getDiff };
