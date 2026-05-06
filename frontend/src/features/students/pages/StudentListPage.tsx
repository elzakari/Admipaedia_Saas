import React from 'react';
import { useNavigate } from 'react-router-dom';
import StudentList from '../StudentList';
import { Student } from '../../../services/studentService';

const StudentListPage: React.FC = () => {
  const navigate = useNavigate();

  const handleViewStudent = (student: Student) => {
    navigate(`/students/${student.id}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Student Management</h1>
        <button 
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          onClick={() => navigate('/students/new')}
        >
          Add Student
        </button>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <StudentList />
      </div>
    </div>
  );
};

export default StudentListPage;