import React from "react";
import {
  iconButtonStyle,
  modalBackdropStyle,
  modalCardStyle,
  modalHeaderStyle,
  mutedTextStyle,
} from "../styles";
import { CloseIcon } from "./icons";

export function ModalShell({
  title,
  description,
  onClose,
  children,
}: React.PropsWithChildren<{
  title: string;
  description: string;
  onClose: () => void;
}>) {
  return (
    <div style={modalBackdropStyle} onClick={onClose}>
      <section style={modalCardStyle} onClick={(event) => event.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{title}</div>
            <div style={{ ...mutedTextStyle, marginTop: 6 }}>{description}</div>
          </div>
          <button type="button" onClick={onClose} style={iconButtonStyle}>
            <CloseIcon />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
