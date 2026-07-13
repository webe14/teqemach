"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, X, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getNotifications,
  getUnreadNotificationCount,
  approveContributor,
  rejectContributor,
  markNotificationRead,
} from "@/lib/actions/notifications";

type NotificationData = {
  contributor_id?: string;
  contributor_name?: string;
  contributor_email?: string;
  group_id?: string;
  group_name?: string;
  collector_id?: string;
};

type Notification = {
  id: string;
  user_id: string;
  type: "contributor_request" | "approved" | "rejected";
  title: string;
  message: string;
  data: NotificationData;
  is_read: boolean;
  created_at: string;
};

interface NotificationBellProps {
  userId: string;
  isMobile?: boolean;
}

export function NotificationBell({ userId, isMobile }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function loadUnreadCount() {
    const count = await getUnreadNotificationCount(userId);
    setUnreadCount(count);
  }

  async function loadNotifications() {
    const res = await getNotifications(userId);
    if (res.data) {
      setNotifications(res.data as Notification[]);
    }
  }

  async function handleOpen() {
    setOpen(!open);
    if (!open) {
      await loadNotifications();
    }
  }

  async function handleApprove(notification: Notification) {
    const contributorId = notification.data?.contributor_id;
    if (!contributorId) return;
    setActionLoading(notification.id);
    await approveContributor(contributorId, notification.id);
    await loadNotifications();
    await loadUnreadCount();
    setActionLoading(null);
  }

  async function handleReject(notification: Notification) {
    const contributorId = notification.data?.contributor_id;
    if (!contributorId) return;
    setActionLoading(notification.id);
    await rejectContributor(contributorId, notification.id);
    await loadNotifications();
    await loadUnreadCount();
    setActionLoading(null);
  }

  async function handleMarkRead(notificationId: string) {
    await markNotificationRead(notificationId);
    await loadNotifications();
    await loadUnreadCount();
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleOpen}
        className={`relative h-9 w-9 rounded-lg ${
          isMobile
            ? "text-white hover:bg-white/10"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 max-h-96 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl">
          <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 transition-colors ${
                    n.is_read ? "bg-card" : "bg-primary/5"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      n.type === "contributor_request"
                        ? "bg-blue-500/10"
                        : n.type === "approved"
                        ? "bg-emerald-500/10"
                        : "bg-destructive/10"
                    }`}>
                      <UserPlus className={`h-4 w-4 ${
                        n.type === "contributor_request"
                          ? "text-blue-500"
                          : n.type === "approved"
                          ? "text-emerald-500"
                          : "text-destructive"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>

                      {/* Action buttons for contributor requests */}
                      {n.type === "contributor_request" && !n.is_read && (
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => handleApprove(n)}
                            disabled={actionLoading === n.id}
                          >
                            <Check className="h-3 w-3" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10 border-destructive/30"
                            onClick={() => handleReject(n)}
                            disabled={actionLoading === n.id}
                          >
                            <X className="h-3 w-3" />
                            Reject
                          </Button>
                        </div>
                      )}

                      {/* Mark as read for non-actionable notifications */}
                      {!n.is_read && n.type !== "contributor_request" && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="text-[10px] text-primary hover:underline mt-1"
                        >
                          Mark as read
                        </button>
                      )}

                      {n.is_read && n.type === "contributor_request" && (
                        <p className="text-[10px] text-emerald-500 font-medium mt-1">Resolved</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
