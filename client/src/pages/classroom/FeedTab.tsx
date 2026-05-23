import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, Send, Megaphone } from "lucide-react";
import type { PostWithAuthor } from "./types";

const MAX_CHARS = 1000;

function AuthorAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  // Stable color derived from name
  const colors = [
    "bg-violet-100 text-violet-700",
    "bg-sky-100 text-sky-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-pink-100 text-pink-700",
    "bg-teal-100 text-teal-700",
  ];
  const idx = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${colors[idx]}`}>
      {initials}
    </div>
  );
}

function formatPostTime(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function FeedTab({
  classroomId,
  isTeacher,
  isArchived,
  seenPostIds,
  onPostSeen,
}: {
  classroomId: number;
  isTeacher: boolean;
  isArchived: boolean;
  seenPostIds?: Set<number>;
  onPostSeen?: (postId: number) => void;
}) {
  const [content, setContent] = useState("");
  const charsLeft = MAX_CHARS - content.length;
  const isOverLimit = charsLeft < 0;

  const { data: posts = [], isLoading } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/classrooms", classroomId, "posts"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/posts`),
    refetchInterval: 30000,
  });

  const postMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/classrooms/${classroomId}/posts`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "posts"] });
      toast({ title: "Posted", type: "success" });
    },
    onError: () => toast({ title: "Couldn't post the announcement — try again.", type: "error" }),
  });

  const unseenCount = !isTeacher && seenPostIds
    ? posts.filter((p) => !seenPostIds.has(p.id)).length
    : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Compose box — teacher only, at top */}
      {isTeacher && !isArchived && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-end gap-3 p-3">
            <span className="mb-0.5 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Megaphone className="h-4 w-4 text-primary" />
            </span>
            <textarea
              placeholder="Post an announcement to the class…"
              value={content}
              onChange={(e) => {
                setContent(e.target.value.slice(0, MAX_CHARS + 20));
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              rows={1}
              style={{ height: "36px" }}
              className="flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm focus:outline-none placeholder:text-muted-foreground leading-relaxed overflow-hidden"
            />
            <div className="flex items-end gap-2 shrink-0 mb-0.5">
              {charsLeft < 200 && (
                <span className={`text-xs tabular-nums ${isOverLimit ? "text-red-500 font-semibold" : charsLeft < 100 ? "text-amber-500" : "text-muted-foreground"}`}>
                  {charsLeft}
                </span>
              )}
              <Button
                size="sm"
                disabled={!content.trim() || isOverLimit || postMutation.isPending}
                onClick={() => postMutation.mutate()}
                className="gap-1.5 h-9 px-4 rounded-xl"
              >
                {postMutation.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Send className="h-3.5 w-3.5" />}
                Post
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Unread banner — student only */}
      {unseenCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/8 border border-primary/20">
          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
          <p className="text-xs font-medium text-primary">
            {unseenCount} new {unseenCount === 1 ? "announcement" : "announcements"} — tap to mark as read
          </p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && posts.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
          <span className="text-3xl">📢</span>
          <div>
            <p className="text-sm font-medium text-foreground">No announcements yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isTeacher ? "Post your first announcement above." : "Your teacher hasn't posted anything yet."}
            </p>
          </div>
        </div>
      )}

      {/* Posts */}
      {!isLoading && posts.length > 0 && (
        <div className="space-y-3">
          {posts.map((post) => {
            const isUnseen = !isTeacher && seenPostIds && !seenPostIds.has(post.id);
            return (
              <div
                key={post.id}
                onClick={() => { if (isUnseen && onPostSeen) onPostSeen(post.id); }}
                className={`rounded-2xl border bg-card p-4 transition-all duration-150 ${
                  isUnseen
                    ? "border-primary/40 bg-primary/5 cursor-pointer hover:bg-primary/8 shadow-sm"
                    : "border-border"
                }`}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <AuthorAvatar name={post.authorName} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-none">{post.authorName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatPostTime(post.createdAt)}</p>
                  </div>
                  {isUnseen && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  )}
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed pl-[2.625rem]">
                  {post.content}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}