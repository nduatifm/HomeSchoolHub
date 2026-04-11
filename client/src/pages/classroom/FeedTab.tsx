import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";
import type { PostWithAuthor } from "./types";

export default function FeedTab({ classroomId, isTeacher, isArchived, seenPostIds, onPostSeen }: {
  classroomId: number;
  isTeacher: boolean;
  isArchived: boolean;
  seenPostIds?: Set<number>;
  onPostSeen?: (postId: number) => void;
}) {
  const [content, setContent] = useState("");
  const { data: posts = [], isLoading } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/classrooms", classroomId, "posts"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/posts`),
  });
  const postMutation = useMutation({
    mutationFn: () => apiRequest(`/api/classrooms/${classroomId}/posts`, { method: "POST", body: JSON.stringify({ content }) }),
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "posts"] });
      toast({ title: "Posted", type: "success" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  return (
    <div className="space-y-4">
      {isTeacher && !isArchived && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <Textarea
            placeholder="Post an announcement to the class…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0 shadow-none"
            rows={3}
          />
          <div className="flex justify-end pt-2 border-t border-border mt-2">
            <Button
              size="sm"
              disabled={!content.trim() || postMutation.isPending}
              onClick={() => postMutation.mutate()}
              className="gap-1.5"
            >
              {postMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Post
            </Button>
          </div>
        </div>
      )}

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
      {!isLoading && posts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm rounded-2xl border border-dashed border-border">No announcements yet.</div>
      )}

      <div className="space-y-3">
        {posts.map((post) => {
          const isUnseen = !isTeacher && seenPostIds && !seenPostIds.has(post.id);
          return (
            <div
              key={post.id}
              onClick={() => { if (isUnseen && onPostSeen) onPostSeen(post.id); }}
              className={`rounded-2xl border bg-card p-4 transition-colors ${isUnseen ? "border-primary/30 bg-primary/5 cursor-pointer hover:bg-primary/10" : "border-border"}`}
            >
              {isUnseen && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mb-2" />
              )}
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{post.content}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {post.authorName} · {new Date(post.createdAt).toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
