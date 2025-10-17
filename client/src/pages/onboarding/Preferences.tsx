import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";

// Form validation schema
const formSchema = z.object({
  emailNotifications: z.boolean().default(true),
  reminderTime: z.string().min(1, "Please select a reminder time"),
  darkMode: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

export default function Preferences() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      emailNotifications: true,
      reminderTime: "1day",
      darkMode: false,
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);

    try {
      // Update user preferences
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      toast({
        title: "Preferences saved",
        description: "Your preferences have been saved successfully",
      });

      // Invalidate user queries to refetch updated user data
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/firebase-user"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/email-user"] });

      // Show completion state
      setIsComplete(true);
      
      // After a short delay, redirect to dashboard
      setTimeout(() => {
        setLocation('/');
      }, 1500);
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Something went wrong",
        description: "We couldn't save your preferences. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  if (isComplete) {
    return (
      <OnboardingLayout
        title="Setup Complete!"
        subtitle="Your account is now fully configured"
        currentStep={3}
        totalSteps={3}
      >
        <div className="text-center py-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Welcome to HomeschoolSync!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Your account is all set up and ready to go. You'll be redirected to your dashboard in a moment.
          </p>
          <Button 
            onClick={() => setLocation('/')}
            className="w-full py-6"
            size="lg"
          >
            Go to Dashboard
          </Button>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      title="Platform Preferences"
      subtitle="Customize your experience with HomeschoolSync"
      currentStep={3}
      totalSteps={3}
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Almost Done!</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Set your preferences for notifications and platform appearance.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="emailNotifications"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Email Notifications</FormLabel>
                    <FormDescription>
                      Receive email updates about assignments, sessions, and messages
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reminderTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reminder Time</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select when to receive reminders" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1hour">1 Hour Before</SelectItem>
                      <SelectItem value="3hours">3 Hours Before</SelectItem>
                      <SelectItem value="1day">1 Day Before</SelectItem>
                      <SelectItem value="2days">2 Days Before</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    When should we remind you about upcoming sessions and assignments?
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="darkMode"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Dark Mode</FormLabel>
                    <FormDescription>
                      Use dark theme for the platform interface
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-between pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => window.history.back()}
              >
                Back
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Complete Setup"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </OnboardingLayout>
  );
}