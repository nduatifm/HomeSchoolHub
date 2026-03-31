import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, X, Camera, ArrowLeftRight, Plus } from "lucide-react";
import ModernSidebar from "@/components/ModernSidebar";

/* ──────────────────────────────────────────────
   Shared row component — mirrors MoneyTallyHQ layout
   Label is UPPERCASE + tracked; Edit button is pill-shaped with border;
   Save is dark (gray-900); Cancel is ghost; all inline in a flex row.
─────────────────────────────────────────────── */
interface RowProps {
  label: string;
  displayValue: React.ReactNode;
  isEditing: boolean;
  onEdit?: () => void;
  onCancel: () => void;
  onSave: () => void;
  isPending?: boolean;
  editContent: React.ReactNode;
  readOnly?: boolean;
  readOnlyNote?: string;
  hideEdit?: boolean;
}

function Row({
  label,
  displayValue,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  isPending,
  editContent,
  readOnly,
  readOnlyNote,
  hideEdit,
}: RowProps) {
  return (
    <div className="px-6 py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            {label}
          </p>
          {isEditing ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 items-start">
                {editContent}
                <Button
                  type="button"
                  size="sm"
                  onClick={onSave}
                  disabled={isPending}
                  className="h-10 px-5 bg-gray-900 hover:bg-gray-700 text-white"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  disabled={isPending}
                  className="h-10 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-base text-gray-900">{displayValue}</div>
              {readOnly && readOnlyNote && (
                <p className="text-xs text-gray-400 mt-1">{readOnlyNote}</p>
              )}
            </div>
          )}
        </div>
        {!isEditing && !readOnly && !hideEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full px-5 h-9 text-sm font-medium text-gray-700 border border-gray-300 bg-white hover:bg-gray-100 hover:border-gray-400 transition-colors flex-shrink-0"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Section wrapper ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">{title}</h2>
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 shadow-sm">
        {children}
      </div>
    </div>
  );
}

