import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useToast } from "../ui/use-toast";
import { Eye, EyeOff, Check, X } from "lucide-react";
import api from "../../lib/api";

interface PasswordRequirement {
  text: string;
  validator: (password: string) => boolean;
}

export function ForcePasswordReset() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Password requirements
  const passwordRequirements: PasswordRequirement[] = [
    {
      text: "At least 8 characters long",
      validator: (password) => password.length >= 8,
    },
    {
      text: "Contains at least one uppercase letter",
      validator: (password) => /[A-Z]/.test(password),
    },
    {
      text: "Contains at least one lowercase letter",
      validator: (password) => /[a-z]/.test(password),
    },
    {
      text: "Contains at least one number",
      validator: (password) => /[0-9]/.test(password),
    },
    {
      text: "Contains at least one special character",
      validator: (password) => /[!@#$%^&*]/.test(password),
    },
  ];
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password meets all requirements
    const allRequirementsMet = passwordRequirements.every(req => 
      req.validator(newPassword)
    );
    
    if (!allRequirementsMet) {
      toast({
          title: "Password Requirements Not Met",
          description: "Please ensure your password meets all the requirements.",
          variant: "destructive",
          id: ""
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
          title: "Passwords Don't Match",
          description: "Please make sure your passwords match.",
          variant: "destructive",
          id: ""
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Call API to reset password
      await api.post('/api/v1/auth/reset-password', {
        new_password: newPassword
      });
      
      toast({
          title: "Password Updated",
          description: "Your password has been successfully updated.",
          id: ""
      });
      
      // Redirect to dashboard or login page
      navigate('/dashboard');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
          title: "Password Reset Failed",
          description: "There was an error updating your password. Please try again.",
          variant: "destructive",
          id: ""
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Reset Your Password</h2>
          <p className="mt-2 text-gray-600">
            You need to set a new password before continuing.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-medium">Password Requirements:</h3>
              <ul className="space-y-1">
                {passwordRequirements.map((req, index) => (
                  <li key={index} className="flex items-center text-sm">
                    {req.validator(newPassword) ? (
                      <Check className="w-4 h-4 mr-2 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 mr-2 text-red-500" />
                    )}
                    {req.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="mr-2">Updating...</span>
                <span className="animate-spin">⟳</span>
              </>
            ) : (
              "Update Password"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}