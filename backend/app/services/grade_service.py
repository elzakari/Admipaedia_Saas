from app.models.grade import Grade
from app.models.exam import Exam
from app.models.student import Student
from app.extensions import db
from sqlalchemy import and_, or_, func
from app.services.cache_service import get_cache_service
from app.schemas.grade import GradeSchema

cache_service = get_cache_service()
grade_schema = GradeSchema()

class GradeService:
    @staticmethod
    def get_all_grades(page, per_page, student_id=None, exam_id=None, min_percentage=None, max_percentage=None, grade_letter=None):
        """Get all grades with optional filtering."""
        from sqlalchemy.orm import joinedload
        
        query = Grade.query.options(
            joinedload(Grade.student).joinedload(Student.user),
            joinedload(Grade.exam).joinedload(Exam.subject),
            joinedload(Grade.exam).joinedload(Exam.class_)
        )
        
        # Apply filters if provided
        if student_id:
            query = query.filter(Grade.student_id == student_id)
        if exam_id:
            query = query.filter(Grade.exam_id == exam_id)
        if min_percentage is not None:
            query = query.filter(Grade.percentage >= min_percentage)
        if max_percentage is not None:
            query = query.filter(Grade.percentage <= max_percentage)
        if grade_letter:
            query = query.filter(Grade.grade_letter == grade_letter)
        
        # Order by exam date (most recent first)
        query = query.join(Exam).order_by(Exam.exam_date.desc())
        
        # Paginate results
        return query.paginate(page=page, per_page=per_page, error_out=False)
    
    @staticmethod
    def get_grade_by_id(grade_id):
        """Get a specific grade by ID."""
        from sqlalchemy.orm import joinedload
        
        # Try to get DTO from cache first
        cache_key = f"grade:dto:{grade_id}"
        cached_grade = cache_service.get(cache_key)
        if cached_grade:
            return cached_grade
        
        # If not in cache, query database
        grade = Grade.query.options(
            joinedload(Grade.student).joinedload(Student.user),
            joinedload(Grade.exam).joinedload(Exam.subject),
            joinedload(Grade.exam).joinedload(Exam.class_)
        ).get(grade_id)
        
        # Cache the result if found (as DTO)
        if grade:
            cache_service.set(cache_key, grade_schema.dump(grade), ttl=cache_service.SHORT_TTL)
        
        return grade
    
    @staticmethod
    def get_student_grades(student_id, page, per_page):
        """Get all grades for a specific student."""
        from sqlalchemy.orm import joinedload
        
        query = Grade.query.options(
            joinedload(Grade.student).joinedload(Student.user),
            joinedload(Grade.exam).joinedload(Exam.subject),
            joinedload(Grade.exam).joinedload(Exam.class_)
        ).filter(Grade.student_id == student_id)
        query = query.join(Exam).order_by(Exam.exam_date.desc())
        return query.paginate(page=page, per_page=per_page, error_out=False)
    
    @staticmethod
    def get_exam_grades(exam_id, page, per_page):
        """Get all grades for a specific exam."""
        from sqlalchemy.orm import joinedload
        
        query = Grade.query.options(
            joinedload(Grade.student).joinedload(Student.user),
            joinedload(Grade.exam).joinedload(Exam.subject),
            joinedload(Grade.exam).joinedload(Exam.class_)
        ).filter(Grade.exam_id == exam_id)
        query = query.join(Student).order_by(Student.last_name.asc(), Student.first_name.asc())
        return query.paginate(page=page, per_page=per_page, error_out=False)
    
    @staticmethod
    def create_grade(data):
        """Create a new grade."""
        # Verify that student and exam exist
        student = Student.query.get(data['student_id'])
        exam = Exam.query.get(data['exam_id'])
        
        if not student:
            return None, "Student not found"
        if not exam:
            return None, "Exam not found"
        
        # Check if a grade already exists for this student and exam
        existing_grade = Grade.query.filter(
            and_(Grade.student_id == data['student_id'], Grade.exam_id == data['exam_id'])
        ).first()
        
        if existing_grade:
            return None, "A grade already exists for this student and exam"
        
        # Create new grade
        grade = Grade(
            student_id=data['student_id'],
            exam_id=data['exam_id'],
            marks_obtained=data['marks_obtained'],
            percentage=data.get('percentage'),
            grade_letter=data.get('grade_letter'),
            remarks=data.get('remarks'),
            graded_by=data['graded_by']
        )
        
        try:
            db.session.add(grade)
            db.session.commit()
            cache_service.delete(f"grade:dto:{grade.id}")
            return grade, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)
    
    @staticmethod
    def update_grade(grade_id, data):
        """Update an existing grade."""
        grade = Grade.query.get(grade_id)
        
        if not grade:
            return None, "Grade not found"
        
        # Update fields if provided
        if 'marks_obtained' in data:
            grade.marks_obtained = data['marks_obtained']
            # Recalculate percentage
            exam = Exam.query.get(grade.exam_id)
            if exam:
                percentage = (data['marks_obtained'] / exam.total_marks) * 100
                grade.percentage = round(percentage, 2)
                
                # Update grade letter based on percentage
                if percentage >= 90:
                    grade.grade_letter = 'A+'
                elif percentage >= 80:
                    grade.grade_letter = 'A'
                elif percentage >= 70:
                    grade.grade_letter = 'B+'
                elif percentage >= 60:
                    grade.grade_letter = 'B'
                elif percentage >= 50:
                    grade.grade_letter = 'C+'
                elif percentage >= 40:
                    grade.grade_letter = 'C'
                else:
                    grade.grade_letter = 'F'
        
        if 'remarks' in data:
            grade.remarks = data['remarks']
        
        try:
            db.session.commit()
            cache_service.delete(f"grade:dto:{grade_id}")
            return grade, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)
    
    @staticmethod
    def delete_grade(grade_id):
        """Delete a grade."""
        grade = Grade.query.get(grade_id)
        
        if not grade:
            return False, "Grade not found"
        
        try:
            db.session.delete(grade)
            db.session.commit()
            cache_service.delete(f"grade:dto:{grade_id}")
            return True, None
        except Exception as e:
            db.session.rollback()
            return False, str(e)
    
    @staticmethod
    def get_class_performance(class_id):
        """Get performance statistics for a class."""
        from app.models.student import Student
        
        # Get all exams for the class
        exams = Exam.query.filter(Exam.class_id == class_id).all()
        exam_ids = [exam.id for exam in exams]
        
        if not exam_ids:
            return None, "No exams found for this class"
        
        # Get all students in the class
        students = Student.query.filter(Student.class_id == class_id).all()
        student_ids = [student.id for student in students]
        
        if not student_ids:
            return None, "No students found in this class"
        
        # Get all grades for these students and exams
        grades = Grade.query.filter(
            and_(Grade.student_id.in_(student_ids), Grade.exam_id.in_(exam_ids))
        ).all()
        
        # Calculate statistics
        total_students = len(students)
        total_exams = len(exams)
        total_grades = len(grades)
        
        if total_grades == 0:
            return {
                'class_id': class_id,
                'total_students': total_students,
                'total_exams': total_exams,
                'total_grades': 0,
                'average_percentage': 0,
                'highest_percentage': 0,
                'lowest_percentage': 0,
                'pass_rate': 0,
                'grade_distribution': {
                    'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'F': 0
                }
            }, None
        
        # Calculate average, highest, and lowest percentages
        percentages = [grade.percentage for grade in grades]
        average_percentage = sum(percentages) / len(percentages)
        highest_percentage = max(percentages)
        lowest_percentage = min(percentages)
        
        # Calculate pass rate
        passing_grades = [grade for grade in grades if grade.percentage >= 40]  # Assuming 40% is passing
        pass_rate = (len(passing_grades) / total_grades) * 100
        
        # Calculate grade distribution
        grade_distribution = {
            'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'F': 0
        }
        
        for grade in grades:
            if grade.grade_letter in grade_distribution:
                grade_distribution[grade.grade_letter] += 1
        
        # Convert counts to percentages
        for letter in grade_distribution:
            grade_distribution[letter] = (grade_distribution[letter] / total_grades) * 100
        
        # Prepare result
        result = {
            'class_id': class_id,
            'total_students': total_students,
            'total_exams': total_exams,
            'total_grades': total_grades,
            'average_percentage': round(average_percentage, 2),
            'highest_percentage': round(highest_percentage, 2),
            'lowest_percentage': round(lowest_percentage, 2),
            'pass_rate': round(pass_rate, 2),
            'grade_distribution': grade_distribution
        }
        
        return result, None
    
    @staticmethod
    def calculate_final_grades(student_id=None, class_id=None, subject_id=None, term=None, academic_year=None):
        """Calculate final grades based on weighted assessments."""
        try:
            # Build query to get all relevant grades
            query = Grade.query
            
            if student_id:
                query = query.filter(Grade.student_id == student_id)
            
            if class_id:
                query = query.filter(Grade.class_id == class_id)
            
            if subject_id:
                query = query.filter(Grade.subject_id == subject_id)
            
            if term:
                query = query.filter(Grade.term == term)
            
            if academic_year:
                query = query.filter(Grade.academic_year == academic_year)
            
            # Exclude existing final grades
            query = query.filter(Grade.is_final == False)
            
            # Group grades by student, subject, class, term, and academic year
            grades = query.all()
            grouped_grades = {}
            
            for grade in grades:
                key = (grade.student_id, grade.subject_id, grade.class_id, grade.term, grade.academic_year)
                if key not in grouped_grades:
                    grouped_grades[key] = []
                grouped_grades[key].append(grade)
            
            # Calculate final grades for each group
            final_grades = []
            
            for key, group_grades in grouped_grades.items():
                student_id, subject_id, class_id, term, academic_year = key
                
                # Skip if any key component is None
                if None in (student_id, subject_id, class_id, term, academic_year):
                    continue
                
                # Calculate weighted average
                total_weight = sum(grade.weight for grade in group_grades)
                weighted_sum = sum(grade.percentage * grade.weight for grade in group_grades)
                
                if total_weight > 0:
                    final_percentage = weighted_sum / total_weight
                else:
                    final_percentage = 0
                
                # Get exam for reference (use the first one)
                exam_id = group_grades[0].exam_id if group_grades else None
                
                # Determine grade letter based on percentage
                grade_letter = GradeService.get_grade_letter(final_percentage)
                
                # Create final grade record
                final_grade = Grade(
                    student_id=student_id,
                    subject_id=subject_id,
                    class_id=class_id,
                    term=term,
                    academic_year=academic_year,
                    exam_id=exam_id,  # Reference to original exam
                    marks_obtained=final_percentage,  # Use percentage as marks for final grade
                    percentage=final_percentage,
                    grade_letter=grade_letter,
                    remarks="Final calculated grade",
                    graded_by=group_grades[0].graded_by if group_grades else None,
                    is_final=True,
                    weight=1.0  # Final grades have weight of 1.0
                )
                
                db.session.add(final_grade)
                final_grades.append(final_grade)
            
            db.session.commit()
            
            return final_grades, None
        
        except Exception as e:
            db.session.rollback()
            logger.error("Error calculating final grades", error=str(e))
            return None, f"Failed to calculate final grades: {str(e)}"
    
    @staticmethod
    def get_grade_letter(percentage):
        """Determine grade letter based on percentage."""
        if percentage >= 90:
            return "A+"
        elif percentage >= 80:
            return "A"
        elif percentage >= 75:
            return "B+"
        elif percentage >= 70:
            return "B"
        elif percentage >= 65:
            return "C+"
        elif percentage >= 60:
            return "C"
        elif percentage >= 50:
            return "D"
        else:
            return "F"
    
    @staticmethod
    def get_student_grade_report(student_id, subject_id=None, class_id=None, term=None, academic_year=None):
        """Generate a comprehensive grade report for a student."""
        try:
            # Build query
            query = Grade.query.filter(Grade.student_id == student_id)
            
            if subject_id:
                query = query.filter(Grade.subject_id == subject_id)
            
            if class_id:
                query = query.filter(Grade.class_id == class_id)
            
            if term:
                query = query.filter(Grade.term == term)
            
            if academic_year:
                query = query.filter(Grade.academic_year == academic_year)
            
            # Get all grades
            grades = query.all()
            
            # Group grades by subject
            subjects = {}
            for grade in grades:
                if grade.subject_id not in subjects:
                    subjects[grade.subject_id] = []
                subjects[grade.subject_id].append(grade)
            
            # Calculate statistics for each subject
            subject_reports = []
            for subject_id, subject_grades in subjects.items():
                # Get subject name
                subject_name = "Unknown"
                if subject_id and subject_grades[0].subject:
                    subject_name = subject_grades[0].subject.name
                
                # Separate final and non-final grades
                final_grades = [g for g in subject_grades if g.is_final]
                assessment_grades = [g for g in subject_grades if not g.is_final]
                
                # Calculate average for non-final grades
                assessment_average = 0
                if assessment_grades:
                    assessment_average = sum(g.percentage for g in assessment_grades) / len(assessment_grades)
                
                # Get final grade if available
                final_grade = final_grades[0] if final_grades else None
                
                subject_reports.append({
                    'subject_id': subject_id,
                    'subject_name': subject_name,
                    'assessments': [
                        {
                            'id': g.id,
                            'exam_id': g.exam_id,
                            'assessment_type': g.assessment_type,
                            'marks_obtained': g.marks_obtained,
                            'percentage': g.percentage,
                            'grade_letter': g.grade_letter,
                            'weight': g.weight,
                            'date': g.created_at.isoformat()
                        }
                        for g in assessment_grades
                    ],
                    'assessment_average': round(assessment_average, 2),
                    'final_grade': {
                        'id': final_grade.id,
                        'percentage': final_grade.percentage,
                        'grade_letter': final_grade.grade_letter,
                        'date': final_grade.created_at.isoformat()
                    } if final_grade else None
                })
            
            # Calculate overall statistics
            all_percentages = [g.percentage for g in grades]
            overall_average = sum(all_percentages) / len(all_percentages) if all_percentages else 0
            
            # Get final grades only
            final_grades = [g for g in grades if g.is_final]
            final_average = sum(g.percentage for g in final_grades) / len(final_grades) if final_grades else 0
            
            report = {
                'student_id': student_id,
                'class_id': class_id,
                'term': term,
                'academic_year': academic_year,
                'overall_average': round(overall_average, 2),
                'final_average': round(final_average, 2),
                'overall_grade': GradeService.get_grade_letter(overall_average),
                'final_grade': GradeService.get_grade_letter(final_average),
                'subjects': subject_reports,
                'generated_at': datetime.now().isoformat()
            }
            
            return report, None
        
        except Exception as e:
            logger.error("Error generating student grade report", error=str(e))
            return None, f"Failed to generate grade report: {str(e)}"
    
    # Add this method to the GradeService class
    @staticmethod
    def bulk_import_grades(file_path, update_existing=False):
        """Import grades from CSV/Excel file with option to update existing records."""
        try:
            import pandas as pd
            import os
            from flask import current_app
            from datetime import datetime
            from app.models.student import Student
            from app.models.subject import Subject
            from app.models.exam import Exam
            
            # Read file based on extension
            if file_path.endswith('.csv'):
                df = pd.read_csv(file_path)
            elif file_path.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file_path)
            else:
                return None, "Unsupported file format. Use CSV or Excel files."
            
            # Validate required columns
            required_columns = ['student_id', 'subject_id', 'class_id', 'term', 'academic_year', 'assessment_type', 'marks_obtained']
            
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                return None, f"Missing required columns: {', '.join(missing_columns)}"
            
            successful_imports = []
            failed_imports = []
            updated_records = []
            
            for index, row in df.iterrows():
                try:
                    # Check if student exists
                    student = Student.query.get(row['student_id'])
                    if not student:
                        failed_imports.append({
                            'row': index + 1,
                            'student_id': row['student_id'],
                            'error': "Student not found"
                        })
                        continue
                    
                    # Check if subject exists
                    subject = Subject.query.get(row['subject_id'])
                    if not subject:
                        failed_imports.append({
                            'row': index + 1,
                            'student_id': row['student_id'],
                            'error': "Subject not found"
                        })
                        continue
                    
                    # Check if a grade already exists for this student, subject, term, and academic year
                    existing_grade = Grade.query.filter(
                        Grade.student_id == row['student_id'],
                        Grade.subject_id == row['subject_id'],
                        Grade.class_id == row['class_id'],
                        Grade.term == row['term'],
                        Grade.academic_year == row['academic_year'],
                        Grade.assessment_type == row['assessment_type']
                    ).first()
                    
                    if existing_grade and update_existing:
                        # Update existing grade
                        existing_grade.marks_obtained = float(row['marks_obtained'])
                        
                        # Recalculate percentage and grade letter
                        max_score = float(row.get('max_score', 100))
                        percentage = (existing_grade.marks_obtained / max_score) * 100
                        existing_grade.percentage = round(percentage, 2)
                        existing_grade.grade_letter = GradeService.get_grade_letter(percentage)
                        
                        if 'remarks' in df.columns and pd.notna(row['remarks']):
                            existing_grade.remarks = str(row['remarks'])
                        
                        db.session.commit()
                        updated_records.append({
                            'row': index + 1,
                            'grade_id': existing_grade.id,
                            'student_id': existing_grade.student_id
                        })
                        continue
                    elif existing_grade and not update_existing:
                        failed_imports.append({
                            'row': index + 1,
                            'student_id': row['student_id'],
                            'error': "Grade already exists and update_existing is False"
                        })
                        continue
                    
                    # Prepare grade data for new grade
                    max_score = float(row.get('max_score', 100))
                    marks_obtained = float(row['marks_obtained'])
                    percentage = (marks_obtained / max_score) * 100
                    grade_letter = GradeService.get_grade_letter(percentage)
                    
                    grade_data = {
                        'student_id': int(row['student_id']),
                        'subject_id': int(row['subject_id']),
                        'class_id': int(row['class_id']),
                        'term': str(row['term']),
                        'academic_year': str(row['academic_year']),
                        'assessment_type': str(row['assessment_type']),
                        'marks_obtained': marks_obtained,
                        'percentage': round(percentage, 2),
                        'grade_letter': grade_letter,
                        'graded_by': int(row.get('graded_by', 1))  # Default to admin user if not specified
                    }
                    
                    # Add optional fields if present
                    if 'remarks' in df.columns and pd.notna(row['remarks']):
                        grade_data['remarks'] = str(row['remarks'])
                    
                    if 'exam_id' in df.columns and pd.notna(row['exam_id']):
                        grade_data['exam_id'] = int(row['exam_id'])
                    else:
                        # Create a default exam if not provided
                        exam_title = f"{row['assessment_type']} - {row['subject_id']} - {row['term']} - {row['academic_year']}"
                        exam = Exam.query.filter_by(title=exam_title).first()
                        if not exam:
                            exam = Exam(
                                title=exam_title,
                                subject_id=int(row['subject_id']),
                                class_id=int(row['class_id']),
                                exam_date=datetime.now(),
                                total_marks=max_score,
                                created_by=int(row.get('graded_by', 1))
                            )
                            db.session.add(exam)
                            db.session.flush()  # Get the ID without committing
                        
                        grade_data['exam_id'] = exam.id
                    
                    # Create new grade
                    grade = Grade(**grade_data)
                    db.session.add(grade)
                    db.session.flush()  # Get the ID without committing
                    
                    successful_imports.append({
                        'row': index + 1,
                        'grade_id': grade.id,
                        'student_id': grade.student_id
                    })
                    
                except Exception as e:
                    failed_imports.append({
                        'row': index + 1,
                        'student_id': row.get('student_id', 'Unknown'),
                        'error': str(e)
                    })
            
            # Commit all changes
            db.session.commit()
            
            result = {
                'successful_count': len(successful_imports),
                'failed_count': len(failed_imports),
                'updated_count': len(updated_records),
                'successful_imports': successful_imports,
                'failed_imports': failed_imports,
                'updated_records': updated_records
            }
            
            return result, None
            
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to import grades: {str(e)}"


    @staticmethod
    def export_grades(format='csv', class_id=None, subject_id=None, term=None, academic_year=None, assessment_type=None):
        """Export grades to CSV or Excel format with optional filtering."""
        try:
            import pandas as pd
            import os
            from flask import current_app
            from datetime import datetime
            
            # Build query with filters
            query = Grade.query
            
            if class_id:
                query = query.filter(Grade.class_id == class_id)
                
            if subject_id:
                query = query.filter(Grade.subject_id == subject_id)
                
            if term:
                query = query.filter(Grade.term == term)
                
            if academic_year:
                query = query.filter(Grade.academic_year == academic_year)
                
            if assessment_type:
                query = query.filter(Grade.assessment_type == assessment_type)
                
            grades = query.all()
            
            if not grades:
                return None, "No grades found matching the criteria"
                
            # Create a DataFrame from grade data
            data = []
            for grade in grades:
                student = Student.query.get(grade.student_id)
                if not student:
                    continue
                    
                grade_data = {
                    'student_id': grade.student_id,
                    'student_name': f"{student.first_name} {student.last_name}",
                    'subject_id': grade.subject_id,
                    'class_id': grade.class_id,
                    'term': grade.term,
                    'academic_year': grade.academic_year,
                    'assessment_type': grade.assessment_type,
                    'score': grade.score,
                    'max_score': grade.max_score,
                    'percentage': grade.percentage,
                    'grade_letter': grade.grade_letter,
                    'remarks': grade.remarks
                }
                data.append(grade_data)
                
            df = pd.DataFrame(data)
            
            # Generate filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            if format.lower() == 'csv':
                filename = f"grades_export_{timestamp}.csv"
                file_path = os.path.join(current_app.root_path, 'exports', filename)
                
                # Create directory if it doesn't exist
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                
                # Save to CSV
                df.to_csv(file_path, index=False)
                
            elif format.lower() == 'excel':
                filename = f"grades_export_{timestamp}.xlsx"
                file_path = os.path.join(current_app.root_path, 'exports', filename)
                
                # Create directory if it doesn't exist
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                
                # Save to Excel
                df.to_excel(file_path, index=False)
                
            else:
                return None, "Unsupported format. Use 'csv' or 'excel'."
                
            return file_path, None
            
        except Exception as e:
            return None, f"Failed to export grades: {str(e)}"
