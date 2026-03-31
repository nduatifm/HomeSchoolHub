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
import { toast } from "@/hooks/use-toast";
import { Loader2, X } from "lucide-react";
import ModernSidebar from "@/components/ModernSidebar";

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="divide-y">
          {children}
        </div>
      </div>
    </div>
  );
}

interface ItemRowProps {
  label: string;
  value?: React.ReactNode;
  isEditing: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  isPending?: boolean;
  editContent?: React.ReactNode;
  readOnly?: boolean;
  readOnlyNote?: string;
  customAction?: React.ReactNode;
}

function ItemRow({
  label,
  value,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  isPending,
  editContent,
  readOnly,
  readOnlyNote,
  customAction,
}: ItemRowProps) {
  return (
    <div className="p-5 flex flex-col gap-4">
      {isEditing ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-3">{label}</div>
            {editContent}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
            <Button size="sm" onClick={onSave} disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1 min-w-0">
            <div className="text-sm font-medium text-muted-foreground">{label}</div>
            <div className="text-base text-foreground font-medium">{value}</div>
            {readOnly && readOnlyNote && (
              <div className="text-xs text-muted-foreground mt-1">{readOnlyNote}</div>
            )}
          </div>
          <div className="shrink-0">
            {customAction ? (
              customAction
            ) : readOnly ? null : (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="text-primary hover:text-primary hover:bg-primary/5 font-medium"
              >
                Edit
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Profile() {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();

  const [editingField, setEditingField] = useState<string | null>(null);

  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const [bio, setBio] = useState(user?.bio || "");
  const [teachingSubjects, setTeachingSubjects] = useState<string[]>(
    Array.isArray(user?.teachingSubjects) ? user.teachingSubjects : []
  );
  const [subjectInput, setSubjectInput] = useState("");
  const [yearsExperience, setYearsExperience] = useState(
    user?.yearsExperience !== undefined && user?.yearsExperience !== null
      ? user.yearsExperience.toString()
      : ""
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

  const addSubject = () => {
    const trimmed = subjectInput.trim();
    if (trimmed && !teachingSubjects.includes(trimmed)) {
      setTeachingSubjects([...teachingSubjects, trimmed]);
      setSubjectInput("");
    }
  };

  const removeSubject = (index: number) => {
    setTeachingSubjects(teachingSubjects.filter((_, i) => i !== index));
  };

  const addInterest = () => {
    const trimmed = interestInput.trim();
    if (trimmed && !interests.includes(trimmed)) {
      setInterests([...interests, trimmed]);
      setInterestInput("");
    }
  };

  const removeInterest = (index: number) => {
    setInterests(interests.filter((_, i) => i !== index));
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      return await apiRequest("/api/user/profile", {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setEditingField(null);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
        type: "success",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile",
        type: "error",
      });
    },
  });

  const updateDetailsMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/user/profile-details", {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setEditingField(null);
      toast({
        title: "Details updated",
        description: "Your profile details have been updated successfully.",
        type: "success",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update details",
        type: "error",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return await apiRequest("/api/user/change-password", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setEditingField(null);
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully.",
        type: "success",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Password change failed",
        description: error.message || "Failed to change password",
        type: "error",
      });
    },
  });

  const buildDetailsPayload = (overrides: Record<string, any>) => {
    const base: any = {
      bio: user?.bio || "",
      teachingSubjects: Array.isArray(user?.teachingSubjects) ? user.teachingSubjects : [],
      yearsExperience:
        user?.yearsExperience !== undefined && user?.yearsExperience !== null
          ? user.yearsExperience
          : null,
      qualifications: user?.qualifications || "",
      specialization: user?.specialization || "",
      phone: user?.phone || "",
      preferredContact: user?.preferredContact || "",
      interests: Array.isArray(user?.interests) ? user.interests : [],
      favoriteSubject: user?.favoriteSubject || "",
      learningGoals: user?.learningGoals || "",
    };
    return { ...base, ...overrides };
  };

  const handleNameSave = () => updateProfileMutation.mutate({ name });

  const handleBioSave = () =>
    updateDetailsMutation.mutate(buildDetailsPayload({ bio }));

  const handleSubjectsSave = () =>
    updateDetailsMutation.mutate(buildDetailsPayload({ teachingSubjects }));

  const handleYearsExperienceSave = () => {
    if (yearsExperience) {
      const exp = parseInt(yearsExperience);
      if (isNaN(exp) || exp < 0 || exp > 100) {
        toast({
          title: "Invalid input",
          description: "Years of experience must be between 0 and 100",
          type: "error",
        });
        return;
      }
      updateDetailsMutation.mutate(buildDetailsPayload({ yearsExperience: exp }));
    } else {
      updateDetailsMutation.mutate(buildDetailsPayload({ yearsExperience: null }));
    }
  };

  const handleQualificationsSave = () =>
    updateDetailsMutation.mutate(buildDetailsPayload({ qualifications }));

  const handleSpecializationSave = () =>
    updateDetailsMutation.mutate(buildDetailsPayload({ specialization }));

  const handlePhoneSave = () =>
    updateDetailsMutation.mutate(buildDetailsPayload({ phone }));

  const handlePreferredContactSave = () =>
    updateDetailsMutation.mutate(buildDetailsPayload({ preferredContact }));

  const handleInterestsSave = () =>
    updateDetailsMutation.mutate(buildDetailsPayload({ interests }));

  const handleFavoriteSubjectSave = () =>
    updateDetailsMutation.mutate(buildDetailsPayload({ favoriteSubject }));

  const handleLearningGoalsSave = () =>
    updateDetailsMutation.mutate(buildDetailsPayload({ learningGoals }));

  const handlePasswordSave = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirm password must match",
        type: "error",
      });
      return;
    }
    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters",
        type: "error",
      });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file", type: "error" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Image must be less than 5MB", type: "error" });
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "profile-pictures");

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) throw new Error("Failed to upload image");

      const uploadData = await uploadResponse.json();

      const updateResponse = await apiRequest("/api/user/profile-picture", {
        method: "PATCH",
        body: JSON.stringify({ profilePicture: uploadData.url }),
      });

      setUser(updateResponse.user);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been updated successfully.",
        type: "success",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload profile picture",
        type: "error",
      });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isPendingDetails = updateDetailsMutation.isPending;

  const tagBadges = (items: string[], onRemove: (i: number) => void, testPrefix: string) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {items.map((item, index) => (
        <Badge
          key={index}
          variant="secondary"
          className="px-2 py-1 flex items-center gap-1"
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

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      <div className="md:ml-[240px] p-6 pt-20 md:pt-6">
        <div className="max-w-2xl mx-auto space-y-10">

          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
            <p className="text-muted-foreground text-sm">
              Manage your account preferences and profile details.
            </p>
          </div>

          {/* ── Account ── */}
          <Section title="Account">
            <div className="p-5 flex justify-between items-center gap-4">
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Profile photo</div>
                <Avatar className="w-16 h-16 border-2 border-background shadow-sm">
                  <AvatarImage src={user?.profilePicture || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                  data-testid="input-picture"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="text-primary hover:text-primary hover:bg-primary/5 font-medium"
                  data-testid="button-upload-picture"
                >
                  {uploadingImage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Edit
                </Button>
              </div>
            </div>

            <ItemRow
              label="Name"
              value={user?.name}
              isEditing={editingField === "name"}
              onEdit={() => { setEditingField("name"); setName(user?.name || ""); }}
              onCancel={() => setEditingField(null)}
              onSave={handleNameSave}
              isPending={updateProfileMutation.isPending}
              editContent={
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  data-testid="input-name"
                  className="max-w-md"
                />
              }
            />

            <ItemRow
              label="Email"
              value={user?.email}
              isEditing={false}
              readOnly
              readOnlyNote="Cannot be changed"
            />

            <ItemRow
              label="Role"
              value={
                <Badge variant="secondary" className="capitalize text-sm px-2 py-0.5">
                  {user?.role}
                </Badge>
              }
              isEditing={false}
              readOnly
            />
          </Section>

          {/* ── Bio & Details ── */}
          <Section title="Bio & Details">
            <ItemRow
              label="Bio"
              value={
                <span className="text-muted-foreground font-normal text-sm line-clamp-2">
                  {user?.bio || "No bio added yet."}
                </span>
              }
              isEditing={editingField === "bio"}
              onEdit={() => { setEditingField("bio"); setBio(user?.bio || ""); }}
              onCancel={() => setEditingField(null)}
              onSave={handleBioSave}
              isPending={isPendingDetails}
              editContent={
                <div className="space-y-2 max-w-md">
                  <Textarea
                    data-testid="input-bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    className="min-h-[100px] resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">{bio.length}/500 characters</p>
                </div>
              }
            />

            {user?.role === "teacher" && (
              <>
                <ItemRow
                  label="Teaching Subjects"
                  value={
                    user?.teachingSubjects && (user.teachingSubjects as string[]).length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {(user.teachingSubjects as string[]).map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground font-normal text-sm">None added yet.</span>
                    )
                  }
                  isEditing={editingField === "teachingSubjects"}
                  onEdit={() => {
                    setEditingField("teachingSubjects");
                    setTeachingSubjects(Array.isArray(user?.teachingSubjects) ? [...user.teachingSubjects] : []);
                    setSubjectInput("");
                  }}
                  onCancel={() => setEditingField(null)}
                  onSave={handleSubjectsSave}
                  isPending={isPendingDetails}
                  editContent={
                    <div className="space-y-2 max-w-md">
                      <div className="flex gap-2">
                        <Input
                          data-testid="input-subject"
                          value={subjectInput}
                          onChange={(e) => setSubjectInput(e.target.value)}
                          placeholder="Add a subject (e.g., Mathematics)"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); addSubject(); }
                          }}
                        />
                        <Button type="button" onClick={addSubject} data-testid="button-add-subject" variant="secondary">
                          Add
                        </Button>
                      </div>
                      {teachingSubjects.length > 0 && tagBadges(teachingSubjects, removeSubject, "subject")}
                    </div>
                  }
                />

                <ItemRow
                  label="Years of Experience"
                  value={
                    user?.yearsExperience !== undefined && user?.yearsExperience !== null ? (
                      <span>{user.yearsExperience} {user.yearsExperience === 1 ? "year" : "years"}</span>
                    ) : (
                      <span className="text-muted-foreground font-normal text-sm">Not specified.</span>
                    )
                  }
                  isEditing={editingField === "yearsExperience"}
                  onEdit={() => {
                    setEditingField("yearsExperience");
                    setYearsExperience(
                      user?.yearsExperience !== undefined && user?.yearsExperience !== null
                        ? user.yearsExperience.toString()
                        : ""
                    );
                  }}
                  onCancel={() => setEditingField(null)}
                  onSave={handleYearsExperienceSave}
                  isPending={isPendingDetails}
                  editContent={
                    <Input
                      data-testid="input-years-experience"
                      type="number"
                      min="0"
                      max="100"
                      value={yearsExperience}
                      onChange={(e) => setYearsExperience(e.target.value)}
                      placeholder="e.g., 5"
                      className="max-w-[160px]"
                    />
                  }
                />

                <ItemRow
                  label="Qualifications"
                  value={
                    user?.qualifications ? (
                      <span>{user.qualifications}</span>
                    ) : (
                      <span className="text-muted-foreground font-normal text-sm">Not specified.</span>
                    )
                  }
                  isEditing={editingField === "qualifications"}
                  onEdit={() => { setEditingField("qualifications"); setQualifications(user?.qualifications || ""); }}
                  onCancel={() => setEditingField(null)}
                  onSave={handleQualificationsSave}
                  isPending={isPendingDetails}
                  editContent={
                    <Input
                      data-testid="input-qualifications"
                      value={qualifications}
                      onChange={(e) => setQualifications(e.target.value)}
                      placeholder="e.g., Bachelor's in Education"
                      className="max-w-md"
                    />
                  }
                />

                <ItemRow
                  label="Specialization"
                  value={
                    user?.specialization ? (
                      <span>{user.specialization}</span>
                    ) : (
                      <span className="text-muted-foreground font-normal text-sm">Not specified.</span>
                    )
                  }
                  isEditing={editingField === "specialization"}
                  onEdit={() => { setEditingField("specialization"); setSpecialization(user?.specialization || ""); }}
                  onCancel={() => setEditingField(null)}
                  onSave={handleSpecializationSave}
                  isPending={isPendingDetails}
                  editContent={
                    <Input
                      data-testid="input-specialization"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      placeholder="e.g., STEM Education"
                      className="max-w-md"
                    />
                  }
                />
              </>
            )}

            {user?.role === "parent" && (
              <>
                <ItemRow
                  label="Phone Number"
                  value={
                    user?.phone ? (
                      <span>{user.phone}</span>
                    ) : (
                      <span className="text-muted-foreground font-normal text-sm">Not specified.</span>
                    )
                  }
                  isEditing={editingField === "phone"}
                  onEdit={() => { setEditingField("phone"); setPhone(user?.phone || ""); }}
                  onCancel={() => setEditingField(null)}
                  onSave={handlePhoneSave}
                  isPending={isPendingDetails}
                  editContent={
                    <Input
                      data-testid="input-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g., +1 234 567 8900"
                      className="max-w-md"
                    />
                  }
                />

                <ItemRow
                  label="Preferred Contact Method"
                  value={
                    user?.preferredContact ? (
                      <span>{user.preferredContact}</span>
                    ) : (
                      <span className="text-muted-foreground font-normal text-sm">Not specified.</span>
                    )
                  }
                  isEditing={editingField === "preferredContact"}
                  onEdit={() => { setEditingField("preferredContact"); setPreferredContact(user?.preferredContact || ""); }}
                  onCancel={() => setEditingField(null)}
                  onSave={handlePreferredContactSave}
                  isPending={isPendingDetails}
                  editContent={
                    <Input
                      data-testid="input-preferred-contact"
                      value={preferredContact}
                      onChange={(e) => setPreferredContact(e.target.value)}
                      placeholder="e.g., Email, Phone, App Messaging"
                      className="max-w-md"
                    />
                  }
                />
              </>
            )}

            {user?.role === "student" && (
              <>
                <ItemRow
                  label="Interests & Hobbies"
                  value={
                    user?.interests && (user.interests as string[]).length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {(user.interests as string[]).map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground font-normal text-sm">None added yet.</span>
                    )
                  }
                  isEditing={editingField === "interests"}
                  onEdit={() => {
                    setEditingField("interests");
                    setInterests(Array.isArray(user?.interests) ? [...user.interests] : []);
                    setInterestInput("");
                  }}
                  onCancel={() => setEditingField(null)}
                  onSave={handleInterestsSave}
                  isPending={isPendingDetails}
                  editContent={
                    <div className="space-y-2 max-w-md">
                      <div className="flex gap-2">
                        <Input
                          data-testid="input-interest"
                          value={interestInput}
                          onChange={(e) => setInterestInput(e.target.value)}
                          placeholder="Add an interest (e.g., Reading)"
                          onKeyPress={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); addInterest(); }
                          }}
                        />
                        <Button type="button" onClick={addInterest} data-testid="button-add-interest" variant="secondary">
                          Add
                        </Button>
                      </div>
                      {interests.length > 0 && tagBadges(interests, removeInterest, "interest")}
                    </div>
                  }
                />

                <ItemRow
                  label="Favorite Subject"
                  value={
                    user?.favoriteSubject ? (
                      <span>{user.favoriteSubject}</span>
                    ) : (
                      <span className="text-muted-foreground font-normal text-sm">Not specified.</span>
                    )
                  }
                  isEditing={editingField === "favoriteSubject"}
                  onEdit={() => { setEditingField("favoriteSubject"); setFavoriteSubject(user?.favoriteSubject || ""); }}
                  onCancel={() => setEditingField(null)}
                  onSave={handleFavoriteSubjectSave}
                  isPending={isPendingDetails}
                  editContent={
                    <Input
                      data-testid="input-favorite-subject"
                      value={favoriteSubject}
                      onChange={(e) => setFavoriteSubject(e.target.value)}
                      placeholder="e.g., Science"
                      className="max-w-md"
                    />
                  }
                />

                <ItemRow
                  label="Learning Goals"
                  value={
                    user?.learningGoals ? (
                      <span className="text-sm font-normal line-clamp-2">{user.learningGoals}</span>
                    ) : (
                      <span className="text-muted-foreground font-normal text-sm">Not specified.</span>
                    )
                  }
                  isEditing={editingField === "learningGoals"}
                  onEdit={() => { setEditingField("learningGoals"); setLearningGoals(user?.learningGoals || ""); }}
                  onCancel={() => setEditingField(null)}
                  onSave={handleLearningGoalsSave}
                  isPending={isPendingDetails}
                  editContent={
                    <Textarea
                      data-testid="input-learning-goals"
                      value={learningGoals}
                      onChange={(e) => setLearningGoals(e.target.value)}
                      placeholder="What do you want to achieve?"
                      className="min-h-[100px] resize-none max-w-md"
                    />
                  }
                />
              </>
            )}
          </Section>

          {/* ── Security ── */}
          <Section title="Security">
            <ItemRow
              label="Password"
              value={user?.googleId ? "Managed by Google" : "••••••••"}
              isEditing={editingField === "password"}
              onEdit={() => {
                setEditingField("password");
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}
              onCancel={() => setEditingField(null)}
              onSave={handlePasswordSave}
              isPending={changePasswordMutation.isPending}
              readOnly={!!user?.googleId}
              readOnlyNote={
                user?.googleId
                  ? "You signed in with Google — password change is not available"
                  : undefined
              }
              editContent={
                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              }
            />
          </Section>

          <div className="h-10" />
        </div>
      </div>
    </div>
  );
}
