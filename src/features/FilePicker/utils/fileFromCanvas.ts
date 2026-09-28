const fileFromCanvas = async (canvas: HTMLCanvasElement, name: string) => {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b === null ? reject(b) : resolve(b)));
  });

  return new File([blob], name);
};

export { fileFromCanvas };
