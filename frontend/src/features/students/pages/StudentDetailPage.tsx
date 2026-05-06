import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { studentService } from '../../../services';

const StudentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const studentId = id ? parseInt(id, 10) : null;

  const { data: student, isLoading, error } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentService.getStudentById(studentId!),
    enabled: !!studentId,
  });

  if (isLoading) return <div>Loading student details...</div>;
  if (error) return <div>Error loading student: {(error as Error).message}</div>;
  if (!student) return <div>Student not found</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Student Details</h1>
        <button
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
          onClick={() => navigate(-1)}
        >
          Back to List
        </button>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
            <div className="space-y-3">
              <p><span className="font-medium">Name:</span> {student.name}</p>
              <p><span className="font-medium">Email:</span> {student.email}</p>
              <p><span className="font-medium">Admission Number:</span> {student.admission_number}</p>
              <p><span className="font-medium">Date of Birth:</span> {student.date_of_birth}</p>
              <p><span className="font-medium">Gender:</span> {student.gender}</p>
              {student.address && <p><span className="font-medium">Address:</span> {student.address}</p>}
              {student.phone && <p><span className="font-medium">Phone:</span> {student.phone}</p>}
            </div>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold mb-4">Academic Information</h2>
            <div className="space-y-3">
              <p><span className="font-medium">Status:</span> {student.status}</p>
              <p><span className="font-medium">Class ID:</span> {student.class_id || 'Not assigned'}</p>
              <p><span className="font-medium">Parent ID:</span> {student.parent_id || 'Not assigned'}</p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 flex space-x-4">
          <button 
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            onClick={() => navigate(`/students/${student.id}/edit`)}
          >
            Edit Student
          </button>
          <button 
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Delete Student
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentDetailPage;