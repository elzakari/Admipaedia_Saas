import React from "react";
import { Button } from "../ui/button";
import { Check, AlertCircle } from "lucide-react";

interface FormQuickNavProps {
  steps: { title: string; description: string }[];
  currentStep: number;
  completedSteps: number[];
  errors: Record<string, string>;
  onStepClick: (step: number) => void;
}

export function FormQuickNav({
  steps,
  currentStep,
  completedSteps,
  errors,
  onStepClick,
}: FormQuickNavProps) {
  // Group errors by step
  const errorsByStep = React.useMemo(() => {
    const result: Record<number, string[]> = {};
    
    // Define which fields belong to which step
    const stepFields: Record<number, string[]> = {
      0: ['name', 'email', 'admission_number', 'date_of_birth', 'gender', 'phone', 'class_id'],
      1: ['surname', 'placeOfBirth', 'religiousDenomination'],
      2: ['telephone', 'whatsapp', 'postalAddress', 'digitalAddress', 'city', 'country', 'residentialAddress', 'localLandmark'],
      3: ['specialCircumstance', 'allergies', 'medication', 'physicianName', 'physicianPhone'],
      4: ['previousSchool', 'previousClass', 'previousTeam', 'previousYear'],
      5: ['fatherName', 'fatherContact', 'fatherAddress', 'fatherEmail', 'fatherProfession', 'fatherWorkplace', 'motherName', 'motherContact', 'motherAddress', 'motherEmail', 'motherProfession', 'motherWorkplace'],
    };
    
    // Assign errors to steps
    Object.entries(errors).forEach(([field, error]) => {
      for (const [stepIndex, fields] of Object.entries(stepFields)) {
        if (fields.includes(field)) {
          const step = parseInt(stepIndex);
          if (!result[step]) result[step] = [];
          result[step].push(error);
          break;
        }
      }
    });
    
    return result;
  }, [errors]);
  
  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <h3 className="text-sm font-medium mb-3">Quick Navigation</h3>
      <div className="grid grid-cols-3 gap-2">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isCurrent = currentStep === index;
          const hasErrors = errorsByStep[index] && errorsByStep[index].length > 0;
          const isClickable = isCompleted || isCurrent;
          
          return (
            <Button
              key={index}
              variant={isCurrent ? "default" : isCompleted ? "outline" : "ghost"}
              size="sm"
              className={`justify-start ${hasErrors ? 'border-red-500 text-red-500' : ''} ${!isClickable ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => isClickable && onStepClick(index)}
              disabled={!isClickable}
            >
              <div className="flex items-center w-full">
                <span className="mr-2">{index + 1}.</span>
                <span className="truncate">{step.title}</span>
                {hasErrors && <AlertCircle className="w-4 h-4 ml-auto text-red-500" />}
                {isCompleted && !hasErrors && <Check className="w-4 h-4 ml-auto text-green-500" />}
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}