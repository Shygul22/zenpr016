import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Send, User, Loader2, Reply, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  reply_to_id: string | null;
  is_admin_reply: boolean;
  profiles: {
    name: string;
  };
}

export const CourseChat = ({ courseId }: { courseId: string }) => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["course-messages", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_messages")
        .select(`
          *,
          profiles:user_id (name)
        `)
        .eq("course_id", courseId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as unknown as Message[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`chat-${courseId}-${Math.random().toString(36).substring(2, 9)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "course_messages",
          filter: `course_id=eq.${courseId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["course-messages", courseId] });
        }
      );
    
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courseId, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("course_messages").insert({
        course_id: courseId,
        user_id: user!.id,
        content: content.trim(),
        reply_to_id: replyingTo?.id || null,
        is_admin_reply: isAdmin,
      });
      if (error) throw error;
    },

    onSuccess: () => {
      setNewMessage("");
      setReplyingTo(null);
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sendMutation.isPending) return;
    sendMutation.mutate(newMessage);
  };

  return (
    <div className="flex flex-col h-full bg-background border-l">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {messages?.map((msg) => {
              const isOwn = msg.user_id === user?.id;
              const parentMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;
              
              return (
                <div 
                  key={msg.id} 
                  className={cn(
                    "group flex flex-col max-w-[85%] space-y-1 relative",
                    isOwn ? "ml-auto items-end" : "items-start"
                  )}
                >
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                      {isOwn ? "You" : msg.profiles?.name || "Student"}
                    </span>
                    <span className="text-[10px] text-muted-foreground opacity-50">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: false })}
                    </span>
                  </div>

                  {/* Parent Message Preview (if reply) */}
                  {parentMsg && (
                    <div className={cn(
                      "px-2 py-1 mb-1 rounded-lg border bg-muted/30 text-[11px] text-muted-foreground border-l-4 border-l-primary/30 max-w-full truncate",
                      isOwn ? "text-right mr-1" : "text-left ml-1"
                    )}>
                      <span className="font-bold mr-1">{parentMsg.profiles?.name || "Student"}:</span>
                      {parentMsg.content}
                    </div>
                  )}

                  <div className="relative group">
                    <div 
                      className={cn(
                        "px-3 py-2 rounded-2xl text-sm shadow-sm",
                        isOwn 
                          ? (msg.is_admin_reply ? "bg-indigo-600 text-white rounded-tr-none" : "bg-primary text-primary-foreground rounded-tr-none")
                          : (msg.is_admin_reply ? "bg-indigo-50 text-indigo-900 rounded-tl-none border border-indigo-100" : "bg-muted text-foreground rounded-tl-none border")
                      )}
                    >
                      {msg.is_admin_reply && (
                        <span className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase mb-1",
                          isOwn ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"
                        )}>
                          Instructor
                        </span>
                      )}
                      <div className={msg.is_admin_reply ? "mt-0.5" : ""}>
                        {msg.content}
                      </div>
                    </div>
                    
                    {/* Admin Reply Button */}
                    {isAdmin && !isOwn && (
                      <button 
                        onClick={() => setReplyingTo(msg)}
                        className="absolute -right-8 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Reply as Admin"
                      >
                        <Reply className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {messages?.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <User className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No messages yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Start the conversation with your fellow students!</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t bg-card/50 backdrop-blur-sm relative">
        {/* Reply Preview Box */}
        {replyingTo && (
          <div className="absolute bottom-full left-0 right-0 p-2 bg-muted/80 backdrop-blur-md border-t flex items-center justify-between animate-in slide-in-from-bottom-2">
            <div className="flex flex-col text-xs overflow-hidden">
              <span className="font-bold text-[10px] uppercase text-primary">Replying to {replyingTo.profiles?.name}</span>
              <span className="truncate text-muted-foreground italic px-1 ">{replyingTo.content}</span>
            </div>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6 rounded-full" 
              onClick={() => setReplyingTo(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-center gap-2">
          <Input 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={replyingTo ? "Type your reply..." : "Type your message..."}
            className="flex-1 bg-background border-muted h-10 ring-offset-background"
            disabled={sendMutation.isPending}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!newMessage.trim() || sendMutation.isPending}
            className="h-10 w-10 shrink-0"
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

