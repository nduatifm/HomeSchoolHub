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
import { Loader2, X, Upload } from "lucide-react";
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
  customAction
}: ItemRowProps) {
  return (
    <div className="p-5 flex flex-col gap-4">
      {isEditing ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-4">{label}</div>
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
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">{label}</div>
            <div className="text-base text-foreground font-medium">{value}</div>
            {readOnly && readOnlyNote && (
              <div className="text-xs text-muted-foreground mt-1">{readOnlyNote}</div>
            )}
          </div>
          <div>
            {customAction ? (
              customAction
            ) : readOnly ? null : (
              <Button variant="ghost" size="sm" onClick={onEdit} className="text-primary hover:text-primary hover:bg-primary/5 font-medium">
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

  // Editing states
  const [editingField, setEditingField] = useState<string | null>(null);

  // Values
  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Bio and role-specific fields
  const [bio, setBio] = useState(user?.bio || "");
  const [teachingSubjects, setTeachingSubjects] = useState<string[]>(Array.isArray(user?.teachingSubjects) ? user.teachingSubjects : []);
  const [subjectInput, setSubjectInput] = useState("");
  const [yearsExperience, setYearsExperience] = useState(user?.yearsExperience !== undefined && user?.yearsExperience !== null ? user.yearsExperience.toString() : "");
  const [qualifications, setQualifications] = useState(user?.qualifications || "");
  const [specialization, setSpecialization] = useState(user?.specialization || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [preferredContact, setPreferredContact] = useState(user?.preferredContact || "");
  const [interests, setInterests] = useState<string[]>(Array.isArray(user?.interests) ? user.interests : []);
  const [interestInput, setInterestInput] = useState("");
  const [favoriteSubject, setFavoriteSubject] = useState(user?.favoriteSubject || "");
  const [learningGoals, setLearningGoals] = useState(user?.learningGoals || "");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Array helpers
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

  // Mutations
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

  // Handlers
  const handleNameSave = () => {
    updateProfileMutation.mutate({ name });
  };

  const handleDetailsSave = () => {
    if (user?.role === "teacher" && yearsExperience) {
      const experience = parseInt(yearsExperience);
      if (isNaN(experience) || experience < 0 || experience > 100) {
        toast({
          title: "Invalid input",
          description: "Years of experience must be between 0 and 100",
          type: "error",
        });
        return;
      }
    }
    
    const detailsData: any = { bio };
    
    if (user?.role === "teacher") {
      detailsData.teachingSubjects = teachingSubjects;
      detailsData.yearsExperience = yearsExperience ? parseInt(yearsExperience) : null;
      detailsData.qualifications = qualifications;
      detailsData.specialization = specialization;
    } else if (user?.role === "parent") {
      detailsData.phone = phone;
      detailsData.preferredContact = preferredContact;
    } else if (user?.role === "student") {
      detailsData.interests = interests;
      detailsData.favoriteSubject = favoriteSubject;
      detailsData.learningGoals = learningGoals;
    }
    
    updateDetailsMutation.mutate(detailsData);
  };

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
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        type: "error",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 5MB",
        type: "error",
      });
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

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image");
      }

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
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ModernSidebar />
      <div className="md:ml-[240px] p-6 pt-20 md:pt-6">
        <div className="max-w-2xl mx-auto space-y-10">
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
            <p className="text-muted-foreground text-sm">Manage your account preferences and profile details.</p>
          </div>

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

          <Section title="Bio & Details">
            <ItemRow 
              label="Profile Details" 
              value={<div className="line-clamp-2 text-muted-foreground text-sm max-w-[80%]">{user?.bio || "No bio added yet."}</div>}
              isEditing={editingField === "details"}
              onEdit={() => setEditingField("details")}
              onCancel={() => setEditingField(null)}
              onSave={handleDetailsSave}
              isPending={updateDetailsMutation.isPending}
              editContent={
                <div className="space-y-6 animate-in fade-in">
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      data-testid="input-bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      className="min-h-[100px] resize-none"
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground">{bio.length}/500 characters</p>
                  </div>

                  {user?.role === "teacher" && (
                    <>
                      <div className="space-y-2">
                        <Label>Teaching Subjects</Label>
                        <div className="flex gap-2">
                          <Input
                            data-testid="input-subject"
                            value={subjectInput}
                            onChange={(e) => setSubjectInput(e.target.value)}
                            placeholder="Add a subject (e.g., Mathematics)"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addSubject();
                              }
                            }}
                          />
                          <Button type="button" onClick={addSubject} data-testid="button-add-subject" variant="secondary">Add</Button>
                        </div>
                        {teachingSubjects.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {teachingSubjects.map((subject, index) => (
                              <Badge key={index} variant="secondary" className="px-2 py-1 flex items-center gap-1" data-testid={`tag-subject-${index}`}>
                                {subject}
                                <button type="button" onClick={() => removeSubject(index)} className="hover:text-destructive transition-colors ml-1" data-testid={`button-remove-subject-${index}`}>
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="years-experience">Years of Experience</Label>
                        <Input
                          id="years-experience"
                          data-testid="input-years-experience"
                          type="number"
                          min="0"
                          max="100"
                          value={yearsExperience}
                          onChange={(e) => setYearsExperience(e.target.value)}
                          placeholder="e.g., 5"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="qualifications">Qualifications</Label>
                        <Input
                          id="qualifications"
                          data-testid="input-qualifications"
                          value={qualifications}
                          onChange={(e) => setQualifications(e.target.value)}
                          placeholder="e.g., Bachelor's in Education"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="specialization">Specialization</Label>
                        <Input
                          id="specialization"
                          data-testid="input-specialization"
                          value={specialization}
                          onChange={(e) => setSpecialization(e.target.value)}
                          placeholder="e.g., STEM Education"
                        />
                      </div>
                    </>
                  )}

                  {user?.role === "parent" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          data-testid="input-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g., +1 234 567 8900"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="preferred-contact">Preferred Contact Method</Label>
                        <Input
                          id="preferred-contact"
                          data-testid="input-preferred-contact"
                          value={preferredContact}
                          onChange={(e) => setPreferredContact(e.target.value)}
                          placeholder="e.g., Email, Phone, App Messaging"
                        />
                      </div>
                    </>
                  )}

                  {user?.role === "student" && (
                    <>
                      <div className="space-y-2">
                        <Label>Interests & Hobbies</Label>
                        <div className="flex gap-2">
                          <Input
                            data-testid="input-interest"
                            value={interestInput}
                            onChange={(e) => setInterestInput(e.target.value)}
                            placeholder="Add an interest (e.g., Reading)"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addInterest();
                              }
                            }}
                          />
                          <Button type="button" onClick={addInterest} data-testid="button-add-interest" variant="secondary">Add</Button>
                        </div>
                        {interests.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {interests.map((interest, index) => (
                              <Badge key={index} variant="secondary" className="px-2 py-1 flex items-center gap-1" data-testid={`tag-interest-${index}`}>
                                {interest}
                                <button type="button" onClick={() => removeInterest(index)} className="hover:text-destructive transition-colors ml-1" data-testid={`button-remove-interest-${index}`}>
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="favorite-subject">Favorite Subject</Label>
                        <Input
                          id="favorite-subject"
                          data-testid="input-favorite-subject"
                          value={favoriteSubject}
                          onChange={(e) => setFavoriteSubject(e.target.value)}
                          placeholder="e.g., Science"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="learning-goals">Learning Goals</Label>
                        <Textarea
                          id="learning-goals"
                          data-testid="input-learning-goals"
                          value={learningGoals}
                          onChange={(e) => setLearningGoals(e.target.value)}
                          placeholder="What do you want to achieve?"
                          className="min-h-[100px] resize-none"
                        />
                      </div>
                    </>
                  )}
                </div>
              }
            />
          </Section>

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
              readOnlyNote={user?.googleId ? "You signed in with Google — password change is not available" : undefined}
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

          {/* Bottom spacing */}
          <div className="h-10" />
        </div>
      </div>
    </div>
  );
}
