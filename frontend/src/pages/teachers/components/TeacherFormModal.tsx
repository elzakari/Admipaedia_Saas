import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { TeacherCreate, TeacherUpdate } from "../../../services/teacherService";
import { useCreateTeacher, useUpdateTeacher } from "../../../hooks/useTeachers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { toast } from "sonner";
import { getFormClasses, getModalClasses } from "../../../styles/design-system";
import { cn } from "../../../lib/utils";

// Updated schema - status is required, not optional with default
const teacherSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
  employeeId: z.string().min(1, "Employee ID is required"),
  status: z.enum(["active", "inactive", "on_leave"]), // Required field, no default
  phoneNumber: z.string().optional(),
  qualification: z.string().optional(),
  specialization: z.string().optional(),
  joinDate: z.string().optional(),
});

// Form data type
type FormData = z.infer<typeof teacherSchema>;

// Transform function to convert form data to API format
const transformFormDataToAPI = (data: FormData): TeacherCreate => {
  return {
    first_name: data.firstName,
    last_name: data.lastName,
    employee_id: data.employeeId,
    phone_number: data.phoneNumber || undefined,
    joining_date: data.joinDate || undefined,
    email: data.email,
    qualification: data.qualification || undefined,
    specialization: data.specialization || undefined,
    status: data.status,
  };
};

// Transform function to convert API data to form format
const transformAPIDataToForm = (teacher: any): FormData => {
  return {
    firstName: teacher.first_name || teacher.firstName || "",
    lastName: teacher.last_name || teacher.lastName || "",
    email: teacher.email || "",
    employeeId: teacher.employee_id || teacher.employeeId || "",
    status: teacher.status || "active", // Ensure status is always provided
    phoneNumber: teacher.phone_number || teacher.phoneNumber || teacher.phone || "",
    qualification: teacher.qualification || "",
    specialization: teacher.specialization || "",
    joinDate: teacher.joining_date || teacher.joinDate ? 
      new Date(teacher.joining_date || teacher.joinDate).toISOString().split('T')[0] : "",
  };
};

interface TeacherFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher?: any; // The teacher to edit, undefined for create mode
}

