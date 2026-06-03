from app.extensions import db
from app.models.academic_cycle import AcademicCycle
from app.models.grade_track import GradeTrack
from app.models.educational_system import GradeLevel
from app.models.polymorphic_grading_scale import PolymorphicGradingScale
from flask import current_app
from sqlalchemy import event
import structlog

logger = structlog.get_logger()

# Master Registry of Polymorphic Curriculum Specifications
MASTER_CURRICULUM_REGISTRY = {
    "APC": {
        "cycle_type": "TRIMESTRE",
        "terms": ["Premier Trimestre", "Deuxième Trimestre", "Troisième Trimestre"],
        "tracks": [
            {
                "name": "Parcours APC",
                "rank": 1,
                "levels": ["CP1", "CP2", "CE1", "CE2", "CM1", "CM2", "6e", "5e", "4e", "3e", "Seconde", "Première", "Terminale"],
                "grading": {
                    "type": "RUBRIC",
                    "max_score": 20.00,
                    "passing_boundary": 10.00,
                    "schemes": [
                        {"min": 16.00, "max": 20.00, "name": "M", "description": "Maîtrisé", "point": 16.00},
                        {"min": 14.00, "max": 15.99, "name": "A", "description": "Acquis", "point": 14.00},
                        {"min": 10.00, "max": 13.99, "name": "EA", "description": "En cours d’Acquisition", "point": 10.00},
                        {"min": 0.00, "max": 9.99, "name": "NA", "description": "Non Acquis", "point": 0.00}
                    ]
                },
                "assessment": {
                    "exam_weight": 60,
                    "class_weight": 40
                }
            }
        ]
    },
    "tg_standard": {
        "cycle_type": "TRIMESTRE",
        "terms": ["Premier Trimestre", "Deuxième Trimestre", "Troisième Trimestre"],
        "tracks": [
            {
                "name": "Maternelle",
                "rank": 1,
                "levels": ["Petite Section", "Moyenne Section", "Grande Section"],
                "grading": {
                    "type": "NUMERICAL",
                    "max_score": 20.00,
                    "passing_boundary": 10.00,
                    "schemes": [
                        {"min": 16.00, "max": 20.00, "name": "Très Bien", "point": 16.00},
                        {"min": 14.00, "max": 15.99, "name": "Bien", "point": 14.00},
                        {"min": 12.00, "max": 13.99, "name": "Assez Bien", "point": 12.00},
                        {"min": 10.00, "max": 11.99, "name": "Passable", "point": 10.00},
                        {"min": 0.00, "max": 9.99, "name": "Insuffisant", "point": 0.00}
                    ]
                },
                "assessment": {
                    "exam_weight": 60,
                    "class_weight": 40
                }
            },
            {
                "name": "Primaire",
                "rank": 2,
                "levels": ["CP1", "CP2", "CE1", "CE2", "CM1", "CM2"],
                "grading": {
                    "type": "NUMERICAL",
                    "max_score": 20.00,
                    "passing_boundary": 10.00,
                    "schemes": [
                        {"min": 16.00, "max": 20.00, "name": "Très Bien", "point": 16.00},
                        {"min": 14.00, "max": 15.99, "name": "Bien", "point": 14.00},
                        {"min": 12.00, "max": 13.99, "name": "Assez Bien", "point": 12.00},
                        {"min": 10.00, "max": 11.99, "name": "Passable", "point": 10.00},
                        {"min": 0.00, "max": 9.99, "name": "Insuffisant", "point": 0.00}
                    ]
                },
                "assessment": {
                    "exam_weight": 60,
                    "class_weight": 40
                }
            },
            {
                "name": "Collège",
                "rank": 3,
                "levels": ["6ème", "5ème", "4ème", "3ème"],
                "grading": {
                    "type": "NUMERICAL",
                    "max_score": 20.00,
                    "passing_boundary": 10.00,
                    "schemes": [
                        {"min": 16.00, "max": 20.00, "name": "Très Bien", "point": 16.00},
                        {"min": 14.00, "max": 15.99, "name": "Bien", "point": 14.00},
                        {"min": 12.00, "max": 13.99, "name": "Assez Bien", "point": 12.00},
                        {"min": 10.00, "max": 11.99, "name": "Passable", "point": 10.00},
                        {"min": 0.00, "max": 9.99, "name": "Insuffisant", "point": 0.00}
                    ]
                },
                "assessment": {
                    "exam_weight": 60,
                    "class_weight": 40
                }
            },
            {
                "name": "Lycée",
                "rank": 4,
                "levels": ["Seconde", "Première", "Terminale"],
                "grading": {
                    "type": "NUMERICAL",
                    "max_score": 20.00,
                    "passing_boundary": 10.00,
                    "schemes": [
                        {"min": 16.00, "max": 20.00, "name": "Très Bien", "point": 16.00},
                        {"min": 14.00, "max": 15.99, "name": "Bien", "point": 14.00},
                        {"min": 12.00, "max": 13.99, "name": "Assez Bien", "point": 12.00},
                        {"min": 10.00, "max": 11.99, "name": "Passable", "point": 10.00},
                        {"min": 0.00, "max": 9.99, "name": "Insuffisant", "point": 0.00}
                    ]
                },
                "assessment": {
                    "exam_weight": 60,
                    "class_weight": 40
                }
            }
        ]
    },
    "gh_ges_standard": {
        "cycle_type": "SEMESTER",
        "terms": ["First Semester", "Second Semester"],
        "tracks": [
            {
                "name": "Pre-School",
                "rank": 1,
                "levels": ["Crèche", "Nursery 1", "Nursery 2", "Kindergarten 1", "Kindergarten 2"],
                "grading": {
                    "type": "PERCENTAGE",
                    "max_score": 100.00,
                    "passing_boundary": 50.00,
                    "schemes": [
                        {"min": 80.00, "max": 100.00, "name": "Excellent", "point": 80.00},
                        {"min": 70.00, "max": 79.99, "name": "Very Good", "point": 70.00},
                        {"min": 60.00, "max": 69.99, "name": "Good", "point": 60.00},
                        {"min": 50.00, "max": 59.99, "name": "Satisfactory", "point": 50.00},
                        {"min": 0.00, "max": 49.99, "name": "Needs Improvement", "point": 0.00}
                    ]
                },
                "assessment": {
                    "exam_weight": 40,
                    "class_weight": 60
                }
            },
            {
                "name": "Primary",
                "rank": 2,
                "levels": ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6"],
                "grading": {
                    "type": "PERCENTAGE",
                    "max_score": 100.00,
                    "passing_boundary": 50.00,
                    "schemes": [
                        {"min": 80.00, "max": 100.00, "name": "A1", "point": 80.00},
                        {"min": 75.00, "max": 79.99, "name": "B2", "point": 75.00},
                        {"min": 70.00, "max": 74.99, "name": "B3", "point": 70.00},
                        {"min": 65.00, "max": 69.99, "name": "C4", "point": 65.00},
                        {"min": 60.00, "max": 64.99, "name": "C5", "point": 60.00},
                        {"min": 55.00, "max": 59.99, "name": "C6", "point": 55.00},
                        {"min": 50.00, "max": 54.99, "name": "D7", "point": 50.00},
                        {"min": 45.00, "max": 49.99, "name": "E8", "point": 45.00},
                        {"min": 0.00, "max": 44.99, "name": "F9", "point": 0.00}
                    ]
                },
                "assessment": {
                    "exam_weight": 60,
                    "class_weight": 40
                }
            },
            {
                "name": "JHS",
                "rank": 3,
                "levels": ["JHS 1", "JHS 2", "JHS 3"],
                "grading": {
                    "type": "PERCENTAGE",
                    "max_score": 100.00,
                    "passing_boundary": 50.00,
                    "schemes": [
                        {"min": 80.00, "max": 100.00, "name": "A1", "point": 80.00},
                        {"min": 75.00, "max": 79.99, "name": "B2", "point": 75.00},
                        {"min": 70.00, "max": 74.99, "name": "B3", "point": 70.00},
                        {"min": 65.00, "max": 69.99, "name": "C4", "point": 65.00},
                        {"min": 60.00, "max": 64.99, "name": "C5", "point": 60.00},
                        {"min": 55.00, "max": 59.99, "name": "C6", "point": 55.00},
                        {"min": 50.00, "max": 54.99, "name": "D7", "point": 50.00},
                        {"min": 45.00, "max": 49.99, "name": "E8", "point": 45.00},
                        {"min": 0.00, "max": 44.99, "name": "F9", "point": 0.00}
                    ]
                },
                "assessment": {
                    "exam_weight": 60,
                    "class_weight": 40
                }
            },
            {
                "name": "SHS",
                "rank": 4,
                "levels": ["SHS 1", "SHS 2", "SHS 3"],
                "grading": {
                    "type": "PERCENTAGE",
                    "max_score": 100.00,
                    "passing_boundary": 50.00,
                    "schemes": [
                        {"min": 80.00, "max": 100.00, "name": "A1", "point": 80.00},
                        {"min": 75.00, "max": 79.99, "name": "B2", "point": 75.00},
                        {"min": 70.00, "max": 74.99, "name": "B3", "point": 70.00},
                        {"min": 65.00, "max": 69.99, "name": "C4", "point": 65.00},
                        {"min": 60.00, "max": 64.99, "name": "C5", "point": 60.00},
                        {"min": 55.00, "max": 59.99, "name": "C6", "point": 55.00},
                        {"min": 50.00, "max": 54.99, "name": "D7", "point": 50.00},
                        {"min": 45.00, "max": 49.99, "name": "E8", "point": 45.00},
                        {"min": 0.00, "max": 44.99, "name": "F9", "point": 0.00}
                    ]
                },
                "assessment": {
                    "exam_weight": 70,
                    "class_weight": 30
                }
            }
        ]
    },
    "uk_cambridge": {
        "cycle_type": "TERM",
        "terms": ["Term 1", "Term 2", "Term 3"],
        "tracks": [
            {
                "name": "Key Stage 1-2 (Years 1-6)",
                "rank": 1,
                "levels": ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"],
                "grading": {
                    "type": "LETTER_GRADE",
                    "max_score": 100.00,
                    "passing_boundary": 50.00,
                    "schemes": [
                        {"min": 80.00, "max": 100.00, "name": "A", "point": 4.00},
                        {"min": 70.00, "max": 79.99, "name": "B", "point": 3.00},
                        {"min": 60.00, "max": 69.99, "name": "C", "point": 2.00},
                        {"min": 50.00, "max": 59.99, "name": "D", "point": 1.00},
                        {"min": 0.00, "max": 49.99, "name": "U", "point": 0.00}
                    ]
                },
                "assessment": {
                    "exam_weight": 50,
                    "class_weight": 50
                }
            },
            {
                "name": "IGCSE (Y10-11)",
                "rank": 2,
                "levels": ["Year 10", "Year 11"],
                "grading": {
                    "type": "LETTER_GRADE",
                    "max_score": 100.00,
                    "passing_boundary": 50.00,
                    "schemes": [
                        {"min": 90.00, "max": 100.00, "name": "A*", "point": 5.00},
                        {"min": 80.00, "max": 89.99, "name": "A", "point": 4.00},
                        {"min": 70.00, "max": 79.99, "name": "B", "point": 3.00},
                        {"min": 60.00, "max": 69.99, "name": "C", "point": 2.00},
                        {"min": 50.00, "max": 59.99, "name": "D", "point": 1.00},
                        {"min": 40.00, "max": 49.99, "name": "E", "point": 0.50},
                        {"min": 0.00, "max": 39.99, "name": "U", "point": 0.00}
                    ]
                },
                "assessment": {
                    "exam_weight": 70,
                    "class_weight": 30
                }
            },
            {
                "name": "A-Levels (Y12-13)",
                "rank": 3,
                "levels": ["Year 12", "Year 13"],
                "grading": {
                    "type": "LETTER_GRADE",
                    "max_score": 100.00,
                    "passing_boundary": 50.00,
                    "schemes": [
                        {"min": 90.00, "max": 100.00, "name": "A*", "point": 5.00},
                        {"min": 80.00, "max": 89.99, "name": "A", "point": 4.00},
                        {"min": 70.00, "max": 79.99, "name": "B", "point": 3.00},
                        {"min": 60.00, "max": 69.99, "name": "C", "point": 2.00},
                        {"min": 50.00, "max": 59.99, "name": "D", "point": 1.00},
                        {"min": 40.00, "max": 49.99, "name": "E", "point": 0.50},
                        {"min": 0.00, "max": 39.99, "name": "U", "point": 0.00}
                    ]
                },
                "assessment": {
                    "exam_weight": 80,
                    "class_weight": 20
                }
            }
        ]
    },
    "us_common_core": {
        "cycle_type": "SEMESTER",
        "terms": ["Fall Semester", "Spring Semester"],
        "tracks": [
            {
                "name": "Elementary (K-G5)",
                "rank": 1,
                "levels": ["Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"],
                "grading": {
                    "type": "GPA",
                    "max_score": 4.00,
                    "passing_boundary": 2.00,
                    "schemes": [
                        {"min": 3.50, "max": 4.00, "name": "A", "point": 4.00},
                        {"min": 2.50, "max": 3.49, "name": "B", "point": 3.00},
                        {"min": 1.50, "max": 2.49, "name": "C", "point": 2.00},
                        {"min": 0.70, "max": 1.49, "name": "D", "point": 1.00},
                        {"min": 0.00, "max": 0.69, "name": "F", "point": 0.00}
                    ]
                },
                "assessment": {
                    "exam_weight": 40,
                    "class_weight": 60
                }
            },
            {
                "name": "Middle School (G6-G8)",
                "rank": 2,
                "levels": ["Grade 6", "Grade 7", "Grade 8"],
                "grading": {
                    "type": "GPA",
                    "max_score": 4.00,
                    "passing_boundary": 2.00,
                    "schemes": [
                        {"min": 3.50, "max": 4.00, "name": "A", "point": 4.00},
                        {"min": 2.50, "max": 3.49, "name": "B", "point": 3.00},
                        {"min": 1.50, "max": 2.49, "name": "C", "point": 2.00},
                        {"min": 0.70, "max": 1.49, "name": "D", "point": 1.00},
                        {"min": 0.00, "max": 0.69, "name": "F", "point": 0.00}
                    ]
                },
                "assessment": {
                    "exam_weight": 50,
                    "class_weight": 50
                }
            },
            {
                "name": "High School (G9-G12)",
                "rank": 3,
                "levels": ["Grade 9", "Grade 10", "Grade 11", "Grade 12"],
                "grading": {
                    "type": "GPA",
                    "max_score": 4.00,
                    "passing_boundary": 2.00,
                    "schemes": [
                        {"min": 3.50, "max": 4.00, "name": "A", "point": 4.00},
                        {"min": 2.50, "max": 3.49, "name": "B", "point": 3.00},
                        {"min": 1.50, "max": 2.49, "name": "C", "point": 2.00},
                        {"min": 0.70, "max": 1.49, "name": "D", "point": 1.00},
                        {"min": 0.00, "max": 0.69, "name": "F", "point": 0.00}
                    ]
                },
                "assessment": {
                    "exam_weight": 60,
                    "class_weight": 40
                }
            }
        ]
    }
}

