const createImageFromUrl = (src: string, hash: string) => {
  const image = new Image();
  image.src = src;
  image.dataset.hash = hash;
  return image;
};

export { createImageFromUrl };
