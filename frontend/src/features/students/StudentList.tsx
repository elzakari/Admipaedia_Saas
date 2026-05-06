import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { studentService } from '../../services';
import { Student } from '../../services/studentService';

interface StudentListProps {
  classId?: number;
}

const StudentList: React.FC<StudentListProps> = ({ classId }) => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['students', { classId }],
    queryFn: () => studentService.getStudents({ class_id: classId }),
  });

  const handleViewStudent = (studentId: number) => {
    navigate(`/students/${studentId}`);
  };

  if (isLoading) return <div>Loading students...</div>;
  if (error) return <div>Error loading students: {(error as Error).message}</div>;

  return (
    <div className="student-list">
      <h2 className="text-xl font-semibold mb-4">Students</h2>
      
      {data?.students.length === 0 ? (
        <p>No students found.</p>
      ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admission Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.students.map((student: Student) => (
              <tr key={student.id}>
                <td 
                  className="px-6 py-4 whitespace-nowrap cursor-pointer hover:text-indigo-600" 
                  onClick={() => handleViewStudent(student.id)}
                >
                  {student.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{student.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">{student.admission_number}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button 
                    className="text-indigo-600 hover:text-indigo-900 mr-2"
                    onClick={() => handleViewStudent(student.id)}
                  >
                    View
                  </button>
                  <button className="text-indigo-600 hover:text-indigo-900 mr-2">Edit</button>
                  <button className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default StudentList;