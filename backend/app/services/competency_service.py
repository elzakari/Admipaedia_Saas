from typing import List, Dict, Optional
from datetime import datetime, date
from sqlalchemy import and_, or_, func
from app.extensions import db
from app.models.educational_level import CoreCompetency, StudentCompetencyAssessment
from app.models.competency_framework import (
    CompetencyIndicator, StudentCompetencyProfile, CompetencyEvidence,
    CompetencyLearningActivity, CompetencyDomain, ProficiencyLevel
)
from app.models.student import Student
from app.models.class_ import Class

class CompetencyService:
    """Service for managing student competency assessments and tracking"""
    
    @staticmethod
    def assess_student_competency(
        student_id: int,
        competency_id: int,
        indicator_ids: List[int],
        proficiency_levels: List[ProficiencyLevel],
        evidence_items: List[Dict],
        assessor_id: int,
        term: str,
        academic_year: str,
        comments: Optional[str] = None
    ) -> StudentCompetencyAssessment:
        """Create a comprehensive competency assessment for a student"""
        
        # Calculate average proficiency level
        level_values = [level.value for level in proficiency_levels]
        level_mapping = {
            ProficiencyLevel.BEGINNING: 1,
            ProficiencyLevel.DEVELOPING: 2,
            ProficiencyLevel.PROFICIENT: 3,
            ProficiencyLevel.EXCELLENT: 4
        }
        
        numeric_levels = [level_mapping[level] for level in proficiency_levels]
        average_level = sum(numeric_levels) / len(numeric_levels)
        
        # Create assessment record
        assessment = StudentCompetencyAssessment(
            student_id=student_id,
            competency_id=competency_id,
            assessment_date=date.today(),
            term=term,
            academic_year=academic_year,
            level_achieved=int(round(average_level)),
            teacher_comments=comments,
            assessed_by=assessor_id
        )
        
        db.session.add(assessment)
        db.session.flush()  # Get assessment ID
        
        # Add evidence items
        for i, evidence_data in enumerate(evidence_items):
            evidence = CompetencyEvidence(
                assessment_id=assessment.id,
                indicator_id=indicator_ids[i],
                evidence_type=evidence_data.get('type', 'observation'),
                evidence_title=evidence_data.get('title', ''),
                evidence_description=evidence_data.get('description'),
                proficiency_demonstrated=proficiency_levels[i],
                observer_notes=evidence_data.get('notes'),
                subject_context=evidence_data.get('subject'),
                activity_context=evidence_data.get('activity'),
                collaboration_involved=evidence_data.get('collaboration', False),
                collected_date=date.today(),
                collected_by=assessor_id
            )
            db.session.add(evidence)
        
        db.session.commit()
        return assessment
    
    @staticmethod
    def update_student_competency_profile(
        student_id: int,
        academic_year: str,
        updater_id: int
    ) -> StudentCompetencyProfile:
        """Update or create student's overall competency profile"""
        
        # Get or create profile
        profile = StudentCompetencyProfile.query.filter_by(
            student_id=student_id,
            academic_year=academic_year
        ).first()
        
        if not profile:
            profile = StudentCompetencyProfile(
                student_id=student_id,
                academic_year=academic_year,
                updated_by=updater_id
            )
            db.session.add(profile)
        
        # Calculate domain scores from recent assessments
        domain_scores = CompetencyService._calculate_domain_scores(
            student_id, academic_year
        )
        
        # Update profile scores
        profile.communication_collaboration_score = domain_scores.get(
            CompetencyDomain.COMMUNICATION_COLLABORATION
        )
        profile.critical_thinking_score = domain_scores.get(
            CompetencyDomain.CRITICAL_THINKING_PROBLEM_SOLVING
        )
        profile.creativity_innovation_score = domain_scores.get(
            CompetencyDomain.CREATIVITY_INNOVATION
        )
        profile.cultural_identity_score = domain_scores.get(
            CompetencyDomain.CULTURAL_IDENTITY_GLOBAL_CITIZENSHIP
        )
        profile.personal_development_score = domain_scores.get(
            CompetencyDomain.PERSONAL_DEVELOPMENT_LEADERSHIP
        )
        profile.digital_literacy_score = domain_scores.get(
            CompetencyDomain.DIGITAL_LITERACY
        )
        
        # Calculate overall score and level
        profile.calculate_overall_score()
        
        # Generate recommendations
        profile.strengths = CompetencyService._identify_strengths(domain_scores)
        profile.areas_for_improvement = CompetencyService._identify_improvement_areas(domain_scores)
        profile.recommended_activities = CompetencyService._recommend_activities(
            student_id, domain_scores
        )
        
        profile.updated_by = updater_id
        db.session.commit()
        
        return profile
    
    @staticmethod
    def _calculate_domain_scores(
        student_id: int, 
        academic_year: str
    ) -> Dict[CompetencyDomain, float]:
        """Calculate average scores for each competency domain"""
        
        domain_scores = {}
        
        for domain in CompetencyDomain:
            # Get competencies for this domain
            competencies = CoreCompetency.query.join(
                CompetencyIndicator
            ).filter(
                CompetencyIndicator.domain == domain
            ).distinct().all()
            
            if not competencies:
                continue
            
            # Get recent assessments for these competencies
            assessments = StudentCompetencyAssessment.query.filter(
                and_(
                    StudentCompetencyAssessment.student_id == student_id,
                    StudentCompetencyAssessment.academic_year == academic_year,
                    StudentCompetencyAssessment.competency_id.in_(
                        [comp.id for comp in competencies]
                    )
                )
            ).all()
            
            if assessments:
                avg_score = sum(assessment.level_achieved for assessment in assessments) / len(assessments)
                domain_scores[domain] = avg_score
        
        return domain_scores
    
    @staticmethod
    def _identify_strengths(domain_scores: Dict[CompetencyDomain, float]) -> List[str]:
        """Identify student's strength areas"""
        strengths = []
        
        for domain, score in domain_scores.items():
            if score and score >= 3.0:  # Proficient or above
                strengths.append(domain.value.replace('_', ' ').title())
        
        return strengths
    
    @staticmethod
    def _identify_improvement_areas(domain_scores: Dict[CompetencyDomain, float]) -> List[str]:
        """Identify areas needing improvement"""
        improvement_areas = []
        
        for domain, score in domain_scores.items():
            if score and score < 2.5:  # Below proficient
                improvement_areas.append(domain.value.replace('_', ' ').title())
        
        return improvement_areas
    
    @staticmethod
    def _recommend_activities(
        student_id: int, 
        domain_scores: Dict[CompetencyDomain, float]
    ) -> List[Dict]:
        """Recommend learning activities based on competency gaps"""
        
        student = Student.query.get(student_id)
        if not student or not student.class_:
            return []
        
        educational_level_id = student.class_.educational_level_id
        recommendations = []
        
        # Find activities for improvement areas
        for domain, score in domain_scores.items():
            if score and score < 3.0:  # Below proficient
                activities = CompetencyLearningActivity.query.filter(
                    and_(
                        CompetencyLearningActivity.primary_domain == domain,
                        CompetencyLearningActivity.is_active == True,
                        func.json_contains(
                            CompetencyLearningActivity.suitable_educational_levels,
                            str(educational_level_id)
                        )
                    )
                ).limit(3).all()
                
                for activity in activities:
                    recommendations.append({
                        'activity_id': activity.id,
                        'activity_name': activity.activity_name,
                        'domain': domain.value,
                        'description': activity.activity_description,
                        'duration': activity.duration_minutes
                    })
        
        return recommendations
    
    @staticmethod
    def get_class_competency_overview(
        class_id: int, 
        academic_year: str
    ) -> Dict:
        """Get competency overview for entire class"""
        
        students = Student.query.filter_by(class_id=class_id).all()
        
        class_overview = {
            'total_students': len(students),
            'assessed_students': 0,
            'domain_averages': {},
            'proficiency_distribution': {
                'excellent': 0,
                'proficient': 0,
                'developing': 0,
                'beginning': 0
            },
            'top_performers': [],
            'students_needing_support': []
        }
        
        profiles = []
        for student in students:
            profile = StudentCompetencyProfile.query.filter_by(
                student_id=student.id,
                academic_year=academic_year
            ).first()
            
            if profile:
                profiles.append(profile)
                class_overview['assessed_students'] += 1
                
                # Count proficiency levels
                if profile.overall_competency_level:
                    level_key = profile.overall_competency_level.value
                    class_overview['proficiency_distribution'][level_key] += 1
                
                # Identify top performers and students needing support
                if profile.overall_score and profile.overall_score >= 3.5:
                    class_overview['top_performers'].append({
                        'student_id': student.id,
                        'student_name': f"{student.first_name} {student.last_name}",
                        'score': profile.overall_score
                    })
                elif profile.overall_score and profile.overall_score < 2.0:
                    class_overview['students_needing_support'].append({
                        'student_id': student.id,
                        'student_name': f"{student.first_name} {student.last_name}",
                        'score': profile.overall_score,
                        'improvement_areas': profile.areas_for_improvement
                    })
        
        # Calculate domain averages
        if profiles:
            for domain in CompetencyDomain:
                domain_key = domain.value
                scores = []
                
                for profile in profiles:
                    if domain == CompetencyDomain.COMMUNICATION_COLLABORATION:
                        score = profile.communication_collaboration_score
                    elif domain == CompetencyDomain.CRITICAL_THINKING_PROBLEM_SOLVING:
                        score = profile.critical_thinking_score
                    elif domain == CompetencyDomain.CREATIVITY_INNOVATION:
                        score = profile.creativity_innovation_score
                    elif domain == CompetencyDomain.CULTURAL_IDENTITY_GLOBAL_CITIZENSHIP:
                        score = profile.cultural_identity_score
                    elif domain == CompetencyDomain.PERSONAL_DEVELOPMENT_LEADERSHIP:
                        score = profile.personal_development_score
                    elif domain == CompetencyDomain.DIGITAL_LITERACY:
                        score = profile.digital_literacy_score
                    else:
                        score = None
                    
                    if score is not None:
                        scores.append(score)
                
                if scores:
                    class_overview['domain_averages'][domain_key] = sum(scores) / len(scores)
        
        return class_overview