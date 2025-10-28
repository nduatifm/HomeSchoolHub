import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface EmailLoginProps {
  onSuccess?: (user: any) => void;
  onNeedsVerification?: (email: string) => void;
}

export function EmailLogin({ onSuccess, onNeedsVerification }: EmailLoginProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setLoading(true);
      
      const response = await fetch("/api/auth/email-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.needsVerification && onNeedsVerification) {
          onNeedsVerification(result.email);
          throw new Error(result.message);
        }
        throw new Error(result.message || "Login failed");
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: error.message || "Unable to log in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  type="email" 
                  placeholder="john@example.com" 
                  data-testid="input-email"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
                <Link href="/forgot-password">
                  <button 
                    type="button"
                    className="text-xs text-primary hover:underline"
                    data-testid="link-forgot-password"
                  >
                    Forgot password?
                  </button>
                </Link>
              </div>
              <FormControl>
                <Input 
                  {...field} 
                  type="password" 
                  placeholder="••••••••" 
                  data-testid="input-password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          className="w-full" 
          disabled={loading}
          data-testid="button-login"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log In"
          )}
        </Button>
      </form>
    </Form>
  );
}
