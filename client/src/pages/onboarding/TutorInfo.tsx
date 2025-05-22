import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

// Form validation schema
const formSchema = z.object({
  education: z.string().min(3, "Please provide your educational background"),
  specialization: z.string().min(3, "Please provide your specialization areas"),
  experience: z.string().min(1, "Please select your years of experience"),
  subjectsToTeach: z.string().min(3, "Please list subjects you can teach"),
  bio: z.string().min(10, "Please provide a brief bio"),
  availableForMeetings: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export default function TutorInfo() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      education: "",
      specialization: "",
      experience: "",
      subjectsToTeach: "",
      bio: "",
      availableForMeetings: true,
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);

    try {
      // Update tutor profile
      const response = await fetch('/api/tutor/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      toast({
        title: "Profile updated",
        description: "Your tutor profile has been created successfully",
      });

      // Navigate to final onboarding step
      setLocation('/onboarding/preferences');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Something went wrong",
        description: "We couldn't update your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OnboardingLayout
      title="Tutor Information"
      subtitle="Tell us about your qualifications and teaching experience"
      currentStep={2}
      totalSteps={3}
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Complete Your Tutor Profile</h2>
          <p className="text-gray-600 dark:text-gray-400">
            This information helps students and parents find the right tutor for their needs.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="education"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Educational Background</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Master's in Mathematics, Stanford University"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialization"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Areas of Specialization</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Algebra, Calculus, Physics"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="experience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Years of Teaching Experience</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 5 years"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subjectsToTeach"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subjects You Can Teach</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Mathematics, Physics, Chemistry"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brief Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell students and parents about your teaching philosophy and approach"
                      className="min-h-[100px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="availableForMeetings"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Available for Online Meetings</FormLabel>
                    <FormDescription>
                      Check this if you're available for virtual tutoring sessions
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-between pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setLocation('/onboarding/role-selection')}
              >
                Back
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Continue"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </OnboardingLayout>
  );
}