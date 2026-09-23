import type { RefObject } from "react";
import type React from "react";
import type { Nullable } from "../types/lib.types";

interface ModalProps extends React.DialogHTMLAttributes<HTMLDialogElement> {
  ref?: RefObject<Nullable<HTMLDialogElement>>;
  title: string;
}

function Modal({ title, className, children, ...props }: ModalProps) {
  return (
    <>
      <dialog {...props}>
        <div className="dialog-modal-container">
          <div className={className + " " + "dialog-modal-card"}>
            <h3>{title}</h3>
            {children}
          </div>
        </div>
      </dialog>
    </>
  );
}

export { Modal };
