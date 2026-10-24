"use client";

import { useState } from "react";

function count(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function ArticleEditor({
  title,
  body,
  min,
  max,
  readOnly,
}: {
  title: string;
  body: string;
  min: number;
  max: number;
  readOnly: boolean;
}) {
  const [text, setText] = useState(body);
  const words = count(text);
  const state = words < min ? `${min - words} to go` : words > max ? `${words - max} over` : "within range";
  return (
    <>
      <div>
        <label className="lbl" htmlFor="article-title">Title</label>
        <input id="article-title" name="title" defaultValue={title} readOnly={readOnly} maxLength={200} />
      </div>
      <div>
        <label className="lbl" htmlFor="article-body">Text</label>
        <textarea
          id="article-body"
          name="body"
          value={text}
          onChange={(event) => setText(event.target.value)}
          readOnly={readOnly}
          rows={22}
          style={{ minHeight: 360 }}
        />
        <p className="help" id="word-count" aria-live="polite">
          {words} words · target {min}–{max} · {state}
        </p>
      </div>
    </>
  );
}