/* ── Tag badge list ── */
function TagList({
  items,
  onRemove,
  testPrefix,
}: {
  items: string[];
  onRemove: (i: number) => void;
  testPrefix: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {items.map((item, index) => (
        <Badge
          key={index}
          variant="secondary"
          className="px-2 py-1 flex items-center gap-1 text-sm"
          data-testid={`tag-${testPrefix}-${index}`}
        >
          {item}
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="hover:text-destructive transition-colors ml-1"
            data-testid={`button-remove-${testPrefix}-${index}`}
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Main page
═══════════════════════════════════════════════════ */
export default function Profile() {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();

  const [editingField, setEditingField] = useState<string | null>(null);
  const stopEditing = () => setEditingField(null);

  // Account fields
  const [name, setName] = useState(user?.name || "");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Security fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Bio & detail fields
  const [bio, setBio] = useState(user?.bio || "");
  const [teachingSubjects, setTeachingSubjects] = useState<string[]>(
    Array.isArray(user?.teachingSubjects) ? user.teachingSubjects : []
  );
  const [subjectInput, setSubjectInput] = useState("");
  const [yearsExperience, setYearsExperience] = useState(
    user?.yearsExperience != null ? user.yearsExperience.toString() : ""
  );
  const [qualifications, setQualifications] = useState(user?.qualifications || "");
  const [specialization, setSpecialization] = useState(user?.specialization || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [preferredContact, setPreferredContact] = useState(user?.preferredContact || "");
  const [interests, setInterests] = useState<string[]>(
    Array.isArray(user?.interests) ? user.interests : []
  );
  const [interestInput, setInterestInput] = useState("");
  const [favoriteSubject, setFavoriteSubject] = useState(user?.favoriteSubject || "");
  const [learningGoals, setLearningGoals] = useState(user?.learningGoals || "");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Array helpers
  const addSubject = () => {
    const t = subjectInput.trim();
    if (t && !teachingSubjects.includes(t)) { setTeachingSubjects([...teachingSubjects, t]); setSubjectInput(""); }
  };
  const removeSubject = (i: number) => setTeachingSubjects(teachingSubjects.filter((_, j) => j !== i));

  const addInterest = () => {
    const t = interestInput.trim();
    if (t && !interests.includes(t)) { setInterests([...interests, t]); setInterestInput(""); }
  };
  const removeInterest = (i: number) => setInterests(interests.filter((_, j) => j !== i));

  /* ── Mutations ── */
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string }) =>
      await apiRequest("/api/user/profile", { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      stopEditing();
      toast({ title: "Saved", description: "Your name has been updated.", type: "success" });
    },
    onError: (error: any) =>
      toast({ title: "Update failed", description: error.message || "Failed to update", type: "error" }),
  });

  const updateDetailsMutation = useMutation({
    mutationFn: async (data: any) =>
      await apiRequest("/api/user/profile-details", { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      stopEditing();
      toast({ title: "Saved", description: "Your details have been updated.", type: "success" });
    },
    onError: (error: any) =>
      toast({ title: "Update failed", description: error.message || "Failed to update", type: "error" }),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) =>
      await apiRequest("/api/user/change-password", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      stopEditing();
      toast({ title: "Password changed", description: "Your password has been updated.", type: "success" });
    },
    onError: (error: any) =>
      toast({ title: "Password change failed", description: error.message || "Failed to change password", type: "error" }),
  });

  const [showAddRoleConfirm, setShowAddRoleConfirm] = useState(false);

  const addRoleMutation = useMutation({
    mutationFn: async (role: string) =>
      await apiRequest("/api/user/add-role", { method: "POST", body: JSON.stringify({ role }) }),
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Teacher role added!", description: "Switching you to your new teacher dashboard…", type: "success" });
      setTimeout(() => { window.location.href = "/dashboard"; }, 700);
    },
    onError: (error: any) =>
      toast({ title: "Failed to add role", description: error.message || "Something went wrong", type: "error" }),
  });

  const switchRoleMutation = useMutation({
    mutationFn: async (role: string) =>
      await apiRequest("/api/user/switch-active-role", { method: "POST", body: JSON.stringify({ role }) }),
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      toast({ title: "Context switched", description: `Now viewing as ${data.user.role}.`, type: "success" });
      setTimeout(() => { window.location.href = "/dashboard"; }, 500);
    },
    onError: (error: any) =>
      toast({ title: "Failed to switch role", description: error.message || "Something went wrong", type: "error" }),
  });

  /* Builds full details payload, merging current saved values with one override */
  const detailsPayload = (overrides: Record<string, any>) => ({
    bio: user?.bio || "",
    teachingSubjects: Array.isArray(user?.teachingSubjects) ? user.teachingSubjects : [],
    yearsExperience: user?.yearsExperience ?? null,
    qualifications: user?.qualifications || "",
    specialization: user?.specialization || "",
    phone: user?.phone || "",
    preferredContact: user?.preferredContact || "",
    interests: Array.isArray(user?.interests) ? user.interests : [],
    favoriteSubject: user?.favoriteSubject || "",
    learningGoals: user?.learningGoals || "",
    ...overrides,
  });

  /* ── Save handlers ── */
  const handleNameSave = () => updateProfileMutation.mutate({ name });

  const handleBioSave = () => updateDetailsMutation.mutate(detailsPayload({ bio }));
  const handleSubjectsSave = () => updateDetailsMutation.mutate(detailsPayload({ teachingSubjects }));
  const handleYearsExperienceSave = () => {
    if (yearsExperience) {
      const n = parseInt(yearsExperience);
      if (isNaN(n) || n < 0 || n > 100) {
        toast({ title: "Invalid input", description: "Must be 0–100", type: "error" }); return;
      }
      updateDetailsMutation.mutate(detailsPayload({ yearsExperience: n }));
    } else {
      updateDetailsMutation.mutate(detailsPayload({ yearsExperience: null }));
    }
  };
  const handleQualificationsSave = () => updateDetailsMutation.mutate(detailsPayload({ qualifications }));
  const handleSpecializationSave = () => updateDetailsMutation.mutate(detailsPayload({ specialization }));
  const handlePhoneSave = () => updateDetailsMutation.mutate(detailsPayload({ phone }));
  const handlePreferredContactSave = () => updateDetailsMutation.mutate(detailsPayload({ preferredContact }));
  const handleInterestsSave = () => updateDetailsMutation.mutate(detailsPayload({ interests }));
  const handleFavoriteSubjectSave = () => updateDetailsMutation.mutate(detailsPayload({ favoriteSubject }));
  const handleLearningGoalsSave = () => updateDetailsMutation.mutate(detailsPayload({ learningGoals }));

  const handlePasswordSave = () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "New password and confirm must match", type: "error" }); return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "Must be at least 8 characters", type: "error" }); return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  /* ── Image upload ── */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast({ title: "Invalid file", description: "Please select an image", type: "error" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Too large", description: "Max 5 MB", type: "error" }); return; }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "profile-pictures");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("sessionId")}` },
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Failed to upload image");

      const { url } = await uploadRes.json();
      const updateRes = await apiRequest("/api/user/profile-picture", {
        method: "PATCH",
        body: JSON.stringify({ profilePicture: url }),
      });
      setUser(updateRes.user);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Photo updated", description: "Your profile picture has been updated.", type: "success" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || "Failed to upload", type: "error" });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isPendingDetails = updateDetailsMutation.isPending;

  /* ── Placeholder display helpers ── */
  const empty = (label: string) => <span className="text-gray-400">{label}</span>;

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernSidebar />
      <div className="md:ml-[240px] px-4 sm:px-6 py-12 pt-20 md:pt-12">
        <div className="max-w-2xl mx-auto space-y-12">

          {/* ══ Account ══ */}
          <Section title="Account">

            {/* Photo row */}
            <div className="px-6 py-6">
              <div className="flex items-center gap-5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                  data-testid="input-picture"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="relative group cursor-pointer"
                  data-testid="button-upload-picture"
                >
                  <Avatar className="h-20 w-20 border-2 border-gray-100 group-hover:border-gray-200 transition-all">
                    <AvatarImage src={user?.profilePicture || ""} alt={user?.name || "User"} />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {uploadingImage ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 rounded-full transition-all">
                      <Camera className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </button>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Profile</p>
                  <p className="text-lg font-medium text-gray-900">{user?.name}</p>
                </div>
              </div>
            </div>

            {/* Name */}
            <Row
              label="Name"
              displayValue={user?.name || empty("Not set")}
              isEditing={editingField === "name"}
              onEdit={() => { setEditingField("name"); setName(user?.name || ""); }}
              onCancel={stopEditing}
              onSave={handleNameSave}
              isPending={updateProfileMutation.isPending}
              editContent={
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  data-testid="input-name"
                  className="h-10 max-w-xs border-gray-300"
                  autoFocus
                />
              }
            />

            {/* Email */}
            <Row
              label="Email"
              displayValue={user?.email}
              isEditing={false}
              onCancel={stopEditing}
              onSave={() => {}}
              readOnly
              readOnlyNote="Cannot be changed"
              editContent={null}
            />

            {/* Role / Context Switcher */}
            <div className="px-6 py-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Role</p>
              <div className="flex flex-wrap items-center gap-2">
                {/* Active role badge */}
                <Badge className="capitalize px-2.5 py-0.5 bg-green-50 text-green-800 border border-green-200 hover:bg-green-50">
                  {user?.role}
                </Badge>
                {/* Other roles user already has — show switch buttons */}
                {(user?.roles ?? [])
                  .filter((r) => r !== user?.role)
                  .map((r) => (
                    <Button
                      key={r}
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={switchRoleMutation.isPending}
                      onClick={() => switchRoleMutation.mutate(r)}
                      className="h-8 px-3 text-xs gap-1.5 border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      {switchRoleMutation.isPending
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <ArrowLeftRight className="h-3 w-3" />
                      }
                      Switch to {r}
                    </Button>
                  ))}
                {/* Add teacher role — only users who have parent capability but not teacher yet */}
                {(user?.roles ?? []).includes("parent") && !(user?.roles ?? []).includes("teacher") && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={addRoleMutation.isPending}
                    onClick={() => setShowAddRoleConfirm(true)}
                    className="h-8 px-3 text-xs gap-1.5 border-dashed border-gray-300 text-gray-500 hover:bg-gray-50"
                  >
                    {addRoleMutation.isPending
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Plus className="h-3 w-3" />
                    }
                    Become a teacher
                  </Button>
                )}
              </div>
              {(user?.roles ?? []).length > 1 && (
                <p className="text-xs text-gray-400 mt-2">
                  Switching context redirects you to the appropriate dashboard.
                </p>
              )}
            </div>
          </Section>

          {/* ══ Bio & Details ══ */}
          <Section title="Bio &amp; Details">
            {/* Bio */}
            <Row
              label="Bio"
              displayValue={user?.bio || empty("No bio yet.")}
              isEditing={editingField === "bio"}
              onEdit={() => { setEditingField("bio"); setBio(user?.bio || ""); }}
              onCancel={stopEditing}
              onSave={handleBioSave}
              isPending={isPendingDetails}
              editContent={
                <div className="w-full space-y-1">
                  <Textarea
                    data-testid="input-bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    className="min-h-[90px] resize-none border-gray-300"
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-400">{bio.length}/500</p>
                </div>
              }
            />

            {/* Teacher fields — shown whenever user has the teacher capability */}
            {(user?.roles ?? []).includes("teacher") && (
              <>
                <Row
                  label="Teaching Subjects"
                  displayValue={
                    user?.teachingSubjects && (user.teachingSubjects as string[]).length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {(user.teachingSubjects as string[]).map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    ) : empty("None added yet.")
                  }
                  isEditing={editingField === "teachingSubjects"}
                  onEdit={() => {
                    setEditingField("teachingSubjects");
                    setTeachingSubjects(Array.isArray(user?.teachingSubjects) ? [...user.teachingSubjects] : []);
                    setSubjectInput("");
                  }}
                  onCancel={stopEditing}
                  onSave={handleSubjectsSave}
                  isPending={isPendingDetails}
                  editContent={
                    <div className="w-full space-y-2">
                      <div className="flex gap-2">
                        <Input
                          data-testid="input-subject"
                          value={subjectInput}
                          onChange={(e) => setSubjectInput(e.target.value)}
                          onKeyPress={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubject(); } }}
                          placeholder="e.g. Mathematics"
                          className="h-10 border-gray-300 max-w-xs"
                        />
                        <Button type="button" variant="outline" onClick={addSubject} data-testid="button-add-subject" className="h-10">
                          Add
                        </Button>
                      </div>
                      <TagList items={teachingSubjects} onRemove={removeSubject} testPrefix="subject" />
                    </div>
                  }
                />

                <Row
                  label="Years of Experience"
                  displayValue={
                    user?.yearsExperience != null
                      ? `${user.yearsExperience} ${user.yearsExperience === 1 ? "year" : "years"}`
                      : empty("Not specified.")
                  }
                  isEditing={editingField === "yearsExperience"}
                  onEdit={() => {
                    setEditingField("yearsExperience");
                    setYearsExperience(user?.yearsExperience != null ? user.yearsExperience.toString() : "");
                  }}
                  onCancel={stopEditing}
                  onSave={handleYearsExperienceSave}
                  isPending={isPendingDetails}
                  editContent={
                    <Input
                      data-testid="input-years-experience"
                      type="number" min="0" max="100"
                      value={yearsExperience}
                      onChange={(e) => setYearsExperience(e.target.value)}
                      placeholder="e.g. 5"
                      className="h-10 w-32 border-gray-300"
                      autoFocus
                    />
                  }
                />

                <Row
                  label="Qualifications"
                  displayValue={user?.qualifications || empty("Not specified.")}
                  isEditing={editingField === "qualifications"}
                  onEdit={() => { setEditingField("qualifications"); setQualifications(user?.qualifications || ""); }}
                  onCancel={stopEditing}
                  onSave={handleQualificationsSave}
                  isPending={isPendingDetails}
                  editContent={
                    <Input
                      data-testid="input-qualifications"
                      value={qualifications}
                      onChange={(e) => setQualifications(e.target.value)}
                      placeholder="e.g. Bachelor's in Education"
                      className="h-10 max-w-xs border-gray-300"
                      autoFocus
                    />
                  }
                />

                <Row
                  label="Specialization"
                  displayValue={user?.specialization || empty("Not specified.")}
                  isEditing={editingField === "specialization"}
                  onEdit={() => { setEditingField("specialization"); setSpecialization(user?.specialization || ""); }}
                  onCancel={stopEditing}
                  onSave={handleSpecializationSave}
                  isPending={isPendingDetails}
                  editContent={
                    <Input
                      data-testid="input-specialization"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      placeholder="e.g. STEM Education"
                      className="h-10 max-w-xs border-gray-300"
                      autoFocus
                    />
                  }
                />
              </>
            )}

            {/* Parent fields — shown whenever user has the parent capability */}
            {(user?.roles ?? []).includes("parent") && (
              <>
                <Row
                  label="Phone Number"
                  displayValue={user?.phone || empty("Not specified.")}
                  isEditing={editingField === "phone"}
                  onEdit={() => { setEditingField("phone"); setPhone(user?.phone || ""); }}
                  onCancel={stopEditing}
                  onSave={handlePhoneSave}
                  isPending={isPendingDetails}
                  editContent={
                    <Input
                      data-testid="input-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 234 567 8900"
                      className="h-10 max-w-xs border-gray-300"
                      autoFocus
                    />
                  }
                />

                <Row
                  label="Preferred Contact Method"
                  displayValue={user?.preferredContact || empty("Not specified.")}
                  isEditing={editingField === "preferredContact"}
                  onEdit={() => { setEditingField("preferredContact"); setPreferredContact(user?.preferredContact || ""); }}
                  onCancel={stopEditing}
                  onSave={handlePreferredContactSave}
                  isPending={isPendingDetails}
                  editContent={
                    <Input
                      data-testid="input-preferred-contact"
                      value={preferredContact}
                      onChange={(e) => setPreferredContact(e.target.value)}
                      placeholder="e.g. Email, Phone, App Messaging"
                      className="h-10 max-w-xs border-gray-300"
                      autoFocus
                    />
                  }
                />
              </>
            )}

            {/* Student fields — shown whenever user has the student capability */}
            {(user?.roles ?? []).includes("student") && (
              <>
                <Row
                  label="Interests &amp; Hobbies"
                  displayValue={
                    user?.interests && (user.interests as string[]).length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {(user.interests as string[]).map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    ) : empty("None added yet.")
                  }
                  isEditing={editingField === "interests"}
                  onEdit={() => {
                    setEditingField("interests");
                    setInterests(Array.isArray(user?.interests) ? [...user.interests] : []);
                    setInterestInput("");
                  }}
                  onCancel={stopEditing}
                  onSave={handleInterestsSave}
                  isPending={isPendingDetails}
                  editContent={
                    <div className="w-full space-y-2">
                      <div className="flex gap-2">
                        <Input
                          data-testid="input-interest"
                          value={interestInput}
                          onChange={(e) => setInterestInput(e.target.value)}
                          onKeyPress={(e) => { if (e.key === "Enter") { e.preventDefault(); addInterest(); } }}
                          placeholder="e.g. Reading"
                          className="h-10 border-gray-300 max-w-xs"
                        />
                        <Button type="button" variant="outline" onClick={addInterest} data-testid="button-add-interest" className="h-10">
                          Add
                        </Button>
                      </div>
                      <TagList items={interests} onRemove={removeInterest} testPrefix="interest" />
                    </div>
                  }
                />

                <Row
                  label="Favorite Subject"
                  displayValue={user?.favoriteSubject || empty("Not specified.")}
                  isEditing={editingField === "favoriteSubject"}
                  onEdit={() => { setEditingField("favoriteSubject"); setFavoriteSubject(user?.favoriteSubject || ""); }}
                  onCancel={stopEditing}
                  onSave={handleFavoriteSubjectSave}
                  isPending={isPendingDetails}
                  editContent={
                    <Input
                      data-testid="input-favorite-subject"
                      value={favoriteSubject}
                      onChange={(e) => setFavoriteSubject(e.target.value)}
                      placeholder="e.g. Science"
                      className="h-10 max-w-xs border-gray-300"
                      autoFocus
                    />
                  }
                />

                <Row
                  label="Learning Goals"
                  displayValue={
                    user?.learningGoals
                      ? <span className="text-sm">{user.learningGoals}</span>
                      : empty("Not specified.")
                  }
                  isEditing={editingField === "learningGoals"}
                  onEdit={() => { setEditingField("learningGoals"); setLearningGoals(user?.learningGoals || ""); }}
                  onCancel={stopEditing}
                  onSave={handleLearningGoalsSave}
                  isPending={isPendingDetails}
                  editContent={
                    <Textarea
                      data-testid="input-learning-goals"
                      value={learningGoals}
                      onChange={(e) => setLearningGoals(e.target.value)}
                      placeholder="What do you want to achieve?"
                      className="min-h-[90px] resize-none border-gray-300 w-full max-w-sm"
                    />
                  }
                />
              </>
            )}
          </Section>

          {/* ══ Security ══ */}
          <Section title="Security">
            <Row
              label="Password"
              displayValue={user?.googleId ? "Managed by Google" : "••••••••"}
              isEditing={editingField === "password"}
              onEdit={() => {
                setEditingField("password");
                setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
              }}
              onCancel={stopEditing}
              onSave={handlePasswordSave}
              isPending={changePasswordMutation.isPending}
              readOnly={!!user?.googleId}
              readOnlyNote={user?.googleId ? "You signed in with Google — password change is not available" : undefined}
              editContent={
                <div className="w-full space-y-3 max-w-sm">
                  <div className="space-y-1">
                    <Label htmlFor="current-password" className="text-xs text-gray-500 uppercase tracking-wider">Current Password</Label>
                    <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="h-10 border-gray-300" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-password" className="text-xs text-gray-500 uppercase tracking-wider">New Password</Label>
                    <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-10 border-gray-300" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="confirm-password" className="text-xs text-gray-500 uppercase tracking-wider">Confirm New Password</Label>
                    <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-10 border-gray-300" />
                  </div>
                </div>
              }
            />
          </Section>

          <div className="h-10" />
        </div>
      </div>

      {/* Confirm "Become a teacher" */}
      <AlertDialog open={showAddRoleConfirm} onOpenChange={setShowAddRoleConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add a teacher role to your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will give you access to a full teacher dashboard alongside your parent account.
              You can switch between your parent and teacher views at any time from the sidebar —
              your family's data and your tutoring profile stay completely separate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => addRoleMutation.mutate("teacher")}
              className="bg-primary text-white hover:bg-primary/90"
            >
              Yes, make me a teacher
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
