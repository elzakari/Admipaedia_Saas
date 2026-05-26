import uuid
from decimal import Decimal, ROUND_HALF_UP
from app.extensions import db
from app.models.class_ import Class
from app.models.educational_system import GradeLevel
from app.models.polymorphic_grading_scale import PolymorphicGradingScale

class PolymorphicGradingEngine:
    @staticmethod
    def calculate_final_score(class_id: int, class_score: float, exam_score: float) -> dict:
        """
        Computes precision weighted average of class and exam scores using Decimal,
        resolves the grading scale based on the class's grade level and track,
        and matches the final score to the correct grading scheme mark name.
        """
        # 1. Convert scores to Decimal
        dec_class = Decimal(str(class_score if class_score is not None else 0.0))
        dec_exam = Decimal(str(exam_score if exam_score is not None else 0.0))
        
        # 2. Fetch classroom
        clazz = Class.query.get(class_id)
        if not clazz:
            raise ValueError(f"Class with ID {class_id} not found.")
            
        tenant_id = clazz.tenant_id
        
        # 3. Resolve the grade track via class grade level name mapping
        grade_level = GradeLevel.query.filter(
            GradeLevel.tenant_id == tenant_id,
            GradeLevel.name.in_([clazz.grade_level, clazz.grade_level_name])
        ).first()
        
        scale = None
        if grade_level and grade_level.track_id:
            # Look up scale for this track
            scale = PolymorphicGradingScale.query.filter_by(
                tenant_id=tenant_id,
                track_id=grade_level.track_id
            ).first()
            
        if not scale:
            # Fallback: obtain the first available scale for this tenant
            scale = PolymorphicGradingScale.query.filter_by(tenant_id=tenant_id).first()
            
        if not scale:
            raise ValueError(f"No polymorphic grading scale configured for tenant {tenant_id}.")
            
        # 4. Extract parameters and calculate weighted final score
        class_weight = Decimal(str(scale.class_weight or 40))
        exam_weight = Decimal(str(scale.exam_weight or 60))
        total_weight = class_weight + exam_weight
        
        if total_weight == 0:
            total_weight = Decimal('100')
            
        final_score = (dec_class * class_weight + dec_exam * exam_weight) / total_weight
        final_score = final_score.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        # 5. Determine alphabetical/narrative mark from schemes
        matched_mark = None
        for scheme in scale.schemes or []:
            s_min = Decimal(str(scheme.get('min', 0.0)))
            s_max = Decimal(str(scheme.get('max', 0.0)))
            if s_min <= final_score <= s_max:
                matched_mark = scheme.get('name')
                break
                
        return {
            "final_score": float(final_score),
            "mark": matched_mark,
            "evaluation_type": scale.evaluation_type,
            "passing": final_score >= Decimal(str(scale.passing_boundary or 50.0)),
            "scale_id": str(scale.id),
            "track_id": str(scale.track_id)
        }