# Fallback matrices to ensure no key ever fails configuration
FALLBACK_BLUEPRINT = {
    "cycle_type": "TERM",
    "terms": ["Term 1", "Term 2", "Term 3"],
    "tracks": [
        {
            "name": "Standard Track",
            "rank": 1,
            "levels": ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6"],
            "grading": {
                "type": "PERCENTAGE",
                "max_score": 100.00,
                "passing_boundary": 50.00,
                "schemes": [
                    {"min": 80.00, "max": 100.00, "name": "Excellent", "point": 4.0},
                    {"min": 50.00, "max": 79.99, "name": "Pass", "point": 2.0},
                    {"min": 0.00, "max": 49.99, "name": "Fail", "point": 0.0}
                ]
            },
            "assessment": {
                "exam_weight": 60,
                "class_weight": 40
            }
        }
    ]
}


class TenantEducationInitializer:
    @classmethod
    def run_setup(cls, tenant_id, system_key):
        """
        Processes onboarding requests, extracts layout indices from curriculum matrices,
        and dynamically distributes properties into appropriate decoupled storage rows.
        """
        blueprint = MASTER_CURRICULUM_REGISTRY.get(system_key) or FALLBACK_BLUEPRINT
        if not blueprint:
            raise ValueError(f"Curriculum key '{system_key}' unrecognized.")

        # Purge any pre-existing records for this tenant to ensure a clean atomic re-run
        try:
            # Let's clean temporal cycles, tracks, scales safely
            AcademicCycle.query.filter_by(tenant_id=tenant_id).delete()
            existing_tracks = GradeTrack.query.filter_by(tenant_id=tenant_id).all()
            for track in existing_tracks:
                db.session.delete(track)
            db.session.flush()
        except Exception:
            pass

        try:
            with db.session.begin_nested():
                # Seed Temporal Track
                for term_name in blueprint['terms']:
                    db.session.add(AcademicCycle(
                        tenant_id=tenant_id,
                        cycle_type=blueprint['cycle_type'],
                        name=term_name
                    ))
                
                # Seed Structural Tracks and Levels
                for track_data in blueprint['tracks']:
                    track = GradeTrack(
                        tenant_id=tenant_id,
                        name=track_data['name'],
                        numeric_level_rank=track_data['rank']
                    )
                    db.session.add(track)
                    db.session.flush()  # Extract Track ID dynamically

                    order_index = 1
                    previous_level = None
                    for level_name in track_data['levels']:
                        lvl = GradeLevel(
                            track_id=track.id,
                            name=level_name,
                            is_terminal=(level_name == track_data['levels'][-1]),
                            order_index=order_index,
                            tenant_id=tenant_id
                        )
                        db.session.add(lvl)
                        db.session.flush()

                        if previous_level is not None:
                            previous_level.next_level_id = lvl.id
                        previous_level = lvl
                        order_index += 1

                    scale = PolymorphicGradingScale(
                        tenant_id=tenant_id,
                        track_id=track.id,
                        evaluation_type=track_data['grading']['type'],
                        max_score=track_data['grading']['max_score'],
                        passing_boundary=track_data['grading']['passing_boundary'],
                        exam_weight=track_data['assessment']['exam_weight'],
                        class_weight=track_data['assessment']['class_weight'],
                        schemes=track_data['grading']['schemes']
                    )
                    db.session.add(scale)
            db.session.commit()
            logger.info("polymorphic_education_seeding_success", tenant_id=str(tenant_id), framework=system_key)
        except Exception as e:
            db.session.rollback()
            try:
                current_app.logger.error(f"Atomic rollback executed for tenant {tenant_id}: {str(e)}")
            except Exception:
                logger.error("atomic_rollback_error", tenant_id=str(tenant_id), error=str(e))
            raise RuntimeError("Setup tracking validation failed. Database state safely reverted.")


# Redis Automatic Cache Eviction Listener
def flush_tenant_cache_matrix(mapper, connection, target):
    tenant_id = getattr(target, 'tenant_id', None)
    if tenant_id:
        try:
            from app.services.cache_service import get_cache_service
            cache = get_cache_service()
            if cache:
                cache.delete(f"tenant:{tenant_id}:education_meta")
        except Exception:
            pass

event.listen(PolymorphicGradingScale, 'after_update', flush_tenant_cache_matrix)
event.listen(PolymorphicGradingScale, 'after_delete', flush_tenant_cache_matrix)
