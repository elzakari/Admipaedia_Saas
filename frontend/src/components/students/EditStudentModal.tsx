import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { useToast } from '../ui/use-toast';
import { studentService } from '../../services/studentService';

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: number | null;
  onSuccess?: () => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({ isOpen, onClose, studentId, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [studentData, setStudentData] = useState<any>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string>('');
  const [first_name, setFirstName] = useState('');
  const [last_name, setLastName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!isOpen || !studentId) return;
      
      try {
        setLoading(true);
        const res: any = await studentService.getStudentById(studentId);
        const data = res?.data || res || {};
        setStudentData(data);
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setEmail(data.email || '');
        
        // Inside the data-fetch initialization useEffect mount phase, ensure that if studentData.profile_picture is returned by the API server layer, it sets the local component state variable used to drive image avatar previews
        if (data.profile_picture) {
          setProfilePicturePreview(data.profile_picture);
        } else {
          setProfilePicturePreview('');
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch student profile data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchStudentData();
  }, [isOpen, studentId]);

  const handleSave = async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      await studentService.updateStudent(studentId, {
        first_name,
        last_name,
        email,
        profile_picture: profilePicturePreview
      });
      toast({
        title: "Success",
        description: "Student profile updated successfully",
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update student profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    const f = first_name.charAt(0).toUpperCase();
    const l = last_name.charAt(0).toUpperCase();
    return `${f}${l}` || 'ST';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Student Profile</DialogTitle>
          <DialogDescription>
            Update the profile details and avatar for this student.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex flex-col items-center gap-4 mb-4">
            <Avatar className="h-24 w-24 border">
              {profilePicturePreview ? (
                <AvatarImage src={profilePicturePreview} alt="Profile Picture" />
              ) : (
                <AvatarFallback className="text-xl font-bold bg-muted text-muted-foreground">
                  {getInitials()}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="picture">Profile Picture URL</Label>
              <Input 
                id="picture" 
                type="text" 
                placeholder="https://example.com/avatar.png"
                value={profilePicturePreview}
                onChange={(e) => setProfilePicturePreview(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="first_name" className="text-right">First Name</Label>
            <Input 
              id="first_name" 
              className="col-span-3" 
              value={first_name} 
              onChange={(e) => setFirstName(e.target.value)} 
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="last_name" className="text-right">Last Name</Label>
            <Input 
              id="last_name" 
              className="col-span-3" 
              value={last_name} 
              onChange={(e) => setLastName(e.target.value)} 
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">Email</Label>
            <Input 
              id="email" 
              className="col-span-3" 
              type="email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditStudentModal;
