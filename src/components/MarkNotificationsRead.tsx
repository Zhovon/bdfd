"use client";

import { useEffect } from "react";
import { markNotificationsRead } from "@/app/portal/actions";

/** Marks all notifications read when the notifications page opens, then clears the bell badge. */
export default function MarkNotificationsRead({ hasUnread }: { hasUnread: boolean }) {
  useEffect(() => {
    if (hasUnread) markNotificationsRead();
  }, [hasUnread]);
  return null;
}
