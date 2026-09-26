import cvReadyPromise, { type CV } from "@techstark/opencv-js";

export async function getOpenCv() {
  return cvReadyPromise;
}

export function translateException(cv: CV, err: unknown) {
  if (typeof err === "number") {
    try {
      const exception = cv.exceptionFromPtr(err);
      return exception;
    } catch (error) {
        return error;
    }
  }
  return err;
}
