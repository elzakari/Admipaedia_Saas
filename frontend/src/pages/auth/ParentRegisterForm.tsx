import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../services/authService';

interface ParentRegisterFormProps {
  onSuccess?: () => void;
}

const ParentRegisterForm: React.FC<ParentRegisterFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    occupation: '',
    address: '',
    emergencyContact: '',
    relationship: 'Parent',
  });
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await authService.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role: 'parent'
      });
      
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/login');
      }
    } catch (err) {
      const apiMessage = (err as any)?.response?.data?.message || (err as any)?.response?.data?.error;
      if (apiMessage) {
        if (typeof apiMessage === 'string') setError(apiMessage);
        else setError('Registration failed. Please check your input.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="username" className="block text-sm font-semibold text-slate-700 mb-1">
          Full Name
        </label>
        <input
          id="username"
          name="username"
          type="text"
          value={formData.username}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Enter your full name"
        />
      </div>
      
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Enter your email"
        />
      </div>
      
      <div>
        <label htmlFor="occupation" className="block text-sm font-semibold text-slate-700 mb-1">
          Occupation
        </label>
        <input
          id="occupation"
          name="occupation"
          type="text"
          value={formData.occupation}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Enter your occupation"
        />
      </div>
      
      <div>
        <label htmlFor="address" className="block text-sm font-semibold text-slate-700 mb-1">
          Address
        </label>
        <input
          id="address"
          name="address"
          type="text"
          value={formData.address}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Enter your address"
        />
      </div>
      
      <div>
        <label htmlFor="emergencyContact" className="block text-sm font-semibold text-slate-700 mb-1">
          Emergency Contact
        </label>
        <input
          id="emergencyContact"
          name="emergencyContact"
          type="text"
          value={formData.emergencyContact}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Enter emergency contact number"
        />
      </div>
      
      <div>
        <label htmlFor="relationship" className="block text-sm font-semibold text-slate-700 mb-1">
          Relationship to Student
        </label>
        <select
          id="relationship"
          name="relationship"
          value={formData.relationship}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="Parent">Parent</option>
          <option value="Father">Father</option>
          <option value="Mother">Mother</option>
          <option value="Guardian">Guardian</option>
          <option value="Other">Other</option>
        </select>
      </div>
      
      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Create a password"
        />
      </div>
      
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-1">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Confirm your password"
        />
      </div>
      
      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Creating account...' : 'Create Parent Account'}
        </button>
      </div>
    </form>
  );
};

export default ParentRegisterForm;