export function TeacherFormModal({ isOpen, onClose, teacher }: TeacherFormModalProps) {
  const isEditMode = !!teacher;
  const { mutate: createTeacher, isPending: isCreating } = useCreateTeacher();
  const { mutate: updateTeacher, isPending: isUpdating } = useUpdateTeacher();
  
  // Get design system classes
  const formClasses = getFormClasses();
  const modalClasses = getModalClasses();
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      employeeId: "",
      status: "active", // Required field with default value
      phoneNumber: "",
      qualification: "",
      specialization: "",
      joinDate: "",
    },
  });

  // Watch status for controlled Select component
  const statusValue = watch("status");

  React.useEffect(() => {
    if (isOpen) {
      if (isEditMode && teacher) {
        const formData = transformAPIDataToForm(teacher);
        reset(formData);
      } else {
        reset({
          firstName: "",
          lastName: "",
          email: "",
          employeeId: "",
          status: "active",
          phoneNumber: "",
          qualification: "",
          specialization: "",
          joinDate: "",
        });
      }
    }
  }, [isOpen, isEditMode, teacher, reset]);

  // Properly typed submit handler
  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      if (isEditMode && teacher) {
        // For updates, transform to API format
        const updateData = transformFormDataToAPI(data) as TeacherUpdate;
        delete (updateData as any).email;
        
        updateTeacher(
          { id: teacher.id, data: updateData },
          {
            onSuccess: () => {
              toast.success("Teacher updated successfully");
              onClose();
            },
            onError: (error: any) => {
              console.error("Update error:", error);
              toast.error(error?.message || "Failed to update teacher");
            },
          }
        );
      } else {
        // For creation, transform to API format
        const createData = transformFormDataToAPI(data);
        
        createTeacher(
          createData,
          {
            onSuccess: () => {
              toast.success("Teacher created successfully");
              onClose();
            },
            onError: (error: any) => {
              console.error("Create error:", error);
              toast.error(error?.message || "Failed to create teacher");
            },
          }
        );
      }
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("An unexpected error occurred");
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn("sm:max-w-[600px] max-h-[90vh] overflow-y-auto ds-modal-content")}>
        <DialogHeader className={cn(modalClasses.header)}>
          <DialogTitle className={cn(modalClasses.title, "ds-modal-title")}>
            {isEditMode ? "Edit Teacher" : "Add New Teacher"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="ds-form space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* First Name */}
            <div className={cn(formClasses.field)}>
              <Label htmlFor="firstName" className={cn(formClasses.labelRequired)}>
                First Name
              </Label>
              <Input
                id="firstName"
                {...register("firstName")}
                className={cn(
                  formClasses.input,
                  errors.firstName && formClasses.inputError,
                  "ds-form-input"
                )}
                placeholder="Enter first name"
              />
              {errors.firstName && (
                <p className={cn(formClasses.error)}>{errors.firstName.message}</p>
              )}
            </div>

            {/* Last Name */}
            <div className={cn(formClasses.field)}>
              <Label htmlFor="lastName" className={cn(formClasses.labelRequired)}>
                Last Name
              </Label>
              <Input
                id="lastName"
                {...register("lastName")}
                className={cn(
                  formClasses.input,
                  errors.lastName && formClasses.inputError,
                  "ds-form-input"
                )}
                placeholder="Enter last name"
              />
              {errors.lastName && (
                <p className={cn(formClasses.error)}>{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div className={cn(formClasses.field)}>
              <Label htmlFor="email" className={cn(formClasses.labelRequired)}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                className={cn(
                  formClasses.input,
                  errors.email && formClasses.inputError,
                  "ds-form-input"
                )}
                placeholder="Enter email address"
                disabled={isEditMode}
              />
              {errors.email && (
                <p className={cn(formClasses.error)}>{errors.email.message}</p>
              )}
              {isEditMode ? (
                <p className="text-xs text-muted-foreground">Email is managed on the user account.</p>
              ) : null}
            </div>

            {/* Phone Number */}
            <div className={cn(formClasses.field)}>
              <Label htmlFor="phoneNumber" className={cn(formClasses.label)}>
                Phone Number
              </Label>
              <Input
                id="phoneNumber"
                {...register("phoneNumber")}
                className={cn(
                  formClasses.input,
                  errors.phoneNumber && formClasses.inputError,
                  "ds-form-input"
                )}
                placeholder="Enter phone number"
              />
              {errors.phoneNumber && (
                <p className={cn(formClasses.error)}>{errors.phoneNumber.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Employee ID */}
            <div className={cn(formClasses.field)}>
              <Label htmlFor="employeeId" className={cn(formClasses.labelRequired)}>
                Employee ID
              </Label>
              <Input
                id="employeeId"
                {...register("employeeId")}
                className={cn(
                  formClasses.input,
                  errors.employeeId && formClasses.inputError,
                  "ds-form-input"
                )}
                placeholder="Enter employee ID"
              />
              {errors.employeeId && (
                <p className={cn(formClasses.error)}>{errors.employeeId.message}</p>
              )}
            </div>

            {/* Join Date */}
            <div className={cn(formClasses.field)}>
              <Label htmlFor="joinDate" className={cn(formClasses.label)}>
                Join Date
              </Label>
              <Input
                id="joinDate"
                type="date"
                {...register("joinDate")}
                className={cn(
                  formClasses.input,
                  errors.joinDate && formClasses.inputError,
                  "ds-form-input"
                )}
              />
              {errors.joinDate && (
                <p className={cn(formClasses.error)}>{errors.joinDate.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Qualification */}
            <div className={cn(formClasses.field)}>
              <Label htmlFor="qualification" className={cn(formClasses.label)}>
                Qualification
              </Label>
              <Input
                id="qualification"
                {...register("qualification")}
                className={cn(
                  formClasses.input,
                  errors.qualification && formClasses.inputError,
                  "ds-form-input"
                )}
                placeholder="Enter qualification"
              />
              {errors.qualification && (
                <p className={cn(formClasses.error)}>{errors.qualification.message}</p>
              )}
            </div>

            {/* Specialization */}
            <div className={cn(formClasses.field)}>
              <Label htmlFor="specialization" className={cn(formClasses.label)}>
                Specialization
              </Label>
              <Input
                id="specialization"
                {...register("specialization")}
                className={cn(
                  formClasses.input,
                  errors.specialization && formClasses.inputError,
                  "ds-form-input"
                )}
                placeholder="Enter specialization"
              />
              {errors.specialization && (
                <p className={cn(formClasses.error)}>{errors.specialization.message}</p>
              )}
            </div>
          </div>

          {/* Status */}
          <div className={cn(formClasses.field)}>
            <Label htmlFor="status" className={cn(formClasses.labelRequired)}>
              Status
            </Label>
            <Select
              value={statusValue}
              onValueChange={(value) => setValue("status", value as "active" | "inactive" | "on_leave")}
            >
              <SelectTrigger className={cn(
                formClasses.select,
                errors.status && "border-error-500 focus:ring-error-500",
                "ds-form-select"
              )}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && (
              <p className={cn(formClasses.error)}>{errors.status.message}</p>
            )}
          </div>

          <DialogFooter className={cn(modalClasses.footer, "ds-modal-footer pt-4")}>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating || isUpdating}
              className="ds-form-button-secondary"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || isUpdating}
              className={cn(formClasses.buttonPrimary, "ds-form-button-primary min-w-[100px]")}
            >
              {isCreating || isUpdating ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{isEditMode ? "Updating..." : "Creating..."}</span>
                </div>
              ) : (
                isEditMode ? "Update Teacher" : "Create Teacher"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
