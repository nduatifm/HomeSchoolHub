import { useState } from "react";
import { useLocation } from "wouter";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { Users, GraduationCap, User } from "lucide-react";

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleContinue = async () => {
    if (!selectedRole) {
      toast({
        title: "Please select a role",
        description: "You need to select a role to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get Firebase token for authentication
      const currentUser = await import('@/lib/firebase').then(module => module.auth.currentUser);
      let idToken = '';
      
      if (currentUser) {
        idToken = await currentUser.getIdToken();
      }
      
      // API call to update user role
      const response = await fetch('/api/users/me/role', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ 
          role: selectedRole,
          uid: currentUser?.uid,
          email: currentUser?.email,
          displayName: currentUser?.displayName,
          photoURL: currentUser?.photoURL
        }),
        credentials: 'include' // Important for session cookies
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      // Navigate to the next step based on role
      switch (selectedRole) {
        case 'student':
          setLocation('/onboarding/student-info');
          break;
        case 'tutor':
          setLocation('/onboarding/tutor-info');
          break;
        case 'parent':
          setLocation('/onboarding/parent-info');
          break;
        default:
          setLocation('/');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Something went wrong",
        description: "We couldn't update your role. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OnboardingLayout
      title="Welcome to HomeschoolSync!"
      subtitle="Let's get started by setting up your account"
      currentStep={1}
      totalSteps={3}
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">What best describes your role?</h2>
          <p className="text-gray-600 dark:text-gray-400">
            This helps us personalize your experience. You can change this later in settings.
          </p>
        </div>
        
        <RadioGroup 
          value={selectedRole || ''} 
          onValueChange={setSelectedRole}
          className="grid gap-6"
        >
          <div className={`flex items-start p-4 rounded-lg border-2 ${selectedRole === 'student' ? 'border-primary' : 'border-gray-200 dark:border-gray-800'} hover:border-primary/50 transition-colors cursor-pointer`}
               onClick={() => setSelectedRole('student')}>
            <RadioGroupItem value="student" id="student" className="mt-1" />
            <div className="ml-3 flex-1">
              <Label htmlFor="student" className="text-base font-medium cursor-pointer">Student</Label>
              <div className="flex mt-3 items-center">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20 mr-3">
                  <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Access assignments, track progress, and communicate with tutors
                </p>
              </div>
            </div>
          </div>

          <div className={`flex items-start p-4 rounded-lg border-2 ${selectedRole === 'tutor' ? 'border-primary' : 'border-gray-200 dark:border-gray-800'} hover:border-primary/50 transition-colors cursor-pointer`}
               onClick={() => setSelectedRole('tutor')}>
            <RadioGroupItem value="tutor" id="tutor" className="mt-1" />
            <div className="ml-3 flex-1">
              <Label htmlFor="tutor" className="text-base font-medium cursor-pointer">Tutor</Label>
              <div className="flex mt-3 items-center">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20 mr-3">
                  <User className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Create lessons, assign homework, and monitor student performance
                </p>
              </div>
            </div>
          </div>

          <div className={`flex items-start p-4 rounded-lg border-2 ${selectedRole === 'parent' ? 'border-primary' : 'border-gray-200 dark:border-gray-800'} hover:border-primary/50 transition-colors cursor-pointer`}
               onClick={() => setSelectedRole('parent')}>
            <RadioGroupItem value="parent" id="parent" className="mt-1" />
            <div className="ml-3 flex-1">
              <Label htmlFor="parent" className="text-base font-medium cursor-pointer">Parent</Label>
              <div className="flex mt-3 items-center">
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/20 mr-3">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Oversee your child's learning journey, communicate with tutors, and track academic progress
                </p>
              </div>
            </div>
          </div>
        </RadioGroup>

        <div className="pt-4">
          <Button 
            onClick={handleContinue} 
            className="w-full py-6" 
            size="lg"
            disabled={!selectedRole || isSubmitting}
          >
            {isSubmitting ? "Processing..." : "Continue"}
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  );
}