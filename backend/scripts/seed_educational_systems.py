import json
import uuid
import sys
import os

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app import create_app
from app.extensions import db
from app.models.educational_system import EducationalSystemTemplate

def seed_templates():
    app = create_app('development')
    with app.app_context():
        print("Seeding Educational System Templates...")
        
        # 1. Ghana (GES) - Standards Based Curriculum
        gh_ges = {
            "country_code": "GH",
            "system_key": "gh_ges_standard",
            "name": "Ghana Education Service (Standard)",
            "description": "Standards-based curriculum for KG to SHS",
            "config": {
                "phases": [
                    {"name": "Pre-School", "levels": ["KG1", "KG2"]},
                    {"name": "Lower Primary", "levels": ["Basic 1", "Basic 2", "Basic 3"]},
                    {"name": "Upper Primary", "levels": ["Basic 4", "Basic 5", "Basic 6"]},
                    {"name": "Junior High", "levels": ["JHS 1", "JHS 2", "JHS 3"]},
                    {"name": "Senior High", "levels": ["SHS 1", "SHS 2", "SHS 3"]}
                ],
                "grading": {
                    "type": "percentage",
                    "scale": "WAEC",
                    "schemes": [
                        {"name": "A1", "min": 80, "max": 100, "point": 1},
                        {"name": "B2", "min": 70, "max": 79, "point": 2},
                        {"name": "B3", "min": 60, "max": 69, "point": 3},
                        {"name": "C4", "min": 55, "max": 59, "point": 4},
                        {"name": "C5", "min": 50, "max": 54, "point": 5},
                        {"name": "C6", "min": 45, "max": 49, "point": 6},
                        {"name": "D7", "min": 40, "max": 44, "point": 7},
                        {"name": "E8", "min": 35, "max": 39, "point": 8},
                        {"name": "F9", "min": 0, "max": 34, "point": 9}
                    ]
                },
                "assessments": {
                    "class_score_weight": 30,
                    "exam_score_weight": 70
                }
            }
        }

        # 2. Nigeria (NERDC) - 9-3-4 System
        ng_nerdc = {
            "country_code": "NG",
            "system_key": "ng_nerdc_standard",
            "name": "Nigeria NERDC (9-3-4)",
            "description": "Universal Basic Education (UBE) + Senior Secondary",
            "config": {
                "phases": [
                    {"name": "Early Child Care", "levels": ["ECCDE"]},
                    {"name": "Primary", "levels": ["Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6"]},
                    {"name": "Junior Secondary", "levels": ["JSS 1", "JSS 2", "JSS 3"]},
                    {"name": "Senior Secondary", "levels": ["SSS 1", "SSS 2", "SSS 3"]}
                ],
                "grading": {
                    "type": "percentage",
                    "scale": "WAEC",
                    "schemes": [
                        {"name": "A1", "min": 75, "max": 100},
                        {"name": "B2", "min": 70, "max": 74},
                        {"name": "B3", "min": 65, "max": 69},
                        {"name": "C4", "min": 60, "max": 64},
                        {"name": "C5", "min": 55, "max": 59},
                        {"name": "C6", "min": 50, "max": 54},
                        {"name": "D7", "min": 45, "max": 49},
                        {"name": "E8", "min": 40, "max": 44},
                        {"name": "F9", "min": 0, "max": 39}
                    ]
                },
                "assessments": {
                    "ca_weight": 40,
                    "exam_weight": 60
                }
            }
        }

        # 3. Kenya (CBC) - 2-6-3-3-3 System
        ke_cbc = {
            "country_code": "KE",
            "system_key": "ke_cbc_standard",
            "name": "Kenya CBC (2-6-3-3-3)",
            "description": "Competency Based Curriculum",
            "config": {
                "phases": [
                    {"name": "Pre-Primary", "levels": ["PP1", "PP2"]},
                    {"name": "Lower Primary", "levels": ["Grade 1", "Grade 2", "Grade 3"]},
                    {"name": "Upper Primary", "levels": ["Grade 4", "Grade 5", "Grade 6"]},
                    {"name": "Junior Secondary", "levels": ["Grade 7", "Grade 8", "Grade 9"]},
                    {"name": "Senior Secondary", "levels": ["Grade 10", "Grade 11", "Grade 12"]}
                ],
                "grading": {
                    "type": "performance_level",
                    "levels": [
                        {"name": "Exceeding Expectations", "range": "80-100"},
                        {"name": "Meeting Expectations", "range": "65-79"},
                        {"name": "Approaching Expectations", "range": "50-64"},
                        {"name": "Below Expectations", "range": "0-49"}
                    ]
                }
            }
        }

        # 4. South Africa (CAPS)
        za_caps = {
            "country_code": "ZA",
            "system_key": "za_caps_standard",
            "name": "South Africa CAPS",
            "description": "Curriculum and Assessment Policy Statement",
            "config": {
                "phases": [
                    {"name": "Foundation Phase", "levels": ["Grade R", "Grade 1", "Grade 2", "Grade 3"]},
                    {"name": "Intermediate Phase", "levels": ["Grade 4", "Grade 5", "Grade 6"]},
                    {"name": "Senior Phase", "levels": ["Grade 7", "Grade 8", "Grade 9"]},
                    {"name": "FET Phase", "levels": ["Grade 10", "Grade 11", "Grade 12"]}
                ],
                "grading": {
                    "type": "levels",
                    "levels": [
                        {"code": "7", "name": "Outstanding", "min": 80, "max": 100},
                        {"code": "6", "name": "Meritorious", "min": 70, "max": 79},
                        {"code": "5", "name": "Substantial", "min": 60, "max": 69},
                        {"code": "4", "name": "Adequate", "min": 50, "max": 59},
                        {"code": "3", "name": "Moderate", "min": 40, "max": 49},
                        {"code": "2", "name": "Elementary", "min": 30, "max": 39},
                        {"code": "1", "name": "Not Achieved", "min": 0, "max": 29}
                    ]
                }
            }
        }

        # 5. Togo - Francophone structure
        tg_standard = {
            "country_code": "TG",
            "system_key": "tg_education_standard",
            "name": "Togo Education System (Standard)",
            "description": "Francophone structure: Primary (CP1-CM2), Secondary (6e-3e), Upper Secondary (Seconde-Terminale)",
            "config": {
                "phases": [
                    {"name": "Primaire", "levels": ["CP1", "CP2", "CE1", "CE2", "CM1", "CM2"]},
                    {"name": "Secondaire - Collège", "levels": ["6e", "5e", "4e", "3e"]},
                    {"name": "Secondaire - Lycée", "levels": ["Seconde", "Première", "Terminale"]}
                ],
                "grading": {
                    "type": "scale_20",
                    "scale": "0-20",
                    "pass_mark": 10,
                    "bands": [
                        {"name": "Excellent", "min": 16, "max": 20},
                        {"name": "Très bien", "min": 14, "max": 15.99},
                        {"name": "Bien", "min": 12, "max": 13.99},
                        {"name": "Assez bien", "min": 10, "max": 11.99},
                        {"name": "Insuffisant", "min": 0, "max": 9.99}
                    ]
                },
                "assessments": {
                    "continuous_assessment_weight": 40,
                    "exam_weight": 60
                },
                "locales": {"default": "fr", "supported": ["fr", "en"]}
            }
        }

        # 6. Benin - Francophone structure
        bj_standard = {
            "country_code": "BJ",
            "system_key": "bj_education_standard",
            "name": "Benin Education System (Standard)",
            "description": "Francophone structure: Primary (CI-CM2), Secondary (6e-3e), Upper Secondary (Seconde-Terminale)",
            "config": {
                "phases": [
                    {"name": "Primaire", "levels": ["CI", "CP", "CE1", "CE2", "CM1", "CM2"]},
                    {"name": "Secondaire - Collège", "levels": ["6e", "5e", "4e", "3e"]},
                    {"name": "Secondaire - Lycée", "levels": ["Seconde", "Première", "Terminale"]}
                ],
                "grading": {
                    "type": "scale_20",
                    "scale": "0-20",
                    "pass_mark": 10,
                    "bands": [
                        {"name": "Excellent", "min": 16, "max": 20},
                        {"name": "Très bien", "min": 14, "max": 15.99},
                        {"name": "Bien", "min": 12, "max": 13.99},
                        {"name": "Assez bien", "min": 10, "max": 11.99},
                        {"name": "Insuffisant", "min": 0, "max": 9.99}
                    ]
                },
                "assessments": {
                    "continuous_assessment_weight": 40,
                    "exam_weight": 60
                },
                "locales": {"default": "fr", "supported": ["fr", "en"]}
            }
        }

        templates = [gh_ges, ng_nerdc, ke_cbc, za_caps, tg_standard, bj_standard]

        for t in templates:
            existing = EducationalSystemTemplate.query.filter_by(system_key=t['system_key']).first()
            if not existing:
                new_template = EducationalSystemTemplate(
                    country_code=t['country_code'],
                    system_key=t['system_key'],
                    name=t['name'],
                    description=t['description'],
                    config=t['config']
                )
                db.session.add(new_template)
                print(f"Added template: {t['name']}")
            else:
                print(f"Template exists: {t['name']}")
        
        db.session.commit()
        print("Seeding completed successfully.")

if __name__ == '__main__':
    seed_templates()
