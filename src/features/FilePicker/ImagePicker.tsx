import { type ChangeEvent } from "react";
import InsertPhotoIcon from "@mui/icons-material/InsertPhoto";
import type { Images } from "../../types/State.type";
import { hashCode } from "../../utils/hash";
import type { FilePickerProps } from "../../types/FilePickerProps";
import { log } from "../../utils/lib";

function ImagePicker({ images, setImages }: FilePickerProps) {
  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;

    const res: Images = {};

    await Promise.all(
      Array.from(e.target.files, async (file) => {
        console.log("data", file)
        const hash = "h" + hashCode(file.name + file.size + file.lastModified);
        res[hash] = { file , hash };
      }),
    );

    const uniqueImages = { ...images, ...res };
    // log({ uniqueImages });
    setImages(uniqueImages);
  }

  return (
    <>
      <label className="btn btn-add">
        <InsertPhotoIcon /> Add images
        <input type="file" multiple accept="image/*" onChange={handleChange} />
      </label>
    </>
  );
}

export { ImagePicker };
