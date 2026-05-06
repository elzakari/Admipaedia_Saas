import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { DatePicker } from "../ui/date-picker";
import { useToast } from "../ui/use-toast";
import { Plus, Trash2, Save } from 'lucide-react';
import { Badge } from '../ui/badge';

interface LessonActivity {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  type: 'introduction' | 'main' | 'assessment' | 'conclusion';
}

interface LessonPlan {
  title: string;
  subject: string;
  grade: string;
  date: Date;
  objectives: string;
  materials: string;
  activities: LessonActivity[];
  assessment: string;
  homework: string;
}

interface LessonPlanCreatorProps {
  onSave: (lessonPlan: LessonPlan) => void;
  initialPlan?: Partial<LessonPlan>;
  curriculumUnitId?: number;
}

export function LessonPlanCreator({ onSave, initialPlan, curriculumUnitId }: LessonPlanCreatorProps) {
  const { toast } = useToast();
  const [lessonPlan, setLessonPlan] = useState<LessonPlan>({
    title: initialPlan?.title || '',
    subject: initialPlan?.subject || '',
    grade: initialPlan?.grade || '',
    date: initialPlan?.date || new Date(),
    objectives: initialPlan?.objectives || '',
    materials: initialPlan?.materials || '',
    activities: initialPlan?.activities || [],
    assessment: initialPlan?.assessment || '',
    homework: initialPlan?.homework || ''
  });

  const [newActivity, setNewActivity] = useState<Omit<LessonActivity, 'id'>>({ 
    title: '', 
    description: '', 
    duration: 15,
    type: 'main'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLessonPlan(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setLessonPlan(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setLessonPlan(prev => ({ ...prev, date }));
    }
  };

  const handleActivityInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewActivity(prev => ({ ...prev, [name]: name === 'duration' ? parseInt(value) || 0 : value }));
  };

  const handleActivityTypeChange = (value: string) => {
    setNewActivity(prev => ({ ...prev, type: value as LessonActivity['type'] }));
  };

  const handleAddActivity = () => {
    if (!newActivity.title) {
      toast({
        title: "Error",
        description: "Activity title is required",
        variant: "destructive",
        id: ''
      });
      return;
    }

    if (newActivity.duration <= 0) {
      toast({
        title: "Error",
        description: "Duration must be greater than zero",
        variant: "destructive",
        id: ''
      });
      return;
    }

    const activity: LessonActivity = {
      ...newActivity,
      id: Date.now().toString()
    };

    setLessonPlan(prev => ({
      ...prev,
      activities: [...prev.activities, activity]
    }));
    setNewActivity({ title: '', description: '', duration: 15, type: 'main' });
  };

  const handleRemoveActivity = (id: string) => {
    setLessonPlan(prev => ({
      ...prev,
      activities: prev.activities.filter(a => a.id !== id)
    }));
  };

  const handleSaveLessonPlan = () => {
    if (!lessonPlan.title) {
      toast({
        title: "Error",
        description: "Lesson title is required",
        variant: "destructive",
        id: ''
      });
      return;
    }

    if (!lessonPlan.subject) {
      toast({
        title: "Error",
        description: "Subject is required",
        variant: "destructive",
        id: ''
      });
      return;
    }

    if (!lessonPlan.objectives) {
      toast({
        title: "Error",
        description: "Learning objectives are required",
        variant: "destructive",
        id: ''
      });
      return;
    }

    onSave(lessonPlan);
    toast({
      title: "Success",
      description: "Lesson plan saved successfully",
      id: ''
    });
  };

  const totalDuration = lessonPlan.activities.reduce((sum, activity) => sum + activity.duration, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lesson Plan Creator</CardTitle>
        <CardDescription>Create a detailed lesson plan for your curriculum</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Lesson Title</Label>
              <Input
                id="title"
                name="title"
                value={lessonPlan.title}
                onChange={handleInputChange}
                placeholder="e.g., Introduction to Photosynthesis"
              />
            </div>
            <div>
              <Label htmlFor="date">Lesson Date</Label>
              <DatePicker
                date={lessonPlan.date}
                setDate={handleDateChange}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                name="subject"
                value={lessonPlan.subject}
                onChange={handleInputChange}
                placeholder="e.g., Biology"
              />
            </div>
            <div>
              <Label htmlFor="grade">Grade Level</Label>
              <Input
                id="grade"
                name="grade"
                value={lessonPlan.grade}
                onChange={handleInputChange}
                placeholder="e.g., 10th Grade"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="objectives">Learning Objectives</Label>
            <Textarea
              id="objectives"
              name="objectives"
              value={lessonPlan.objectives}
              onChange={handleInputChange}
              placeholder="What students will learn from this lesson"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="materials">Materials Needed</Label>
            <Textarea
              id="materials"
              name="materials"
              value={lessonPlan.materials}
              onChange={handleInputChange}
              placeholder="List all materials needed for this lesson"
              rows={2}
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Lesson Activities</Label>
              <div className="text-sm text-gray-500">Total Duration: {totalDuration} minutes</div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-3">
                  <Label htmlFor="activity-title">Activity Title</Label>
                  <Input
                    id="activity-title"
                    name="title"
                    value={newActivity.title}
                    onChange={handleActivityInputChange}
                    placeholder="e.g., Group Discussion"
                  />
                </div>
                <div className="col-span-5">
                  <Label htmlFor="activity-description">Description</Label>
                  <Input
                    id="activity-description"
                    name="description"
                    value={newActivity.description}
                    onChange={handleActivityInputChange}
                    placeholder="Brief description of the activity"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="activity-duration">Duration (min)</Label>
                  <Input
                    id="activity-duration"
                    name="duration"
                    type="number"
                    value={newActivity.duration}
                    onChange={handleActivityInputChange}
                    min="1"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="activity-type">Type</Label>
                  <Select
                    value={newActivity.type}
                    onValueChange={(value) => handleActivityTypeChange(value)}
                  >
                    <SelectTrigger id="activity-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="introduction">Introduction</SelectItem>
                      <SelectItem value="main">Main Activity</SelectItem>
                      <SelectItem value="assessment">Assessment</SelectItem>
                      <SelectItem value="conclusion">Conclusion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleAddActivity} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Activity
              </Button>
            </div>

            {lessonPlan.activities.length > 0 && (
              <div className="space-y-2">
                {lessonPlan.activities.map((activity, index) => (
                  <Card key={activity.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <span className="font-medium">{index + 1}. {activity.title}</span>
                          <Badge className="ml-2" variant="outline">
                            {activity.duration} min
                          </Badge>
                          <Badge className="ml-2" variant="secondary">
                            {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">{activity.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveActivity(activity.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="assessment">Assessment Strategy</Label>
            <Textarea
              id="assessment"
              name="assessment"
              value={lessonPlan.assessment}
              onChange={handleInputChange}
              placeholder="How will you assess student understanding?"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="homework">Homework/Follow-up</Label>
            <Textarea
              id="homework"
              name="homework"
              value={lessonPlan.homework}
              onChange={handleInputChange}
              placeholder="Assignments or follow-up activities"
              rows={2}
            />
          </div>

          <Button onClick={handleSaveLessonPlan} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Save Lesson Plan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}