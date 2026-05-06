import studentService from './studentService';
import classService from './classService';
import attendanceService from './attendanceService';
import subjectService from './subjectService';
import teacherService from './teacherService';
import examService from './examService';
import dashboardService from './dashboardService';
import authService from './authService';
import assignmentService from './assignmentService';
import announcementService from './announcementService';
import settingsService from './settingsService';
import userService from './userService';
import stemService from './stemService';
import assessmentService from './assessmentService';
import characterService from './characterService';
import educationalSystemService from './educationalSystemService';
import enhancedGradingService from './enhancedGradingService';
import saasService from './saasService';
import { User } from '../types/auth.types';

export * from './teacherService';

export {
  studentService,
  classService,
  attendanceService,
  subjectService,
  teacherService,
  examService,
  dashboardService,
  authService,
  assignmentService,
  announcementService,
  settingsService,
  userService,
  stemService,
  assessmentService,
  characterService,
  educationalSystemService,
  enhancedGradingService,
  saasService,
};

export type {
  User // Re-export User
};
