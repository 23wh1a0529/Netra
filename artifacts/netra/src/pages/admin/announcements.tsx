import React, { useState } from "react";
import { useListAnnouncements, useCreateAnnouncement } from "@workspace/api-client-react";
import { Megaphone, Send } from "lucide-react";
import { toast } from "react-hot-toast";

export function AnnouncementsPage() {
  const { data: announcements = [], isLoading, refetch } = useListAnnouncements();
  const createAnn = useCreateAnnouncement();
  const [msg, setMsg] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim()) return;
    createAnn.mutate({ data: { message: msg, createdBy: "Admin" } }, {
      onSuccess: () => {
        toast.success("Broadcast sent to all officers");
        setMsg("");
        refetch();
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <Megaphone className="w-8 h-8 text-primary" /> Global Broadcasts
      </h1>

      <div className="bg-card rounded-2xl p-6 border border-border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none" />
        <h2 className="font-bold text-lg mb-4">Send New Broadcast</h2>
        <form onSubmit={handleSend} className="space-y-4 relative z-10">
          <textarea
            value={msg}
            onChange={e => setMsg(e.target.value)}
            placeholder="Type urgent message to all deployed officers..."
            className="w-full h-32 p-4 bg-background border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl outline-none resize-none font-medium"
            maxLength={200}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground">{msg.length}/200 chars</span>
            <button 
              type="submit"
              disabled={createAnn.isPending || !msg.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> Send Now
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-muted-foreground uppercase text-xs tracking-wider ml-2">Recent Broadcasts</h3>
        {isLoading ? (
          <div className="h-20 bg-card rounded-xl animate-pulse" />
        ) : announcements.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No recent announcements.</p>
        ) : (
          announcements.map(a => (
            <div key={a.id} className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-start gap-4">
              <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0 mt-1">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">{a.message}</p>
                <p className="text-xs text-muted-foreground font-mono">{new Date(a.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
