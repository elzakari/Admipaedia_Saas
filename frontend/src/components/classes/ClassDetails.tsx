import React from 'react';
import { useClass } from '../../hooks/useClasses';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

interface ClassDetailsProps {
  classId: number;
}

export function ClassDetails({ classId }: ClassDetailsProps) {
  const { data: classData, isLoading, isError } = useClass(classId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !classData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>Failed to load class details</CardDescription>
        </CardHeader>
        <CardContent>
          <p>There was an error loading the class details. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{classData.name}</CardTitle>
        <CardDescription>Grade {classData.grade_level} - Section {classData.section}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold">Academic Year</h3>
            <p>{classData.academic_year}</p>
          </div>
          <div>
            <h3 className="font-semibold">Capacity</h3>
            <p>{classData.capacity} students</p>
          </div>
          <div>
            <h3 className="font-semibold">Schedule</h3>
            <p>{classData.days || 'Not specified'}</p>
            <p>{classData.start_time && classData.end_time ? `${classData.start_time} - ${classData.end_time}` : 'Time not specified'}</p>
          </div>
          <div>
            <h3 className="font-semibold">Room</h3>
            <p>{classData.room || 'Not assigned'}</p>
          </div>
        </div>
        
        <div>
          <h3 className="font-semibold">Description</h3>
          <p>{classData.description || 'No description provided'}</p>
        </div>
      </CardContent>
    </Card>
  );
}