"use client";

import Link from "next/link";
import { useState } from "react";
import { markNotificationsRead } from "@/lib/actions";

export type BellItem = {
  id: string;
  title: string;
  href: string;
  when: string;
};

export function NotificationBell({ unread, items }: { unread: number; items: BellItem[] }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(unread);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && count > 0) {
      setCount(0);
      void markNotificationsRead();
    }
  }

  return (
    <div className={`bell${open ? " open" : ""}`}>
      <button
        type="button"
        className="bell-btn"
        aria-expanded={open}
        aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
        onClick={toggle}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {count > 0 ? <span className="bell-count">{count > 9 ? "9+" : count}</span> : null}
      </button>
      {open ? (
        <div className="bell-panel">
          {items.length === 0 ? <p className="bell-empty">No notifications yet.</p> : null}
          {items.map((item) => (
            <Link key={item.id} href={item.href} className="bell-item" onClick={() => setOpen(false)}>
              <span className="bell-title">{item.title}</span>
              <span className="by">{item.when}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
