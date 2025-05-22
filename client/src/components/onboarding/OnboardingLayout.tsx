import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Book } from "lucide-react";

interface OnboardingLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  currentStep: number;
  totalSteps: number;
}

export function OnboardingLayout({
  children,
  title,
  subtitle,
  currentStep,
  totalSteps
}: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
              <Book className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">{subtitle}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full" 
              style={{ width: `${(currentStep / totalSteps) * 100}%` }} 
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-6">
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}