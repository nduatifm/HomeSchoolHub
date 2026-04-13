import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, BarChart2, ChevronRight, BookOpen, FileText, ExternalLink, ClipboardList } from "lucide-react";
import DOMPurify from "dompurify";
import type { ClassroomAssignment, ClassroomSubmission, ClassroomMaterial } from "@shared/schema";
import { classifyAssignment } from "@/lib/classroomNotifications";
import { getAttachmentKind } from "@/lib/classroomUtils";
import StatusBadge from "./StatusBadge";
import FormResponse from "@/components/FormResponse";

export default function StudentAssignmentsTab({ classroomId, classroomSlug, studentId, isArchived }: {
  classroomId: number; classroomSlug: string | number; studentId: number; isArchived: boolean;
}) {
  const [submitOpen, setSubmitOpen] = useState<number | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [formAnswers, setFormAnswers] = useState<Record<string, string | string[]>>({});
  const [materialOpen, setMaterialOpen] = useState<ClassroomMaterial | null>(null);
  const [, navigate] = useLocation();

  const { data: assignments = [], isLoading: loadingA } = useQuery<ClassroomAssignment[]>({
    queryKey: ["/api/classrooms", classroomId, "assignments"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/assignments`),
  });
  const { data: mySubmissions = [], isLoading: loadingS } = useQuery<ClassroomSubmission[]>({
    queryKey: ["/api/classrooms", classroomId, "my-submissions"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/my-submissions`),
  });
  const { data: materials = [] } = useQuery<ClassroomMaterial[]>({
    queryKey: ["/api/classrooms", classroomId, "materials"],
    queryFn: () => apiRequest(`/api/classrooms/${classroomId}/materials`),
  });

  const submitMutation = useMutation({
    mutationFn: ({ assignmentId, hasForm }: { assignmentId: number; hasForm: boolean }) => {
      const fd = new FormData();
      fd.append("content", submissionText);
      if (submissionFile) fd.append("file", submissionFile);
      if (hasForm && Object.keys(formAnswers).length > 0) {
        fd.append("formAnswers", JSON.stringify(formAnswers));
      }
      const token = localStorage.getItem("sessionId");
      return fetch(`/api/classrooms/${classroomId}/assignments/${assignmentId}/submit`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error ?? "Submission failed"); return d; });
    },
    onSuccess: () => {
      setSubmitOpen(null); setSubmissionText(""); setSubmissionFile(null); setFormAnswers({});
      queryClient.invalidateQueries({ queryKey: ["/api/classrooms", classroomId, "my-submissions"] });
      toast({ title: "Submitted!", type: "success" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, type: "error" }),
  });

  const subMap = Object.fromEntries(mySubmissions.map((s) => [s.assignmentId, s]));
  const totalPoints = assignments.reduce((s, a) => s + a.points, 0);
  const earned = mySubmissions.reduce((s, sub) => s + (sub.grade ?? 0), 0);

  const materialByAssignment: Record<number, ClassroomMaterial> = {};
  for (const m of materials) {
    if (m.assignmentId != null) materialByAssignment[m.assignmentId] = m;
  }

  function openMaterial(m: ClassroomMaterial) {
    setMaterialOpen(m);
    apiRequest(`/api/classrooms/${classroomId}/materials/${m.id}/seen`, { method: "POST" }).catch(() => {});
  }

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
                    {urgency === "due-soon"  && <Badge className="text-[11px] px-1.5 py-0 h-5 bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-0">Due Soon (in {dueSoonDays} day{dueSoonDays !== 1 ? "s" : ""})</Badge>}
                    {urgency === "new"       && <Badge className="text-[11px] px-1.5 py-0 h-5 bg-green-100 text-green-700 hover:bg-green-100 border-0">New</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">Due {a.dueDate}</span>
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{a.points} pts</span>
                    {a.formSchema && a.formSchema.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full font-medium">
                        <ClipboardList className="h-2.5 w-2.5" />Form
                      </span>
                    )}
                    {sub && <StatusBadge status={sub.status} />}
                    {sub?.grade !== null && sub?.grade !== undefined && (
                      <span className="text-xs font-semibold text-green-700">{sub.grade}/{a.points}</span>
                    )}
                  </div>
                  {materialByAssignment[a.id] && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openMaterial(materialByAssignment[a.id]); }}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 bg-primary/8 hover:bg-primary/12 px-2 py-0.5 rounded-full transition-colors"
                    >
                      <BookOpen className="h-3 w-3" />View material
                    </button>
                  )}
                  {sub?.feedback && (
                    <p className="text-xs text-muted-foreground italic mt-1">"{sub.feedback}"</p>
                  )}
                </div>

                <div className="shrink-0">
                  {(!sub || sub.status === "pending") && !isArchived ? (
                    <Dialog
                      open={submitOpen === a.id}
                      onOpenChange={(v) => { setSubmitOpen(v ? a.id : null); if (!v) { setSubmissionText(""); setSubmissionFile(null); setFormAnswers({}); } }}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" className="text-xs h-9 px-4 font-semibold">Submit</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>Submit: {a.title}</DialogTitle></DialogHeader>
                        <div className="space-y-3 pt-2">
                          <p className="text-xs text-muted-foreground">Due {a.dueDate} · {a.points} pts</p>
                          {a.formSchema && a.formSchema.length > 0 ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 mb-2">
                                <ClipboardList className="h-3.5 w-3.5 text-primary" />
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assignment Form</p>
                              </div>
                              <FormResponse
                                questions={a.formSchema}
                                answers={formAnswers}
                                onChange={setFormAnswers}
                              />
                            </div>
                          ) : (
                            <div>
                              <Label>Your answer or link</Label>
                              <Textarea placeholder="Write your answer or paste a link…" value={submissionText}
                                onChange={(e) => setSubmissionText(e.target.value)} rows={4} />
                            </div>
                          )}
                          <div>
                            <Label>Attachment <span className="text-muted-foreground font-normal">(optional)</span></Label>
                            <Input type="file" accept="image/*,.pdf,.doc,.docx,.txt" className="mt-1 cursor-pointer"
                              onChange={(e) => setSubmissionFile(e.target.files?.[0] ?? null)} />
                          </div>
                          <Button className="w-full"
                            disabled={
                              submitMutation.isPending ||
                              ((!a.formSchema || a.formSchema.length === 0) && !submissionText.trim() && !submissionFile)
                            }
                            onClick={() => submitMutation.mutate({ assignmentId: a.id, hasForm: !!(a.formSchema && a.formSchema.length > 0) })}>
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

      {/* Material preview dialog */}
      <Dialog open={materialOpen !== null} onOpenChange={(v) => { if (!v) setMaterialOpen(null); }}>
        <DialogContent className="max-w-2xl w-full p-0 gap-0 overflow-hidden flex flex-col max-h-[85vh]">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
            <DialogTitle className="text-base font-semibold leading-snug pr-6">
              {materialOpen?.title}
            </DialogTitle>
            {materialOpen?.uploadedAt && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(materialOpen.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-auto px-6 py-5 space-y-5">
            {/* Rich content body */}
            {materialOpen?.description &&
              materialOpen.description !== "<p></p>" &&
              materialOpen.description.trim() !== "" && (
              <div
                className="prose prose-sm max-w-none text-foreground
                  prose-headings:font-semibold prose-headings:text-foreground
                  prose-h2:text-xl prose-h2:mt-4 prose-h2:mb-2
                  prose-p:leading-relaxed prose-p:my-1.5 prose-p:text-foreground/90
                  prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0.5
                  prose-strong:font-semibold prose-strong:text-foreground
                  prose-em:text-foreground/80
                  prose-a:text-primary prose-a:underline
                  prose-hr:border-border prose-hr:my-5
                  prose-img:rounded-xl prose-img:my-4 prose-img:max-w-full"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(materialOpen.description, { USE_PROFILES: { html: true } }),
                }}
              />
            )}

            {/* Attachments */}
            {materialOpen && (() => {
              const urlKind = materialOpen.url ? getAttachmentKind(materialOpen.url) : null;
              const legacyPdf = urlKind === "pdf" ? materialOpen.url! : null;
              const savedAtts = materialOpen.attachments ?? [];
              const allPdfs = legacyPdf && !savedAtts.includes(legacyPdf)
                ? [legacyPdf, ...savedAtts]
                : savedAtts;
              return (
                <>
                  {allPdfs.map((pdfUrl, i) => (
                    <a
                      key={pdfUrl}
                      href={pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:bg-muted/50 transition-colors group"
                    >
                      <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {allPdfs.length > 1 ? `Open PDF ${i + 1}` : "Open PDF"}
                        </p>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    </a>
                  ))}
                  {urlKind === "link" && materialOpen.url && (
                    <a
                      href={materialOpen.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:bg-muted/50 transition-colors group"
                    >
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <ExternalLink className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">Open link</p>
                        <p className="text-xs text-muted-foreground truncate">{materialOpen.url}</p>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    </a>
                  )}
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
