import React from "react";
import { Check, ChevronRight } from "lucide-react";

interface FormProgressIndicatorProps {
  steps: { title: string; description: string }[];
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
}

export function FormProgressIndicator({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}: FormProgressIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isCurrent = currentStep === index;
          const isClickable = isCompleted || isCurrent;
          
          return (
            <React.Fragment key={index}>
              <div 
                className={`flex flex-col items-center ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                onClick={() => isClickable && onStepClick(index)}
              >
                <div 
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${isCurrent ? 'border-blue-600 bg-blue-50 text-blue-600' : isCompleted ? 'border-green-500 bg-green-50 text-green-500' : 'border-gray-300 bg-white text-gray-400'}`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <div className="mt-2 text-xs font-medium text-center">
                  {step.title}
                </div>
              </div>
              
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${index < currentStep ? 'bg-green-500' : 'bg-gray-300'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}