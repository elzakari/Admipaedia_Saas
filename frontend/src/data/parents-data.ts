// Mock data for the Parents Portal

// Parent data with children information
export const parentData = {
  id: "P001",
  name: "John Smith",
  email: "john.smith@example.com",
  phone: "(+233) 555-7890",
  occupation: "Software Engineer",
  relationship: "father",
  address: "123 Main Street, Accra",
  children: [
    {
      id: "child1",
      name: "Emma Smith",
      photo: "/assets/avatars/child-1.svg",
      age: 12,
      gender: "Female",
      class: "7A",
      admissionNumber: "ADM-2022-001",
      dateOfBirth: "2012-05-15",
      bloodGroup: "A+",
      emergencyContact: "(+233) 555-7890",
      address: "123 Main Street, Accra",
      medicalConditions: ["Asthma", "Allergies: Peanuts"]
    },
    {
      id: "child2",
      name: "James Smith",
      photo: "/assets/avatars/child-2.svg",
      age: 10,
      gender: "Male",
      class: "5B",
      admissionNumber: "ADM-2022-002",
      dateOfBirth: "2014-08-22",
      bloodGroup: "O+",
      emergencyContact: "(+233) 555-7890",
      address: "123 Main Street, Accra",
      medicalConditions: []
    }
  ]
};

// Academic data for each child
export const academicData = {
  child1: {
    currentGrade: "7A",
    classTeacher: "Mrs. Johnson",
    overallGPA: 3.8,
    rank: "5th out of 32",
    attendance: 95,
    subjects: [
      { name: "Mathematics", grade: "A", score: 92, teacher: "Mr. Williams" },
      { name: "Science", grade: "A-", score: 88, teacher: "Mrs. Davis" },
      { name: "English", grade: "B+", score: 85, teacher: "Ms. Thompson" },
      { name: "Social Studies", grade: "A", score: 90, teacher: "Mr. Brown" },
      { name: "Art", grade: "A+", score: 95, teacher: "Mrs. Wilson" },
      { name: "Physical Education", grade: "A", score: 91, teacher: "Mr. Johnson" }
    ],
    recentExams: [
      { name: "Mid-Term Mathematics", date: "2023-10-15", score: 92, maxScore: 100 },
      { name: "Science Quiz", date: "2023-10-10", score: 45, maxScore: 50 },
      { name: "English Essay", date: "2023-10-05", score: 28, maxScore: 30 }
    ],
    upcomingExams: [
      { name: "Final Mathematics", date: "2023-12-10", time: "9:00 AM", venue: "Hall A" },
      { name: "Science Practical", date: "2023-12-12", time: "10:30 AM", venue: "Science Lab" },
      { name: "English Literature", date: "2023-12-15", time: "9:00 AM", venue: "Hall B" }
    ]
  },
  child2: {
    currentGrade: "5B",
    classTeacher: "Mr. Anderson",
    overallGPA: 3.9,
    rank: "2nd out of 30",
    attendance: 98,
    subjects: [
      { name: "Mathematics", grade: "A+", score: 96, teacher: "Mrs. Clark" },
      { name: "Science", grade: "A", score: 92, teacher: "Mr. Lewis" },
      { name: "English", grade: "A", score: 90, teacher: "Mrs. Walker" },
      { name: "Social Studies", grade: "A-", score: 88, teacher: "Ms. Young" },
      { name: "Art", grade: "A+", score: 97, teacher: "Mr. Hall" },
      { name: "Physical Education", grade: "A", score: 93, teacher: "Mrs. Adams" }
    ],
    recentExams: [
      { name: "Mid-Term Mathematics", date: "2023-10-15", score: 96, maxScore: 100 },
      { name: "Science Quiz", date: "2023-10-10", score: 48, maxScore: 50 },
      { name: "English Spelling", date: "2023-10-05", score: 29, maxScore: 30 }
    ],
    upcomingExams: [
      { name: "Final Mathematics", date: "2023-12-11", time: "9:00 AM", venue: "Hall C" },
      { name: "Science Project", date: "2023-12-13", time: "10:30 AM", venue: "Science Lab" },
      { name: "English Grammar", date: "2023-12-16", time: "9:00 AM", venue: "Hall D" }
    ]
  }
};

