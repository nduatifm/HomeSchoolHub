import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, User, Settings, Camera, FileText, X } from "lucide-react";
import ModernSidebar from "@/components/ModernSidebar";

export default function Profile() {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();

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

  // Helper functions for array management
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

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({ name });
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation for teacher experience
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
    
    const detailsData: any = { 
      bio: bio
    };
    
    // Always send all role-specific fields (including empty values) to allow deletion
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

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ModernSidebar />
      
      <div className="ml-24 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Profile Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your account settings and preferences
            </p>
          </div>

          <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" data-testid="tab-profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="details" data-testid="tab-details">
              <FileText className="h-4 w-4 mr-2" />
              Bio & Details
            </TabsTrigger>
            <TabsTrigger value="picture" data-testid="tab-picture">
              <Camera className="h-4 w-4 mr-2" />
              Picture
            </TabsTrigger>
            <TabsTrigger value="security" data-testid="tab-security">
              <Settings className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal details and information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      data-testid="input-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      data-testid="input-email"
                      value={user?.email || ""}
                      disabled
                      className="bg-gray-100 dark:bg-gray-800"
                    />
                    <p className="text-sm text-gray-500">Email cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      data-testid="input-role"
                      value={user?.role || ""}
                      disabled
                      className="bg-gray-100 dark:bg-gray-800 capitalize"
                    />
                  </div>

                  <Button
                    type="submit"
                    data-testid="button-save-profile"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Bio & Additional Details</CardTitle>
                <CardDescription>
                  {user?.role === "teacher" ? "Share your teaching experience and expertise" :
                   user?.role === "parent" ? "Add contact information and preferences" :
                   "Tell us about your interests and goals"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleDetailsSubmit} className="space-y-6">
                  {/* Bio - Common for all roles */}
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      data-testid="input-bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      className="min-h-[100px]"
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-500">{bio.length}/500 characters</p>
                  </div>

                  {/* Teacher-specific fields */}
                  {user?.role === "teacher" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="teaching-subjects">Teaching Subjects</Label>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              id="teaching-subjects"
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
                            <Button
                              type="button"
                              onClick={addSubject}
                              data-testid="button-add-subject"
                            >
                              Add
                            </Button>
                          </div>
                          {teachingSubjects.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {teachingSubjects.map((subject, index) => (
                                <div key={index} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full" data-testid={`tag-subject-${index}`}>
                                  <span className="text-sm">{subject}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 hover:bg-transparent"
                                    onClick={() => removeSubject(index)}
                                    data-testid={`button-remove-subject-${index}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
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
                          maxLength={200}
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
                          maxLength={100}
                        />
                      </div>
                    </>
                  )}

                  {/* Parent-specific fields */}
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
                          maxLength={20}
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
                          maxLength={50}
                        />
                      </div>
                    </>
                  )}

                  {/* Student-specific fields */}
                  {user?.role === "student" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="interests">Interests & Hobbies</Label>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              id="interests"
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
                            <Button
                              type="button"
                              onClick={addInterest}
                              data-testid="button-add-interest"
                            >
                              Add
                            </Button>
                          </div>
                          {interests.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {interests.map((interest, index) => (
                                <div key={index} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full" data-testid={`tag-interest-${index}`}>
                                  <span className="text-sm">{interest}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 hover:bg-transparent"
                                    onClick={() => removeInterest(index)}
                                    data-testid={`button-remove-interest-${index}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="favorite-subject">Favorite Subject</Label>
                        <Input
                          id="favorite-subject"
                          data-testid="input-favorite-subject"
                          value={favoriteSubject}
                          onChange={(e) => setFavoriteSubject(e.target.value)}
                          placeholder="e.g., Science"
                          maxLength={100}
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
                          className="min-h-[100px]"
                          maxLength={500}
                        />
                      </div>
                    </>
                  )}

                  <Button
                    type="submit"
                    data-testid="button-save-details"
                    disabled={updateDetailsMutation.isPending}
                  >
                    {updateDetailsMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Details
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="picture">
            <Card>
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>
                  Upload a profile picture to personalize your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center space-y-6">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={user?.profilePicture || undefined} alt={user?.name} />
                    <AvatarFallback className="text-2xl">
                      {user?.name ? getInitials(user.name) : "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="w-full max-w-sm">
                    <Label
                      htmlFor="profile-picture"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {uploadingImage ? (
                          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-2" />
                        ) : (
                          <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        )}
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {uploadingImage ? "Uploading..." : "Click to upload profile picture"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                      </div>
                      <Input
                        id="profile-picture"
                        data-testid="input-profile-picture"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user?.googleId ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-400">
                      You signed in with Google. Password change is not available.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input
                        id="current-password"
                        data-testid="input-current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        data-testid="input-new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        data-testid="input-confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                      />
                    </div>

                    <Button
                      type="submit"
                      data-testid="button-change-password"
                      disabled={changePasswordMutation.isPending}
                    >
                      {changePasswordMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Change Password
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  );
}
