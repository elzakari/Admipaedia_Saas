import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "../ui/use-toast";

interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  points: number;
}

interface RubricCreatorProps {
  onSave: (criteria: RubricCriterion[]) => void;
  initialCriteria?: RubricCriterion[];
}

export function RubricCreator({ onSave, initialCriteria = [] }: RubricCreatorProps) {
  const { toast } = useToast();
  const [criteria, setCriteria] = useState<RubricCriterion[]>(initialCriteria);
  const [newCriterion, setNewCriterion] = useState<Omit<RubricCriterion, 'id'>>({ 
    name: '', 
    description: '', 
    points: 0 
  });

  const handleAddCriterion = () => {
    if (!newCriterion.name) {
      toast({
        title: "Error",
        description: "Criterion name is required",
        variant: "destructive",
        id: ''
      });
      return;
    }

    if (newCriterion.points <= 0) {
      toast({
        title: "Error",
        description: "Points must be greater than zero",
        variant: "destructive",
        id: ''
      });
      return;
    }

    const criterion: RubricCriterion = {
      ...newCriterion,
      id: Date.now().toString()
    };

    setCriteria([...criteria, criterion]);
    setNewCriterion({ name: '', description: '', points: 0 });
  };

  const handleRemoveCriterion = (id: string) => {
    setCriteria(criteria.filter(c => c.id !== id));
  };

  const handleSaveRubric = () => {
    if (criteria.length === 0) {
      toast({
        title: "Error",
        description: "Add at least one criterion to the rubric",
        variant: "destructive",
        id: ''
      });
      return;
    }

    onSave(criteria);
    toast({
      title: "Success",
      description: "Rubric saved successfully",
      id: ''
    });
  };

  const totalPoints = criteria.reduce((sum, criterion) => sum + criterion.points, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assignment Rubric</CardTitle>
        <CardDescription>Create a grading rubric for this assignment</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-5">
                <Label htmlFor="criterion-name">Criterion Name</Label>
                <Input
                  id="criterion-name"
                  value={newCriterion.name}
                  onChange={(e) => setNewCriterion({ ...newCriterion, name: e.target.value })}
                  placeholder="e.g., Content Quality"
                />
              </div>
              <div className="col-span-5">
                <Label htmlFor="criterion-description">Description</Label>
                <Input
                  id="criterion-description"
                  value={newCriterion.description}
                  onChange={(e) => setNewCriterion({ ...newCriterion, description: e.target.value })}
                  placeholder="e.g., Accuracy and depth of content"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="criterion-points">Points</Label>
                <Input
                  id="criterion-points"
                  type="number"
                  value={newCriterion.points}
                  onChange={(e) => setNewCriterion({ ...newCriterion, points: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>
            </div>
            <Button onClick={handleAddCriterion} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Criterion
            </Button>
          </div>

          {criteria.length > 0 && (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criterion</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criteria.map((criterion) => (
                    <TableRow key={criterion.id}>
                      <TableCell className="font-medium">{criterion.name}</TableCell>
                      <TableCell>{criterion.description}</TableCell>
                      <TableCell>{criterion.points}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveCriterion(criterion.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={2} className="text-right font-bold">Total Points:</TableCell>
                    <TableCell className="font-bold">{totalPoints}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Button onClick={handleSaveRubric}>
                Save Rubric
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}