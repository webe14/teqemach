"use client";

import { useState } from "react";
import { Send, Users, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { broadcastToTelegram } from "@/lib/actions/broadcast";

export default function BroadcastPage() {
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState("all");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; successCount: number; failCount: number } | null>(null);
  const [error, setError] = useState("");

  async function handleSend() {
    if (!message.trim()) {
      setError("Please enter a message to broadcast.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await broadcastToTelegram(message, targetRole === "all" ? ["all"] : [targetRole]);
      setResult({ success: true, successCount: res.successCount, failCount: res.failCount });
      setMessage("");
    } catch (err: any) {
      setError(err.message || "Failed to send broadcast.");
    }

    setLoading(false);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Telegram Broadcast</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Send important announcements to all users with linked Telegram accounts.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
        
        {/* Target Audience */}
        <div className="space-y-2">
          <label className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" /> Target Audience
          </label>
          <Select value={targetRole} onValueChange={setTargetRole}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select audience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Linked Users</SelectItem>
              <SelectItem value="collector">Collectors Only</SelectItem>
              <SelectItem value="contributor">Contributors Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Message Content */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">Message</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your announcement here..."
            className="min-h-[150px] resize-y"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button onClick={handleSend} disabled={loading || !message.trim()} className="w-full sm:w-auto">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            {loading ? "Sending..." : "Send Broadcast"}
          </Button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg flex items-start gap-3">
            <CheckCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Broadcast Sent Successfully</p>
              <p className="text-sm mt-1">Delivered to {result.successCount} users.</p>
              {result.failCount > 0 && (
                <p className="text-sm text-amber-600 mt-1">Failed to deliver to {result.failCount} users.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
