export class ImageError extends Error {
  image: ImageBitmap;

  constructor(message: string, image: ImageBitmap) {
    super(message);
    this.image = image;
  }
}
