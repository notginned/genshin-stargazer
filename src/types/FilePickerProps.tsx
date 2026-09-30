import type { Dispatch, SetStateAction } from "react";
import type { Images } from "./State.type";

export interface FilePickerProps {
  images: Images;
  setImages: Dispatch<SetStateAction<Images>>;
}
