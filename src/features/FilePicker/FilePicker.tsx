import type { FilePickerProps } from "../../types/FilePickerProps";
import { ImagePicker } from "./ImagePicker";
import { VideoPicker } from "./VideoPicker";

const FilePicker = ({ images, setImages }: FilePickerProps) => {
  return (
    <div className='file-picker'>
      <ImagePicker images={images} setImages={setImages} />
      <VideoPicker images={images} setImages={setImages} />
    </div>
  );
};

export { FilePicker };
