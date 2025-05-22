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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Form validation schema
const formSchema = z.object({
  childrenCount: z.string().min(1, "Please select the number of children"),
  childAges: z.string().min(1, "Please enter your children's ages"),
  goals: z.string().min(3, "Please describe your educational goals"),
  preferredContactTime: z.string().min(1, "Please select your preferred contact time"),
});

type FormValues = z.infer<typeof formSchema>;

export default function ParentInfo() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      childrenCount: "",
      childAges: "",
      goals: "",
      preferredContactTime: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);

    try {
      // Update parent profile
      const response = await fetch('/api/parent/profile', {
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
        description: "Your parent profile has been created successfully",
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
      title="Parent Information"
      subtitle="Tell us about your children and educational goals"
      currentStep={2}
      totalSteps={3}
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Complete Your Parent Profile</h2>
          <p className="text-gray-600 dark:text-gray-400">
            This information helps us personalize your experience and connect you with the right resources.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="childrenCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How many children are you homeschooling?</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select number of children" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1 child</SelectItem>
                      <SelectItem value="2">2 children</SelectItem>
                      <SelectItem value="3">3 children</SelectItem>
                      <SelectItem value="4">4 children</SelectItem>
                      <SelectItem value="5+">5 or more children</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="childAges"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Children's Ages</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 8, 10, 14"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="goals"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Educational Goals</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What are your main educational goals for your children?"
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
              name="preferredContactTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Contact Time</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select preferred time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="morning">Morning (8 AM - 12 PM)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (12 PM - 5 PM)</SelectItem>
                      <SelectItem value="evening">Evening (5 PM - 9 PM)</SelectItem>
                      <SelectItem value="anytime">Any time</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
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