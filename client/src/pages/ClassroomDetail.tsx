import React, { useState, useRef, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useQueries, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { classifyAssignment } from "@/lib/classroomNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  BookOpen,
  Users,
  LibraryBig,
  BarChart2,
  Megaphone,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Archive,
  ArchiveRestore,
  Send,
  Pencil,
  Link2,
  FileUp,
  Paperclip,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import ModernSidebar from "@/components/ModernSidebar";
import type {
  Classroom,
  ClassroomPost,
  ClassroomAssignment,
  ClassroomSubmission,
  ClassroomMaterial,
  ClassroomEnrollment,
  Student,
} from "@shared/schema";

type PostWithAuthor = ClassroomPost & { authorName: string };
type SubmissionWithName = ClassroomSubmission & { studentName: string };
type EnrollmentWithStudent = ClassroomEnrollment & { student: { id: number; name: string; userId: number } };

// ── Subject theme (mirrors StudentDashboard illustrated banners) ──────────────
type SubjectTheme = {
  bg: string;
  bannerBg: string;
  accent: string;
  accentText: string;
  pill: string;
  banner: React.ReactNode;
};

function getSubjectTheme(subject: string): SubjectTheme {
  const s = (subject || "").toLowerCase();

  if (/math|algebra|geometry|calculus|arithmetic|number/.test(s)) return {
    bg: "bg-violet-50",
    bannerBg: "bg-violet-100",
    accent: "border-l-violet-400",
    accentText: "text-violet-700",
    pill: "bg-violet-100 text-violet-700",
    banner: (
      <svg viewBox="0 0 640 120" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="640" height="120" fill="#ede9fe"/>
        <text x="40" y="88" fontSize="72" fill="#c4b5fd" fontFamily="serif" opacity="0.6">∑</text>
        <text x="140" y="75" fontSize="54" fill="#a78bfa" fontFamily="serif" opacity="0.55">π</text>
        <text x="230" y="90" fontSize="42" fill="#c4b5fd" fontFamily="monospace" opacity="0.6">x²</text>
        <text x="318" y="72" fontSize="56" fill="#a78bfa" fontFamily="serif" opacity="0.45">∫</text>
        <text x="400" y="88" fontSize="40" fill="#c4b5fd" fontFamily="monospace" opacity="0.55">÷</text>
        <text x="468" y="68" fontSize="48" fill="#a78bfa" fontFamily="monospace" opacity="0.4">√</text>
        <text x="554" y="84" fontSize="38" fill="#c4b5fd" fontFamily="serif" opacity="0.5">θ</text>
        <circle cx="520" cy="20" r="7" fill="#ddd6fe" opacity="0.5"/>
        <circle cx="200" cy="18" r="5" fill="#c4b5fd" opacity="0.45"/>
        <circle cx="610" cy="95" r="8" fill="#ddd6fe" opacity="0.4"/>
      </svg>
    ),
  };

  if (/science|biology|chemistry|physics|lab|nature|earth/.test(s)) return {
    bg: "bg-emerald-50",
    bannerBg: "bg-emerald-100",
    accent: "border-l-emerald-400",
    accentText: "text-emerald-700",
    pill: "bg-emerald-100 text-emerald-700",
    banner: (
      <svg viewBox="0 0 640 120" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="640" height="120" fill="#ecfdf5"/>
        <path d="M70 20 L70 68 L46 104 L94 104 Z" fill="none" stroke="#6ee7b7" strokeWidth="3.5" strokeLinejoin="round"/>
        <path d="M58 80 L82 80 L94 104 L46 104 Z" fill="#a7f3d0" opacity="0.7"/>
        <line x1="62" y1="20" x2="78" y2="20" stroke="#6ee7b7" strokeWidth="3"/>
        <path d="M190 12 Q216 38 190 64 Q164 90 190 116" fill="none" stroke="#6ee7b7" strokeWidth="3" opacity="0.65"/>
        <path d="M220 12 Q194 38 220 64 Q246 90 220 116" fill="none" stroke="#a7f3d0" strokeWidth="3" opacity="0.55"/>
        <line x1="190" y1="38" x2="220" y2="38" stroke="#34d399" strokeWidth="2" opacity="0.45"/>
        <line x1="190" y1="64" x2="220" y2="64" stroke="#34d399" strokeWidth="2" opacity="0.45"/>
        <circle cx="380" cy="60" r="8" fill="#6ee7b7"/>
        <ellipse cx="380" cy="60" rx="36" ry="14" fill="none" stroke="#a7f3d0" strokeWidth="2.5" opacity="0.65"/>
        <ellipse cx="380" cy="60" rx="36" ry="14" fill="none" stroke="#6ee7b7" strokeWidth="2.5" opacity="0.55" transform="rotate(60 380 60)"/>
        <ellipse cx="380" cy="60" rx="36" ry="14" fill="none" stroke="#a7f3d0" strokeWidth="2.5" opacity="0.45" transform="rotate(120 380 60)"/>
        <circle cx="540" cy="30" r="4" fill="#d1fae5" opacity="0.7"/>
        <circle cx="580" cy="88" r="6" fill="#a7f3d0" opacity="0.5"/>
        <circle cx="490" cy="96" r="5" fill="#6ee7b7" opacity="0.4"/>
      </svg>
    ),
  };

  if (/art|draw|paint|music|creative|design|craft/.test(s)) return {
    bg: "bg-pink-50",
    bannerBg: "bg-pink-100",
    accent: "border-l-pink-400",
    accentText: "text-pink-700",
    pill: "bg-pink-100 text-pink-700",
    banner: (
      <svg viewBox="0 0 640 120" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="640" height="120" fill="#fdf2f8"/>
        <ellipse cx="90" cy="64" rx="44" ry="34" fill="#fbcfe8" opacity="0.8"/>
        <circle cx="66" cy="46" r="9" fill="#f9a8d4"/>
        <circle cx="92" cy="36" r="9" fill="#c4b5fd"/>
        <circle cx="118" cy="46" r="9" fill="#6ee7b7"/>
        <circle cx="122" cy="72" r="9" fill="#fde68a"/>
        <circle cx="78" cy="84" r="7" fill="#fff" opacity="0.9"/>
        <line x1="132" y1="92" x2="200" y2="28" stroke="#f9a8d4" strokeWidth="5" strokeLinecap="round"/>
        <ellipse cx="202" cy="26" rx="6" ry="10" fill="#f472b6" transform="rotate(-45 202 26)"/>
        <text x="240" y="60" fontSize="36" fill="#f9a8d4" opacity="0.65">✦</text>
        <text x="310" y="88" fontSize="26" fill="#c4b5fd" opacity="0.55">✦</text>
        <text x="370" y="46" fontSize="20" fill="#fbcfe8" opacity="0.75">✦</text>
        <rect x="430" y="44" width="22" height="22" rx="4" fill="#f9a8d4" opacity="0.65"/>
        <rect x="460" y="44" width="22" height="22" rx="4" fill="#c4b5fd" opacity="0.65"/>
        <rect x="490" y="44" width="22" height="22" rx="4" fill="#6ee7b7" opacity="0.65"/>
        <rect x="430" y="72" width="22" height="22" rx="4" fill="#fde68a" opacity="0.65"/>
        <rect x="460" y="72" width="22" height="22" rx="4" fill="#f9a8d4" opacity="0.55"/>
        <rect x="490" y="72" width="22" height="22" rx="4" fill="#c4b5fd" opacity="0.55"/>
      </svg>
    ),
  };

  if (/history|social|civics|geography|world|culture/.test(s)) return {
    bg: "bg-amber-50",
    bannerBg: "bg-amber-100",
    accent: "border-l-amber-400",
    accentText: "text-amber-700",
    pill: "bg-amber-100 text-amber-700",
    banner: (
      <svg viewBox="0 0 640 120" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="640" height="120" fill="#fffbeb"/>
        <circle cx="80" cy="60" r="42" fill="none" stroke="#fcd34d" strokeWidth="3"/>
        <ellipse cx="80" cy="60" rx="20" ry="42" fill="none" stroke="#fde68a" strokeWidth="2.5" opacity="0.8"/>
        <line x1="38" y1="60" x2="122" y2="60" stroke="#fcd34d" strokeWidth="2" opacity="0.65"/>
        <line x1="44" y1="38" x2="116" y2="38" stroke="#fde68a" strokeWidth="2" opacity="0.55"/>
        <line x1="44" y1="82" x2="116" y2="82" stroke="#fde68a" strokeWidth="2" opacity="0.55"/>
        <rect x="175" y="30" width="80" height="60" rx="5" fill="#fde68a" opacity="0.7"/>
        <rect x="167" y="30" width="12" height="60" rx="5" fill="#fcd34d" opacity="0.8"/>
        <rect x="255" y="30" width="12" height="60" rx="5" fill="#fcd34d" opacity="0.8"/>
        <line x1="188" y1="50" x2="244" y2="50" stroke="#f59e0b" strokeWidth="2" opacity="0.55"/>
        <line x1="188" y1="64" x2="244" y2="64" stroke="#f59e0b" strokeWidth="2" opacity="0.55"/>
        <line x1="188" y1="78" x2="232" y2="78" stroke="#f59e0b" strokeWidth="2" opacity="0.45"/>
        <text x="310" y="56" fontSize="38" fill="#fcd34d" opacity="0.65">★</text>
        <text x="376" y="82" fontSize="28" fill="#fde68a" opacity="0.55">★</text>
        <text x="430" y="46" fontSize="22" fill="#fcd34d" opacity="0.5">★</text>
        <text x="490" y="70" fontSize="32" fill="#fde68a" opacity="0.45">★</text>
      </svg>
    ),
  };

  if (/english|writing|reading|language|lit|grammar|spelling|phonics/.test(s)) return {
    bg: "bg-sky-50",
    bannerBg: "bg-sky-100",
    accent: "border-l-sky-400",
    accentText: "text-sky-700",
    pill: "bg-sky-100 text-sky-700",
    banner: (
      <svg viewBox="0 0 640 120" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="640" height="120" fill="#f0f9ff"/>
        <path d="M40 96 L40 28 Q72 20 90 38 L90 96 Q72 82 40 96Z" fill="#bae6fd" opacity="0.8"/>
        <path d="M90 38 Q108 20 140 28 L140 96 Q108 82 90 96 L90 38Z" fill="#7dd3fc" opacity="0.7"/>
        <line x1="90" y1="38" x2="90" y2="96" stroke="#38bdf8" strokeWidth="2"/>
        <line x1="54" y1="52" x2="82" y2="48" stroke="#38bdf8" strokeWidth="2" opacity="0.45"/>
        <line x1="54" y1="64" x2="82" y2="61" stroke="#38bdf8" strokeWidth="2" opacity="0.45"/>
        <line x1="54" y1="76" x2="82" y2="74" stroke="#38bdf8" strokeWidth="2" opacity="0.35"/>
        <line x1="98" y1="48" x2="126" y2="52" stroke="#0ea5e9" strokeWidth="2" opacity="0.45"/>
        <line x1="98" y1="61" x2="126" y2="64" stroke="#0ea5e9" strokeWidth="2" opacity="0.45"/>
        <line x1="98" y1="74" x2="122" y2="76" stroke="#0ea5e9" strokeWidth="2" opacity="0.35"/>
        <text x="180" y="80" fontSize="58" fill="#7dd3fc" fontFamily="Georgia, serif" opacity="0.65">Aa</text>
        <text x="320" y="60" fontSize="38" fill="#bae6fd" fontFamily="Georgia, serif" opacity="0.55">Bb</text>
        <text x="406" y="88" fontSize="32" fill="#7dd3fc" fontFamily="Georgia, serif" opacity="0.5">Cc</text>
        <text x="482" y="52" fontSize="26" fill="#bae6fd" fontFamily="Georgia, serif" opacity="0.45">Dd</text>
        <text x="554" y="80" fontSize="22" fill="#7dd3fc" fontFamily="Georgia, serif" opacity="0.4">Ee</text>
      </svg>
    ),
  };

  return {
    bg: "bg-slate-50",
    bannerBg: "bg-slate-100",
    accent: "border-l-slate-300",
    accentText: "text-slate-600",
    pill: "bg-slate-100 text-slate-600",
    banner: (
      <svg viewBox="0 0 640 120" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="640" height="120" fill="#f8fafc"/>
        <circle cx="100" cy="60" r="40" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeDasharray="7 5"/>
        <circle cx="260" cy="60" r="32" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2.5"/>
        <circle cx="400" cy="60" r="26" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="5 4"/>
        <circle cx="520" cy="60" r="20" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2"/>
        <text x="248" y="66" fontSize="22" fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">✦</text>
      </svg>
    ),
  };
}

// ── Tab nav pill ──────────────────────────────────────────────────────────────
function TabNav({
  tabs,
  active,
  onChange,
}: {
  tabs: { value: string; label: string; icon: React.ReactNode; badge?: number }[];
  active: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 flex-wrap mb-6 bg-muted/40 p-1 rounded-xl w-fit">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap ${
            active === t.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/60"
          }`}
        >
          {t.icon}
          {t.label}
          {!!t.badge && t.badge > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white bg-red-500 flex items-center justify-center leading-none">
              {t.badge > 9 ? "9+" : t.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-gray-100 text-gray-600",
    submitted: "bg-blue-100 text-blue-700",
    late: "bg-amber-100 text-amber-700",
    graded: "bg-green-100 text-green-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

// ── Feed tab ──────────────────────────────────────────────────────────────────
function FeedTab({ classroomId, isTeacher, isArchived }: { classroomId: number; isTeacher: boolean; isArchived: boolean }) {
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
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
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
        {posts.map((post) => (
          <div key={post.id} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{post.content}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {post.authorName} · {new Date(post.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Submission grading modal (isolated so typing doesn't re-render parent) ────
function GradingModal({
  sub,
  assignment,
  classroomId,
  expandedAssignmentId,
  onClose,
}: {
  sub: SubmissionWithName | null;
  assignment: ClassroomAssignment | null;
  classroomId: number;
  expandedAssignmentId: number | null;
  onClose: () => void;
}) {
  const [gradeVal, setGradeVal] = useState("");
  const [feedbackVal, setFeedbackVal] = useState("");

  // Sync grade/feedback when the selected submission changes
  React.useEffect(() => {
    if (sub) {
      setGradeVal(sub.grade !== null && sub.grade !== undefined ? String(sub.grade) : "");
      setFeedbackVal(sub.feedback ?? "");
    }
  }, [sub?.id]);

  const gradeMutation = useMutation({
    mutationFn: ({ submissionId }: { submissionId: number }) =>
      apiRequest(`/api/classrooms/${classroomId}/submissions/${submissionId}/grade`, {
        method: "PATCH",
        body: JSON.stringify({ grade: parseInt(gradeVal), feedback: feedbackVal || null }),
      }),
    onSuccess: () => {
      if (expandedAssignmentId) queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "assignments", expandedAssignmentId, "submissions"] });
      toast({ title: "Graded", type: "success" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  return (
    <Dialog open={!!sub} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{assignment?.title ?? "Submission"}</DialogTitle>
          {sub && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {sub.studentName} · <StatusBadge status={sub.status} />
              {sub.grade !== null && sub.grade !== undefined && (
                <span className="ml-2 text-xs font-semibold text-green-700">
                  {sub.grade}/{assignment?.points} pts
                </span>
              )}
            </p>
          )}
        </DialogHeader>

        {sub && (
          <div className="space-y-4 pt-1">
            <div className="flex gap-4 text-xs text-muted-foreground">
              {assignment?.dueDate && <span>Due: {assignment.dueDate}</span>}
              {assignment?.points && <span>{assignment.points} points</span>}
            </div>

            {sub.content ? (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Student Answer</p>
                <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                  {sub.content}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No text answer submitted.</p>
            )}

            {sub.fileUrl && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Submitted File</p>
                <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
                  <Paperclip className="h-4 w-4" />View submission file<ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            {sub.feedback && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Previous Feedback</p>
                <p className="text-sm text-muted-foreground italic">"{sub.feedback}"</p>
              </div>
            )}

            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {sub.status === "graded" ? "Update Grade" : "Grade Submission"}
              </p>
              <div className="flex gap-3 items-start">
                <div className="w-28 shrink-0">
                  <Label className="text-xs">Score (0–{assignment?.points ?? 100})</Label>
                  <Input
                    type="number"
                    min={0}
                    max={assignment?.points ?? 100}
                    placeholder={`0–${assignment?.points ?? 100}`}
                    value={gradeVal}
                    onChange={(e) => setGradeVal(e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Feedback <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Textarea
                    placeholder="Leave feedback for the student…"
                    value={feedbackVal}
                    onChange={(e) => setFeedbackVal(e.target.value)}
                    rows={3}
                    className="mt-1 text-sm resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
                <Button
                  size="sm"
                  disabled={gradeVal === "" || gradeMutation.isPending}
                  onClick={() => gradeMutation.mutate({ submissionId: sub.id })}
                >
                  {gradeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  Save Grade
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Teacher Assignments tab ───────────────────────────────────────────────────
function TeacherAssignmentsTab({ classroomId, classroomSlug, isArchived }: { classroomId: number; classroomSlug: string | number; isArchived: boolean }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [modalSub, setModalSub] = useState<SubmissionWithName | null>(null);
  const [modalAssignment, setModalAssignment] = useState<ClassroomAssignment | null>(null);
  const [form, setForm] = useState({ title: "", description: "", dueDate: "", points: "100" });
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [, navigate] = useLocation();

  const openModal = (sub: SubmissionWithName, assignment: ClassroomAssignment) => {
    setModalSub(sub);
    setModalAssignment(assignment);
  };

  const closeModal = () => {
    setModalSub(null);
    setModalAssignment(null);
  };

  const { data: assignments = [], isLoading } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
  });

  const allSubResults = useQueries({
    queries: assignments.map((a) => ({
      queryKey: ["/api/classrooms", classroomId, "assignments", a.id, "submissions"],
      queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments/${a.id}/submissions`) as Promise<SubmissionWithName[]>,
      enabled: assignments.length > 0,
    })),
  });
  const subCountMap: Record<number, number> = {};
  allSubResults.forEach((q, i) => {
    if (assignments[i]) subCountMap[assignments[i].id] = (q.data ?? []).filter((s) => s.status !== "pending").length;
  });

  const { data: expandedSubs = [], isLoading: loadingSubs } = useQuery<SubmissionWithName[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments", expanded, "submissions"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments/${expanded}/submissions`),
    enabled: expanded !== null,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("dueDate", form.dueDate);
      fd.append("points", form.points);
      if (attachedFile) fd.append("file", attachedFile);
      const token = localStorage.getItem("sessionId");
      return fetch(`/api/classrooms/${classroomId}/assignments/with-file`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      }).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Upload failed");
        return data;
      });
    },
    onSuccess: () => {
      setOpen(false);
      setForm({ title: "", description: "", dueDate: "", points: "100" });
      setAttachedFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "assignments"] });
      toast({ title: "Assignment created", type: "success" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (assignmentId: number) =>
      apiRequest(`/api/classrooms/${classroomId}/assignments/${assignmentId}`, { method: "DELETE" }),
    onSuccess: () => {
      setExpanded(null);
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "assignments"] });
      toast({ title: "Assignment deleted", type: "success" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  return (
    <div className="space-y-4">
      {!isArchived && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />New Assignment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Assignment</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
                  <div><Label>Points</Label><Input type="number" min={1} value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Attachment <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input type="file" accept="image/*,.pdf,.doc,.docx,.txt" className="mt-1 cursor-pointer" onChange={(e) => setAttachedFile(e.target.files?.[0] ?? null)} />
                  {attachedFile && <p className="text-xs text-muted-foreground mt-1">Selected: {attachedFile.name}</p>}
                </div>
                <Button className="w-full" disabled={!form.title || !form.dueDate || createMutation.isPending} onClick={() => createMutation.mutate()}>
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Assignment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
      {!isLoading && assignments.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm rounded-2xl border border-dashed border-border">No assignments yet.</div>
      )}

      <div className="space-y-3">
        {assignments.map((a) => {
          const subCount = subCountMap[a.id] ?? 0;
          const isExpanded = expanded === a.id;
          return (
            <div key={a.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              {/* Assignment row */}
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => navigate(`/classrooms/${classroomSlug}/classwork/${a.slug ?? a.id}`)}
                    className="font-semibold text-sm text-foreground hover:text-primary text-left transition-colors leading-snug"
                  >{a.title}</button>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">Due {a.dueDate}</span>
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{a.points} pts</span>
                    {a.fileUrl && (
                      <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                        <Paperclip className="h-2.5 w-2.5" />Attachment
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {subCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold mr-1">{subCount}</span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1.5 h-8"
                    onClick={() => setExpanded(isExpanded ? null : a.id)}
                  >
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {isExpanded ? "Collapse" : "Submissions"}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => navigate(`/classrooms/${classroomSlug}/classwork/${a.slug ?? a.id}`)}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  {!isArchived && (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600"
                      onClick={() => { if (confirm("Delete this assignment and all its submissions?")) deleteMutation.mutate(a.id); }}
                      disabled={deleteMutation.isPending}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Submissions panel */}
              {isExpanded && (
                <div className="border-t border-border bg-muted/30 px-4 py-4">
                  {loadingSubs && <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}
                  {!loadingSubs && expandedSubs.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">No submissions yet.</p>
                  )}
                  {expandedSubs.length > 0 && (
                    <div className="space-y-2">
                      {expandedSubs.map((sub) => (
                        <div key={sub.id} className="rounded-xl border border-border bg-card px-4 py-3">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm text-foreground">{sub.studentName}</span>
                                <StatusBadge status={sub.status} />
                                {sub.grade !== null && sub.grade !== undefined && (
                                  <span className="text-xs font-semibold text-green-700">{sub.grade}/{a.points} pts</span>
                                )}
                              </div>
                              {sub.content && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{sub.content}</p>
                              )}
                              {sub.fileUrl && (
                                <a
                                  href={sub.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Paperclip className="h-3 w-3" />View submission
                                </a>
                              )}
                            </div>
                            {(sub.status === "submitted" || sub.status === "late" || sub.status === "graded") && (
                              <div className="shrink-0">
                                <Button size="sm" variant="outline" className="text-xs h-8"
                                  onClick={() => openModal(sub, a)}>
                                  {sub.status === "graded" ? "Edit Grade" : "Review"}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <GradingModal
        sub={modalSub}
        assignment={modalAssignment}
        classroomId={classroomId}
        expandedAssignmentId={expanded}
        onClose={closeModal}
      />
    </div>
  );
}

// ── Teacher Grades tab ────────────────────────────────────────────────────────
function TeacherGradesTab({ classroomId }: { classroomId: number }) {
  const { data: assignments = [] } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
  });
  const { data: enrollments = [] } = useQuery<EnrollmentWithStudent[]>({
    queryKey: ["/api/classrooms", classroomId, "enrollments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/enrollments`),
  });
  const allSubsResults = useQueries({
    queries: assignments.map((a) => ({
      queryKey: ["/api/classrooms", classroomId, "assignments", a.id, "submissions"],
      queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments/${a.id}/submissions`) as Promise<SubmissionWithName[]>,
      enabled: assignments.length > 0,
    })),
  });

  const submissionMap: Record<number, Record<number, SubmissionWithName>> = {};
  allSubsResults.forEach((q, i) => {
    (q.data ?? []).forEach((sub) => {
      if (!submissionMap[sub.studentId]) submissionMap[sub.studentId] = {};
      submissionMap[sub.studentId][assignments[i].id] = sub;
    });
  });

  if (assignments.length === 0 || enrollments.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm rounded-2xl border border-dashed border-border">Add assignments and students to see the grade book.</div>;
  }

  const totalPossible = assignments.reduce((s, a) => s + a.points, 0);

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/40 border-b border-border">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky left-0 bg-muted/40 min-w-[140px]">Student</th>
            {assignments.map((a) => (
              <th key={a.id} className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[100px]">
                <div className="truncate max-w-[100px]" title={a.title}>{a.title}</div>
                <div className="text-muted-foreground/60 font-normal">{a.points} pts</div>
              </th>
            ))}
            <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[90px]">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {enrollments.map((e) => {
            const subs = submissionMap[e.studentId] ?? {};
            const earned = assignments.reduce((s, a) => s + (subs[a.id]?.grade ?? 0), 0);
            const pct = totalPossible > 0 ? Math.round((earned / totalPossible) * 100) : 0;
            return (
              <tr key={e.studentId} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-medium text-foreground sticky left-0 bg-card">{e.student.name}</td>
                {assignments.map((a) => {
                  const sub = subs[a.id];
                  return (
                    <td key={a.id} className="px-3 py-3 text-center">
                      {sub?.grade !== null && sub?.grade !== undefined
                        ? <span className="font-medium text-green-700">{sub.grade}</span>
                        : <span className="text-muted-foreground/40">—</span>}
                    </td>
                  );
                })}
                <td className="px-3 py-3 text-center">
                  <div className="font-semibold text-foreground">{earned}/{totalPossible}</div>
                  <div className="text-xs text-muted-foreground">{pct}%</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Classwork dialog + card (unchanged logic, restyled) ───────────────────────
type AttachType = "url" | "file";
type DialogMode = "create" | "edit";

function ClassworkDialog({
  mode, open, onOpenChange, initial, classroomId, assignments, isArchived, onSuccess,
}: {
  mode: DialogMode; open: boolean; onOpenChange: (v: boolean) => void;
  initial?: ClassroomMaterial; classroomId: number;
  assignments: ClassroomAssignment[]; isArchived: boolean; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    attachType: (initial?.url ? "url" : "file") as AttachType,
    url: initial?.url ?? "",
    assignmentId: initial?.assignmentId ? String(initial.assignmentId) : "",
  });
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setForm({
        title: initial?.title ?? "",
        description: initial?.description ?? "",
        attachType: (initial?.url ? "url" : "file") as AttachType,
        url: initial?.url ?? "",
        assignmentId: initial?.assignmentId ? String(initial.assignmentId) : "",
      });
    }
  }, [open]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "materials"] });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const hasFile = form.attachType === "file" && file;
      const token = localStorage.getItem("sessionId");
      const method = mode === "create" ? "POST" : "PATCH";
      if (hasFile) {
        const endpoint = mode === "create"
          ? `/api/classrooms/${classroomId}/materials/with-file`
          : `/api/classrooms/${classroomId}/materials/${initial!.id}/with-file`;
        const fd = new FormData();
        fd.append("file", file!);
        fd.append("title", form.title);
        fd.append("description", form.description);
        if (form.assignmentId) fd.append("assignmentId", form.assignmentId);
        return fetch(endpoint, { method, headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd })
          .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error ?? "Upload failed"); return d; });
      }
      const endpoint = mode === "create"
        ? `/api/classrooms/${classroomId}/materials`
        : `/api/classrooms/${classroomId}/materials/${initial!.id}`;
      return apiRequest(endpoint, { method, body: JSON.stringify({ title: form.title, description: form.description, url: form.url || null, assignmentId: form.assignmentId ? Number(form.assignmentId) : null }) });
    },
    onSuccess: () => { onOpenChange(false); invalidate(); toast({ title: mode === "create" ? "Classwork added" : "Classwork updated", type: "success" }); onSuccess(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{mode === "create" ? "Add Classwork" : "Edit Classwork"}</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-1">
          <div><Label>Title <span className="text-destructive">*</span></Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Reading Chapter 5" /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Optional notes for students…" /></div>
          <div>
            <Label>Attachment <span className="text-xs text-muted-foreground ml-1">(optional)</span></Label>
            <div className="flex gap-2 mt-1 mb-2">
              <Button type="button" size="sm" variant={form.attachType === "url" ? "default" : "outline"} className="gap-1.5"
                onClick={() => { setFile(null); setForm({ ...form, attachType: "url" }); }}>
                <Link2 className="h-3.5 w-3.5" />URL
              </Button>
              <Button type="button" size="sm" variant={form.attachType === "file" ? "default" : "outline"} className="gap-1.5"
                onClick={() => setForm({ ...form, attachType: "file", url: "" })}>
                <FileUp className="h-3.5 w-3.5" />Upload file
              </Button>
            </div>
            {form.attachType === "url"
              ? <Input type="url" placeholder="https://…" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
              : (
                <>
                  <input ref={fileRef} type="file" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (f && f.size > 10 * 1024 * 1024) { toast({ title: "File too large", description: "Maximum file size is 10 MB.", type: "error" }); if (fileRef.current) fileRef.current.value = ""; return; }
                      setFile(f);
                    }} />
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
                    <Paperclip className="h-3.5 w-3.5" />{file ? file.name : "Choose file"}
                  </Button>
                  {file && <span className="text-xs text-muted-foreground ml-2">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>}
                  <p className="text-[11px] text-muted-foreground mt-1">Max 10 MB</p>
                </>
              )}
          </div>
          {assignments.length > 0 && (
            <div>
              <Label>Link to assignment <span className="text-xs text-muted-foreground ml-1">(optional)</span></Label>
              <Select value={form.assignmentId || "none"} onValueChange={(v) => setForm({ ...form, assignmentId: v === "none" ? "" : v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="No linked assignment" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked assignment</SelectItem>
                  {assignments.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button className="w-full" disabled={!form.title.trim() || submitMutation.isPending || isArchived} onClick={() => submitMutation.mutate()}>
            {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {mode === "create" ? "Add Classwork" : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ClassworkCard({ item, classroomId, classroomSlug, isTeacher, isArchived, assignments }: {
  item: ClassroomMaterial; classroomId: number; classroomSlug: string | number;
  isTeacher: boolean; isArchived: boolean; assignments: ClassroomAssignment[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [, navigate] = useLocation();

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest(`/api/classrooms/${classroomId}/materials/${item.id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "materials"] }); toast({ title: "Classwork removed", type: "success" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const assignmentHref = item.linkedAssignment
    ? `/classrooms/${classroomSlug}/classwork/${item.linkedAssignment.slug ?? item.linkedAssignment.id}`
    : null;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button type="button" className="flex-1 min-w-0 text-left" onClick={() => setExpanded((v) => !v)}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{item.title}</span>
            {item.url && <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />}
            {item.linkedAssignment && <Link2 className="h-3 w-3 text-primary shrink-0" />}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {new Date(item.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          {isTeacher && !isArchived && (
            <>
              <button type="button" className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <ClassworkDialog mode="edit" open={editOpen} onOpenChange={setEditOpen} initial={item}
                classroomId={classroomId} assignments={assignments} isArchived={isArchived} onSuccess={() => {}} />
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            </>
          )}
          <button type="button" onClick={() => setExpanded((v) => !v)} className="p-1">
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3 space-y-3 bg-muted/20">
          {item.description && <p className="text-sm text-foreground/80 leading-relaxed">{item.description}</p>}
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
              <Paperclip className="h-3.5 w-3.5" />View attachment<ExternalLink className="h-3 w-3" />
            </a>
          )}
          {assignmentHref && (
            <button type="button" className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              onClick={() => navigate(assignmentHref)}>
              <ArrowRight className="h-3.5 w-3.5" />Go to assignment: {item.linkedAssignment!.title}
            </button>
          )}
          {!item.description && !item.url && !assignmentHref && (
            <p className="text-sm text-muted-foreground italic">No additional details.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ClassworkTab({ classroomId, classroomSlug, isTeacher, isArchived }: { classroomId: number; classroomSlug: string | number; isTeacher: boolean; isArchived: boolean }) {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: classwork = [], isLoading } = useQuery<ClassroomMaterial[]>({
    queryKey: ["/api/classrooms", classroomId, "materials"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/materials`),
  });
  const { data: assignments = [] } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
    enabled: isTeacher,
  });

  return (
    <div className="space-y-3">
      {isTeacher && !isArchived && (
        <div className="flex justify-end">
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />Add Classwork
          </Button>
          <ClassworkDialog mode="create" open={createOpen} onOpenChange={setCreateOpen}
            classroomId={classroomId} assignments={assignments} isArchived={isArchived} onSuccess={() => {}} />
        </div>
      )}
      {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
      {!isLoading && classwork.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm rounded-2xl border border-dashed border-border">No classwork yet.</div>
      )}
      <div className="space-y-2">
        {classwork.map((item) => (
          <ClassworkCard key={item.id} item={item} classroomId={classroomId} classroomSlug={classroomSlug}
            isTeacher={isTeacher} isArchived={isArchived} assignments={assignments} />
        ))}
      </div>
    </div>
  );
}

// ── Students tab ──────────────────────────────────────────────────────────────
type StudentSearchResult = { id: number; name: string; gradeLevel: string; email: string };

function StudentsTab({ classroomId, teacherId, isArchived }: { classroomId: number; teacherId: number; isArchived: boolean }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  const { data: enrollments = [], isLoading } = useQuery<EnrollmentWithStudent[]>({
    queryKey: ["/api/classrooms", classroomId, "enrollments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/enrollments`),
  });
  const { data: myStudents = [] } = useQuery<(Student & { email?: string })[]>({ queryKey: ["/api/students/teacher"] });
  const { data: assignments = [] } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
  });
  const { data: searchResults = [] } = useQuery<StudentSearchResult[]>({
    queryKey: ["/api/students/search", searchQ],
    queryFn: () => apiRequest(`/api/students/search?q=${encodeURIComponent(searchQ)}`),
    enabled: searchOpen,
  });

  const enrolledIds = new Set(enrollments.map((e) => e.studentId));
  const unenrolledAssigned = myStudents.filter((s) => !enrolledIds.has(s.id));
  const filteredSearch = searchResults.filter((s) => !enrolledIds.has(s.id));
  const totalPoints = assignments.reduce((s, a) => s + a.points, 0);

  const submissionsResults = useQueries({
    queries: enrollments.map((e) => ({
      queryKey: ["/api/classrooms", classroomId, "my-submissions", e.studentId],
      queryFn: () => apiRequest(`/api/classrooms/${classroomId}/my-submissions?studentId=${e.studentId}`) as Promise<ClassroomSubmission[]>,
      enabled: enrollments.length > 0,
    })),
  });

  const enrollMutation = useMutation({
    mutationFn: (studentId: number) => apiRequest(`/api/classrooms/${classroomId}/enroll`, { method: "POST", body: JSON.stringify({ studentId }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "enrollments"] }); toast({ title: "Student enrolled", type: "success" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const removeMutation = useMutation({
    mutationFn: (studentId: number) => apiRequest(`/api/classrooms/${classroomId}/students/${studentId}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "enrollments"] }); toast({ title: "Student removed", type: "success" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Enrolled Students {enrollments.length > 0 && <span className="text-muted-foreground font-normal">({enrollments.length})</span>}
        </h3>
        {!isArchived && (
          <Dialog open={searchOpen} onOpenChange={(o) => { setSearchOpen(o); if (!o) setSearchQ(""); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />Add Students</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Add Students</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Search by name, username, or email…" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} autoFocus />
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {searchQ.length < 2 && <p className="text-sm text-muted-foreground text-center py-4">Type at least 2 characters to search.</p>}
                  {filteredSearch.length === 0 && searchQ.length >= 2 && <p className="text-sm text-muted-foreground text-center py-4">No students found.</p>}
                  {filteredSearch.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.email} · {s.gradeLevel}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => enrollMutation.mutate(s.id)} disabled={enrollMutation.isPending}>Enroll</Button>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
      {!isLoading && enrollments.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm rounded-2xl border border-dashed border-border">No students enrolled yet.</div>
      )}

      <div className="space-y-2">
        {enrollments.map((e, i) => {
          const subs = submissionsResults[i]?.data ?? [];
          const earned = subs.reduce((s, sub) => s + (sub.grade ?? 0), 0);
          const pct = totalPoints > 0 ? Math.round((earned / totalPoints) * 100) : null;
          return (
            <div key={e.studentId} className="flex items-center justify-between rounded-2xl border border-border px-4 py-3 bg-card">
              <div>
                <p className="text-sm font-medium text-foreground">{e.student.name}</p>
                {pct !== null && (
                  <p className="text-xs text-muted-foreground">{earned} / {totalPoints} pts · {pct}%</p>
                )}
              </div>
              {!isArchived && (
                <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600"
                  onClick={() => removeMutation.mutate(e.studentId)} disabled={removeMutation.isPending}>
                  Remove
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {!isArchived && unenrolledAssigned.length > 0 && (
        <div className="pt-2 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Your students not yet enrolled</p>
          <div className="space-y-1.5">
            {unenrolledAssigned.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-2xl border border-border px-4 py-2.5 bg-card">
                <span className="text-sm text-foreground">{s.name}</span>
                <Button size="sm" variant="outline" onClick={() => enrollMutation.mutate(s.id)} disabled={enrollMutation.isPending}>+ Enroll</Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Student Assignments tab ───────────────────────────────────────────────────
function StudentAssignmentsTab({ classroomId, classroomSlug, studentId, isArchived }: {
  classroomId: number; classroomSlug: string | number; studentId: number; isArchived: boolean;
}) {
  const [submitOpen, setSubmitOpen] = useState<number | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionFile, setSubmissionFile] = React.useState<File | null>(null);
  const [, navigate] = useLocation();

  const { data: assignments = [], isLoading: loadingA } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
  });
  const { data: mySubmissions = [], isLoading: loadingS } = useQuery<ClassroomSubmission[]>({
    queryKey: ["/api/classrooms", classroomId, "my-submissions"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/my-submissions`),
  });

  const submitMutation = useMutation({
    mutationFn: (assignmentId: number) => {
      const fd = new FormData();
      fd.append("content", submissionText);
      if (submissionFile) fd.append("file", submissionFile);
      const token = localStorage.getItem("sessionId");
      return fetch(`/api/classrooms/${classroomId}/assignments/${assignmentId}/submit`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error ?? "Submission failed"); return d; });
    },
    onSuccess: () => {
      setSubmitOpen(null); setSubmissionText(""); setSubmissionFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "my-submissions"] });
      toast({ title: "Submitted!", type: "success" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const subMap = Object.fromEntries(mySubmissions.map((s) => [s.assignmentId, s]));
  const totalPoints = assignments.reduce((s, a) => s + a.points, 0);
  const earned = mySubmissions.reduce((s, sub) => s + (sub.grade ?? 0), 0);

  if (loadingA || loadingS) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const taskEmojis = ["📖", "✏️", "🔬", "🎨", "🧮"];
  const accentColors = ["border-l-violet-400", "border-l-sky-400", "border-l-emerald-400", "border-l-amber-400", "border-l-pink-400"];
  const bgHovers = ["hover:bg-violet-50/40", "hover:bg-sky-50/40", "hover:bg-emerald-50/40", "hover:bg-amber-50/40", "hover:bg-pink-50/40"];

  return (
    <div className="space-y-4">
      {totalPoints > 0 && (
        <div className="rounded-2xl bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-3">
          <BarChart2 className="h-4 w-4 text-green-600 shrink-0" />
          <span className="text-sm font-medium text-green-800">
            Your total: {earned} / {totalPoints} pts ({Math.round((earned / totalPoints) * 100)}%)
          </span>
        </div>
      )}

      {assignments.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm rounded-2xl border border-dashed border-border">No assignments yet.</div>
      )}

      <div className="space-y-2.5">
        {assignments.map((a, index) => {
          const sub = subMap[a.id];
          const classroomStatus = isArchived ? "archived" : "active";
          const urgency = classifyAssignment(a, mySubmissions, classroomStatus);
          const emoji = taskEmojis[index % taskEmojis.length];
          const accent = accentColors[index % accentColors.length];
          const bgHover = bgHovers[index % bgHovers.length];

          const dueSoonDays = (() => {
            if (urgency !== "due-soon" || !a.dueDate) return 0;
            const due = new Date(a.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            due.setHours(0, 0, 0, 0);
            return Math.round((due.getTime() - today.getTime()) / 86400000);
          })();

          return (
            <div
              key={a.id}
              className={`rounded-2xl border border-border border-l-4 ${accent} ${bgHover} bg-card transition-all duration-150`}
            >
              <div className="flex items-center gap-4 px-4 py-3.5">
                <span className="text-2xl select-none shrink-0 leading-none">{emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => navigate(`/classrooms/${classroomSlug}/classwork/${a.slug ?? a.id}`)}
                      className="font-semibold text-sm text-foreground hover:text-primary text-left transition-colors leading-snug"
                    >{a.title}</button>
                    {urgency === "overdue"   && <Badge className="text-[11px] px-1.5 py-0 h-5 bg-red-100 text-red-700 hover:bg-red-100 border-0">Overdue</Badge>}
                    {urgency === "due-today" && <Badge className="text-[11px] px-1.5 py-0 h-5 bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">Due Today</Badge>}
                    {urgency === "due-soon"  && <Badge className="text-[11px] px-1.5 py-0 h-5 bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-0">in {dueSoonDays} day{dueSoonDays !== 1 ? "s" : ""}</Badge>}
                    {urgency === "new"       && <Badge className="text-[11px] px-1.5 py-0 h-5 bg-green-100 text-green-700 hover:bg-green-100 border-0">New</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">Due {a.dueDate}</span>
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{a.points} pts</span>
                    {sub && <StatusBadge status={sub.status} />}
                    {sub?.grade !== null && sub?.grade !== undefined && (
                      <span className="text-xs font-semibold text-green-700">{sub.grade}/{a.points}</span>
                    )}
                  </div>
                  {sub?.feedback && (
                    <p className="text-xs text-muted-foreground italic mt-1">"{sub.feedback}"</p>
                  )}
                </div>

                <div className="shrink-0">
                  {(!sub || sub.status === "pending") && !isArchived ? (
                    <Dialog
                      open={submitOpen === a.id}
                      onOpenChange={(v) => { setSubmitOpen(v ? a.id : null); if (!v) { setSubmissionText(""); setSubmissionFile(null); } }}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" className="text-xs h-9 px-4 font-semibold">Submit</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Submit: {a.title}</DialogTitle></DialogHeader>
                        <div className="space-y-3 pt-2">
                          <p className="text-xs text-muted-foreground">Due {a.dueDate} · {a.points} pts</p>
                          <div>
                            <Label>Your answer or link</Label>
                            <Textarea placeholder="Write your answer or paste a link…" value={submissionText}
                              onChange={(e) => setSubmissionText(e.target.value)} rows={4} />
                          </div>
                          <div>
                            <Label>Attachment <span className="text-muted-foreground font-normal">(optional)</span></Label>
                            <Input type="file" accept="image/*,.pdf,.doc,.docx,.txt" className="mt-1 cursor-pointer"
                              onChange={(e) => setSubmissionFile(e.target.files?.[0] ?? null)} />
                          </div>
                          <Button className="w-full" disabled={!submissionText.trim() || submitMutation.isPending}
                            onClick={() => submitMutation.mutate(a.id)}>
                            {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Submit
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : sub && sub.status !== "pending" ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Parent Grades tab ─────────────────────────────────────────────────────────
function ParentGradesTab({ classroomId, studentId }: { classroomId: number; studentId: number }) {
  const { data: assignments = [] } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
  });
  const { data: submissions = [] } = useQuery<ClassroomSubmission[]>({
    queryKey: ["/api/classrooms", classroomId, "my-submissions", studentId],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/my-submissions?studentId=${studentId}`),
    enabled: classroomId > 0 && studentId > 0,
  });

  const subMap = Object.fromEntries(submissions.map((s) => [s.assignmentId, s]));
  const totalPoints = assignments.reduce((s, a) => s + a.points, 0);
  const earned = submissions.reduce((s, sub) => s + (sub.grade ?? 0), 0);

  if (assignments.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm rounded-2xl border border-dashed border-border">No assignments yet.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-3">
        <BarChart2 className="h-4 w-4 text-green-600 shrink-0" />
        <span className="text-sm font-medium text-green-800">
          Total: {earned} / {totalPoints} pts ({totalPoints > 0 ? Math.round((earned / totalPoints) * 100) : 0}%)
        </span>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Assignment</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase">Due</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase">Grade</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase">Feedback</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {assignments.map((a) => {
              const sub = subMap[a.id];
              return (
                <tr key={a.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium text-foreground">{a.title}</td>
                  <td className="px-3 py-3 text-muted-foreground">{a.dueDate}</td>
                  <td className="px-3 py-3 text-center"><StatusBadge status={sub?.status ?? "pending"} /></td>
                  <td className="px-3 py-3 text-center">
                    {sub?.grade !== null && sub?.grade !== undefined
                      ? <span className="font-semibold text-green-700">{sub.grade}/{a.points}</span>
                      : <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground italic">{sub?.feedback ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main ClassroomDetail page ─────────────────────────────────────────────────
export default function ClassroomDetail() {
  const [, params] = useRoute("/classrooms/:slug");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const slugParam = params?.slug ?? "";

  const searchParams = new URLSearchParams(window.location.search);
  const parentStudentId = parseInt(searchParams.get("studentId") ?? "0");
  const [activeTab, setActiveTab] = useState<string>(searchParams.get("tab") ?? "feed");

  const { data: classroom, isLoading } = useQuery<Classroom>({
    queryKey: ["/api/classrooms", slugParam],
    queryFn: () => apiRequest(`/api/classrooms/${slugParam}`),
    enabled: !!slugParam,
  });

  const classroomId = classroom?.id ?? 0;

  const { data: studentData } = useQuery<{ id: number }>({
    queryKey: ["/api/students/me"],
    queryFn: () => apiRequest("/api/students/me"),
    enabled: user?.role === "student",
  });

  // Badge counts for student tab pills — share cache with child component queries
  const { data: _badgeAssignments = [] } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
    enabled: user?.role === "student" && classroomId > 0,
  });
  const { data: _badgeSubmissions = [] } = useQuery<ClassroomSubmission[]>({
    queryKey: ["/api/classrooms", classroomId, "my-submissions"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/my-submissions`),
    enabled: user?.role === "student" && classroomId > 0,
  });
  const { data: _badgeMaterials = [] } = useQuery<ClassroomMaterial[]>({
    queryKey: ["/api/classrooms", classroomId, "materials"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/materials`),
    enabled: user?.role === "student" && classroomId > 0,
  });

  const archiveMutation = useMutation({
    mutationFn: (status: "active" | "archived") =>
      apiRequest(`/api/classrooms/${classroomId}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", slugParam] });
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms"] });
      toast({ title: classroom?.status === "active" ? "Classroom archived" : "Classroom reactivated", type: "success" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <ModernSidebar />
        <div className="flex-1 md:ml-[228px] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="flex min-h-screen">
        <ModernSidebar />
        <div className="flex-1 md:ml-[228px] flex items-center justify-center text-muted-foreground">Classroom not found.</div>
      </div>
    );
  }

  const isTeacher = user?.role === "teacher" && classroom.teacherId === user.id;
  const isStudent = user?.role === "student";
  const isParent = user?.role === "parent";
  const isArchived = classroom.status === "archived";
  const theme = getSubjectTheme(classroom.subject || "");

  // Count pending (unsubmitted) assignments for the student tab badges
  const assignmentsBadge = isStudent
    ? _badgeAssignments.filter((a) => {
        const sub = _badgeSubmissions.find((s) => s.assignmentId === a.id);
        return !sub || sub.status === "pending";
      }).length
    : 0;

  // Count classwork materials that have a linked assignment still pending
  const classworkBadge = isStudent
    ? _badgeMaterials.filter((m) => {
        if (!m.linkedAssignment?.id) return false;
        const sub = _badgeSubmissions.find((s) => s.assignmentId === m.linkedAssignment!.id);
        return !sub || sub.status === "pending";
      }).length
    : 0;

  const teacherTabs = [
    { value: "feed", label: "Feed", icon: <Megaphone className="h-3.5 w-3.5" /> },
    { value: "assignments", label: "Assignments", icon: <BookOpen className="h-3.5 w-3.5" /> },
    { value: "grades", label: "Grades", icon: <BarChart2 className="h-3.5 w-3.5" /> },
    { value: "classwork", label: "Classwork", icon: <LibraryBig className="h-3.5 w-3.5" /> },
    { value: "students", label: "Students", icon: <Users className="h-3.5 w-3.5" /> },
  ];
  const studentTabs = [
    { value: "feed", label: "Feed", icon: <Megaphone className="h-3.5 w-3.5" /> },
    { value: "assignments", label: "Assignments", icon: <BookOpen className="h-3.5 w-3.5" />, badge: assignmentsBadge || undefined },
    { value: "classwork", label: "Classwork", icon: <LibraryBig className="h-3.5 w-3.5" />, badge: classworkBadge || undefined },
  ];
  const parentTabs = [
    { value: "feed", label: "Feed", icon: <Megaphone className="h-3.5 w-3.5" /> },
    { value: "grades", label: "Grades", icon: <BarChart2 className="h-3.5 w-3.5" /> },
    { value: "classwork", label: "Classwork", icon: <LibraryBig className="h-3.5 w-3.5" /> },
  ];

  const tabs = isTeacher ? teacherTabs : isStudent ? studentTabs : parentTabs;

  return (
    <div className="flex min-h-screen bg-background">
      <ModernSidebar />
      <div className="flex-1 md:ml-[228px] overflow-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-8 md:pt-6 space-y-6">

          {/* Back nav */}
          <button
            onClick={() => navigate("/dashboard/classrooms")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />Back to Classrooms
          </button>

          {/* Illustrated header card */}
          <div className={`rounded-2xl border border-border overflow-hidden ${theme.bg}`}>
            {/* Banner */}
            <div className="w-full h-28 sm:h-36 overflow-hidden">
              {theme.banner}
            </div>
            {/* Info row */}
            <div className="px-5 py-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl font-bold text-foreground leading-snug">{classroom.name}</h1>
                  {isArchived && <Badge variant="secondary" className="text-xs">Archived</Badge>}
                </div>
                <span className={`text-sm font-semibold ${theme.accentText} mt-0.5 block`}>{classroom.subject}</span>
                {classroom.description && (
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{classroom.description}</p>
                )}
              </div>
              {isTeacher && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5 bg-background/80"
                  onClick={() => archiveMutation.mutate(isArchived ? "active" : "archived")}
                  disabled={archiveMutation.isPending}
                >
                  {archiveMutation.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : isArchived
                      ? <><ArchiveRestore className="h-3.5 w-3.5" />Reactivate</>
                      : <><Archive className="h-3.5 w-3.5" />Archive</>}
                </Button>
              )}
            </div>
          </div>

          {/* Custom tab nav — no Tabs component */}
          <TabNav tabs={tabs} active={activeTab} onChange={setActiveTab} />

          {/* Tab content */}
          {activeTab === "feed" && <FeedTab classroomId={classroomId} isTeacher={isTeacher} isArchived={isArchived} />}
          {activeTab === "assignments" && isTeacher && <TeacherAssignmentsTab classroomId={classroomId} classroomSlug={classroom.slug ?? classroom.id} isArchived={isArchived} />}
          {activeTab === "assignments" && isStudent && <StudentAssignmentsTab classroomId={classroomId} classroomSlug={classroom.slug ?? classroom.id} studentId={studentData?.id ?? 0} isArchived={isArchived} />}
          {activeTab === "grades" && isTeacher && <TeacherGradesTab classroomId={classroomId} />}
          {activeTab === "grades" && isParent && <ParentGradesTab classroomId={classroomId} studentId={parentStudentId} />}
          {activeTab === "classwork" && <ClassworkTab classroomId={classroomId} classroomSlug={classroom.slug ?? classroom.id} isTeacher={isTeacher} isArchived={isArchived} />}
          {activeTab === "students" && isTeacher && <StudentsTab classroomId={classroomId} teacherId={classroom.teacherId} isArchived={isArchived} />}

        </div>
      </div>
    </div>
  );
}