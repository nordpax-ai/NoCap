"use client";

import { useState } from "react";
import { ActionForm } from "./action-form";
import { SubmitButton } from "./submit-button";

export function DeleteControl({
  action,
  label,
  confirm,
  hidden,
  buttonId,
}: {
  action: (formData: FormData) => void | Promise<void>;
  label: string;
  confirm: string;
  hidden: Record<string, string>;
  buttonId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="delete-control">
      <button id={buttonId} className="act" type="button" onClick={() => setOpen(true)}>
        {label}
      </button>
      {open ? (
        <div className="confirm-back">
          <div className="confirm-box" role="dialog" aria-modal="true" aria-labelledby="confirm-q">
            <p id="confirm-q" className="confirm-q">{confirm}</p>
            <ActionForm action={action} className="confirm-actions">
              {Object.entries(hidden).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))}
              <SubmitButton className="btn solid">Delete</SubmitButton>
              <button className="btn" type="button" onClick={() => setOpen(false)}>Cancel</button>
            </ActionForm>
          </div>
        </div>
      ) : null}
    </div>
  );
}