// Attendance data for each child
export const attendanceData = {
  child1: {
    present: 85,
    absent: 3,
    late: 2,
    excused: 1,
    attendancePercentage: 95,
    monthlyAttendance: [
      { month: "January", present: 20, absent: 1, late: 0 },
      { month: "February", present: 18, absent: 0, late: 2 },
      { month: "March", present: 21, absent: 0, late: 0 },
      { month: "April", present: 19, absent: 1, late: 0 },
      { month: "May", present: 20, absent: 0, late: 0 }
    ],
    recentAbsences: [
      { date: "2023-04-15", reason: "Sick", status: "Excused" },
      { date: "2023-02-10", reason: "Family Emergency", status: "Excused" },
      { date: "2023-01-05", reason: "Unknown", status: "Unexcused" }
    ]
  },
  child2: {
    present: 88,
    absent: 1,
    late: 1,
    excused: 1,
    attendancePercentage: 98,
    monthlyAttendance: [
      { month: "January", present: 21, absent: 0, late: 0 },
      { month: "February", present: 19, absent: 0, late: 1 },
      { month: "March", present: 21, absent: 0, late: 0 },
      { month: "April", present: 20, absent: 0, late: 0 },
      { month: "May", present: 19, absent: 1, late: 0 }
    ],
    recentAbsences: [
      { date: "2023-05-20", reason: "Doctor's Appointment", status: "Excused" }
    ]
  }
};

// Fee data for each child
export const feeData = {
  child1: {
    tuitionFee: 5000,
    transportFee: 1000,
    libraryFee: 500,
    computerLabFee: 800,
    activityFee: 700,
    totalFee: 8000,
    paid: 6000,
    due: 2000,
    dueDate: "2023-11-30",
    paymentHistory: [
      { id: "P001", date: "2023-09-01", amount: 4000, method: "Bank Transfer", status: "Completed" },
      { id: "P002", date: "2023-10-15", amount: 2000, method: "Credit Card", status: "Completed" }
    ],
    upcomingPayments: [
      { id: "UP001", dueDate: "2023-11-30", amount: 2000, description: "Remaining Tuition Fee" }
    ]
  },
  child2: {
    tuitionFee: 4500,
    transportFee: 1000,
    libraryFee: 500,
    computerLabFee: 800,
    activityFee: 700,
    totalFee: 7500,
    paid: 7500,
    due: 0,
    dueDate: "2023-11-30",
    paymentHistory: [
      { id: "P003", date: "2023-09-01", amount: 4000, method: "Bank Transfer", status: "Completed" },
      { id: "P004", date: "2023-10-15", amount: 3500, method: "Credit Card", status: "Completed" }
    ],
    upcomingPayments: []
  }
};

// Homework data for each child
export const homeworkData = {
  child1: [
    { id: "HW001", subject: "Mathematics", title: "Algebra Problems", assignedDate: "2023-10-20", dueDate: "2023-10-25", status: "Pending" },
    { id: "HW002", subject: "Science", title: "Ecosystem Project", assignedDate: "2023-10-18", dueDate: "2023-10-28", status: "In Progress" },
    { id: "HW003", subject: "English", title: "Book Report", assignedDate: "2023-10-15", dueDate: "2023-10-22", status: "Completed" }
  ],
  child2: [
    { id: "HW004", subject: "Mathematics", title: "Fractions Worksheet", assignedDate: "2023-10-19", dueDate: "2023-10-24", status: "Completed" },
    { id: "HW005", subject: "Science", title: "Plant Life Cycle", assignedDate: "2023-10-17", dueDate: "2023-10-27", status: "In Progress" },
    { id: "HW006", subject: "English", title: "Vocabulary Assignment", assignedDate: "2023-10-16", dueDate: "2023-10-23", status: "Completed" }
  ]
};

// Behavior data for each child
export const behaviorData = {
  child1: {
    overallBehavior: "Excellent",
    disciplinaryActions: 0,
    merits: 5,
    recentIncidents: [],
    teacherComments: [
      { date: "2023-10-15", teacher: "Mrs. Johnson", comment: "Emma is a model student who consistently demonstrates leadership in class." },
      { date: "2023-09-30", teacher: "Mr. Williams", comment: "Excellent participation in mathematics class discussions." }
    ]
  },
  child2: {
    overallBehavior: "Very Good",
    disciplinaryActions: 1,
    merits: 4,
    recentIncidents: [
      { date: "2023-09-10", description: "Talking during quiet reading time", action: "Verbal warning", teacher: "Mr. Anderson" }
    ],
    teacherComments: [
      { date: "2023-10-12", teacher: "Mr. Anderson", comment: "James is showing great improvement in following classroom rules." },
      { date: "2023-09-25", teacher: "Mrs. Clark", comment: "Demonstrates excellent problem-solving skills in mathematics." }
    ]
  }
};

// Messages data
export const messagesData = [
  { id: "M001", from: "Mrs. Johnson", subject: "Weekly Class Update", date: "2023-10-18", time: "14:30", read: true, content: "Dear Parent, This week in class 7A we covered chapters 5-6 in Mathematics and completed our Science project on ecosystems. Please ensure Emma completes her homework by Friday. Best regards, Mrs. Johnson" },
  { id: "M002", from: "Principal Adams", subject: "Upcoming Parent-Teacher Meeting", date: "2023-10-17", time: "09:15", read: true, content: "Dear Parents, We will be holding our quarterly parent-teacher meetings on November 5th from 2:00 PM to 6:00 PM. Please schedule your appointment through the school portal. Regards, Principal Adams" },
  { id: "M003", from: "Mr. Williams", subject: "Mathematics Performance", date: "2023-10-15", time: "11:45", read: false, content: "Dear Mr. Smith, I wanted to commend Emma on her excellent performance in the recent mathematics test. She scored 92%, which is among the top scores in the class. Keep up the good work! Regards, Mr. Williams" },
  { id: "M004", from: "Mr. Anderson", subject: "Behavior Improvement", date: "2023-10-12", time: "15:20", read: false, content: "Dear Mr. Smith, I'm pleased to inform you that James has shown significant improvement in his classroom behavior this month. He is more attentive and participates actively in discussions. Regards, Mr. Anderson" },
  { id: "M005", from: "School Nurse", subject: "Health Check-up Reminder", date: "2023-10-10", time: "10:05", read: true, content: "Dear Parents, This is a reminder that the annual health check-up for students will be conducted next week. Please ensure your children are prepared and have their health cards with them. Regards, School Nurse" }
];

// School events data
export const schoolEvents = [
  { id: "E001", title: "Annual Sports Day", date: "2023-11-15", time: "09:00 - 16:00", location: "School Grounds", description: "A day of athletic competitions and team sports for all grades." },
  { id: "E002", title: "Parent-Teacher Meeting", date: "2023-11-05", time: "14:00 - 18:00", location: "School Auditorium", description: "Quarterly meeting to discuss student progress and address parent concerns." },
  { id: "E003", title: "Science Fair", date: "2023-11-20", time: "10:00 - 15:00", location: "School Hall", description: "Students will present their science projects to judges and visitors." },
  { id: "E004", title: "Cultural Day Celebration", date: "2023-12-05", time: "13:00 - 17:00", location: "School Auditorium", description: "A celebration of diverse cultures with performances, food, and traditional attire." },
  { id: "E005", title: "End of Term Ceremony", date: "2023-12-15", time: "10:00 - 12:00", location: "School Grounds", description: "Ceremony to mark the end of the term with awards and recognitions." }
];
