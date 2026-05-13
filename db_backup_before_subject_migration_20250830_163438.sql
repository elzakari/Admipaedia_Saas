--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2025-08-30 16:34:38

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE ONLY public.values_education_resources DROP CONSTRAINT values_education_resources_educational_level_id_fkey;
ALTER TABLE ONLY public.user_roles DROP CONSTRAINT user_roles_user_id_fkey;
ALTER TABLE ONLY public.user_roles DROP CONSTRAINT user_roles_role_id_fkey;
ALTER TABLE ONLY public.transactions DROP CONSTRAINT transactions_created_by_fkey;
ALTER TABLE ONLY public.transactions DROP CONSTRAINT transactions_budget_id_fkey;
ALTER TABLE ONLY public.transactions DROP CONSTRAINT transactions_approved_by_fkey;
ALTER TABLE ONLY public.teachers DROP CONSTRAINT teachers_user_id_fkey;
ALTER TABLE ONLY public.teacher_subjects DROP CONSTRAINT teacher_subjects_teacher_id_fkey;
ALTER TABLE ONLY public.teacher_subjects DROP CONSTRAINT teacher_subjects_subject_id_fkey;
ALTER TABLE ONLY public.teacher_attendances DROP CONSTRAINT teacher_attendances_teacher_id_fkey;
ALTER TABLE ONLY public.subjects DROP CONSTRAINT subjects_department_id_fkey;
ALTER TABLE ONLY public.students DROP CONSTRAINT students_user_id_fkey;
ALTER TABLE ONLY public.students DROP CONSTRAINT students_parent_id_fkey;
ALTER TABLE ONLY public.students DROP CONSTRAINT students_class_id_fkey;
ALTER TABLE ONLY public.student_progressions DROP CONSTRAINT student_progressions_student_id_fkey;
ALTER TABLE ONLY public.student_progressions DROP CONSTRAINT student_progressions_recommended_by_fkey;
ALTER TABLE ONLY public.student_progressions DROP CONSTRAINT student_progressions_next_level_id_fkey;
ALTER TABLE ONLY public.student_progressions DROP CONSTRAINT student_progressions_current_level_id_fkey;
ALTER TABLE ONLY public.student_progressions DROP CONSTRAINT student_progressions_approved_by_fkey;
ALTER TABLE ONLY public.student_competency_profiles DROP CONSTRAINT student_competency_profiles_updated_by_fkey;
ALTER TABLE ONLY public.student_competency_profiles DROP CONSTRAINT student_competency_profiles_student_id_fkey;
ALTER TABLE ONLY public.student_competency_assessments DROP CONSTRAINT student_competency_assessments_teacher_id_fkey;
ALTER TABLE ONLY public.student_competency_assessments DROP CONSTRAINT student_competency_assessments_student_id_fkey;
ALTER TABLE ONLY public.student_competency_assessments DROP CONSTRAINT student_competency_assessments_competency_id_fkey;
ALTER TABLE ONLY public.stem_subjects DROP CONSTRAINT stem_subjects_subject_id_fkey;
ALTER TABLE ONLY public.stem_subjects DROP CONSTRAINT stem_subjects_stem_domain_id_fkey;
ALTER TABLE ONLY public.stem_subjects DROP CONSTRAINT stem_subjects_educational_level_id_fkey;
ALTER TABLE ONLY public.stem_resource_center DROP CONSTRAINT stem_resource_center_created_by_fkey;
ALTER TABLE ONLY public.stem_resource_bookings DROP CONSTRAINT stem_resource_bookings_resource_id_fkey;
ALTER TABLE ONLY public.stem_resource_bookings DROP CONSTRAINT stem_resource_bookings_class_id_fkey;
ALTER TABLE ONLY public.stem_resource_bookings DROP CONSTRAINT stem_resource_bookings_booked_by_fkey;
ALTER TABLE ONLY public.stem_resource_bookings DROP CONSTRAINT stem_resource_bookings_approved_by_fkey;
ALTER TABLE ONLY public.stem_projects DROP CONSTRAINT stem_projects_learning_module_id_fkey;
ALTER TABLE ONLY public.stem_projects DROP CONSTRAINT stem_projects_created_by_fkey;
ALTER TABLE ONLY public.stem_project_submissions DROP CONSTRAINT stem_project_submissions_student_id_fkey;
ALTER TABLE ONLY public.stem_project_submissions DROP CONSTRAINT stem_project_submissions_project_id_fkey;
ALTER TABLE ONLY public.stem_project_submissions DROP CONSTRAINT stem_project_submissions_graded_by_fkey;
ALTER TABLE ONLY public.stem_learning_modules DROP CONSTRAINT stem_learning_modules_stem_subject_id_fkey;
ALTER TABLE ONLY public.stem_learning_modules DROP CONSTRAINT stem_learning_modules_educational_level_id_fkey;
ALTER TABLE ONLY public.stem_learning_modules DROP CONSTRAINT stem_learning_modules_created_by_fkey;
ALTER TABLE ONLY public.stem_assessments DROP CONSTRAINT stem_assessments_learning_module_id_fkey;
ALTER TABLE ONLY public.stem_assessments DROP CONSTRAINT stem_assessments_created_by_fkey;
ALTER TABLE ONLY public.stem_assessment_results DROP CONSTRAINT stem_assessment_results_student_id_fkey;
ALTER TABLE ONLY public.stem_assessment_results DROP CONSTRAINT stem_assessment_results_assessment_id_fkey;
ALTER TABLE ONLY public.stem_assessment_results DROP CONSTRAINT stem_assessment_results_assessed_by_fkey;
ALTER TABLE ONLY public.school_based_assessments DROP CONSTRAINT school_based_assessments_teacher_id_fkey;
ALTER TABLE ONLY public.school_based_assessments DROP CONSTRAINT school_based_assessments_subject_id_fkey;
ALTER TABLE ONLY public.school_based_assessments DROP CONSTRAINT school_based_assessments_student_id_fkey;
ALTER TABLE ONLY public.school_based_assessments DROP CONSTRAINT school_based_assessments_moderated_by_fkey;
ALTER TABLE ONLY public.school_based_assessments DROP CONSTRAINT school_based_assessments_class_id_fkey;
ALTER TABLE ONLY public.resources DROP CONSTRAINT resources_teacher_id_fkey;
ALTER TABLE ONLY public.resources DROP CONSTRAINT resources_class_id_fkey;
ALTER TABLE ONLY public.parents DROP CONSTRAINT parents_user_id_fkey;
ALTER TABLE ONLY public.notifications DROP CONSTRAINT notifications_user_id_fkey;
ALTER TABLE ONLY public.maintenance_requests DROP CONSTRAINT maintenance_requests_reported_by_fkey;
ALTER TABLE ONLY public.maintenance_requests DROP CONSTRAINT maintenance_requests_facility_id_fkey;
ALTER TABLE ONLY public.maintenance_requests DROP CONSTRAINT maintenance_requests_assigned_to_fkey;
ALTER TABLE ONLY public.login_history DROP CONSTRAINT login_history_user_id_fkey;
ALTER TABLE ONLY public.lessons DROP CONSTRAINT lessons_teacher_id_fkey;
ALTER TABLE ONLY public.lessons DROP CONSTRAINT lessons_class_id_fkey;
ALTER TABLE ONLY public.learning_objectives DROP CONSTRAINT learning_objectives_curriculum_id_fkey;
ALTER TABLE ONLY public.grading_schemes DROP CONSTRAINT grading_schemes_subject_id_fkey;
ALTER TABLE ONLY public.grading_schemes DROP CONSTRAINT grading_schemes_grading_standard_id_fkey;
ALTER TABLE ONLY public.grading_schemes DROP CONSTRAINT grading_schemes_educational_level_id_fkey;
ALTER TABLE ONLY public.grades DROP CONSTRAINT grades_student_id_fkey;
ALTER TABLE ONLY public.grades DROP CONSTRAINT grades_graded_by_fkey;
ALTER TABLE ONLY public.grades DROP CONSTRAINT grades_exam_id_fkey;
ALTER TABLE ONLY public.grade_boundaries DROP CONSTRAINT grade_boundaries_grading_scheme_id_fkey;
ALTER TABLE ONLY public.grades DROP CONSTRAINT fk_grades_subject_id;
ALTER TABLE ONLY public.grades DROP CONSTRAINT fk_grades_class_id;
ALTER TABLE ONLY public.final_grades DROP CONSTRAINT fk_final_grades_computed_by;
ALTER TABLE ONLY public.final_grades DROP CONSTRAINT fk_final_grades_class_id;
ALTER TABLE ONLY public.enhanced_grades DROP CONSTRAINT fk_enhanced_grades_class_id;
ALTER TABLE ONLY public.final_grades DROP CONSTRAINT final_grades_subject_id_fkey;
ALTER TABLE ONLY public.final_grades DROP CONSTRAINT final_grades_student_id_fkey;
ALTER TABLE ONLY public.final_grades DROP CONSTRAINT final_grades_grading_scheme_id_fkey;
ALTER TABLE ONLY public.fee_structures DROP CONSTRAINT fee_structures_created_by_fkey;
ALTER TABLE ONLY public.fee_records DROP CONSTRAINT fee_records_student_id_fkey;
ALTER TABLE ONLY public.fee_records DROP CONSTRAINT fee_records_fee_structure_id_fkey;
ALTER TABLE ONLY public.fee_records DROP CONSTRAINT fee_records_created_by_fkey;
ALTER TABLE ONLY public.fee_payments DROP CONSTRAINT fee_payments_processed_by_fkey;
ALTER TABLE ONLY public.fee_payments DROP CONSTRAINT fee_payments_fee_record_id_fkey;
ALTER TABLE ONLY public.facilities DROP CONSTRAINT facilities_created_by_fkey;
ALTER TABLE ONLY public.external_examinations DROP CONSTRAINT external_examinations_created_by_fkey;
ALTER TABLE ONLY public.external_exam_results DROP CONSTRAINT external_exam_results_subject_id_fkey;
ALTER TABLE ONLY public.external_exam_results DROP CONSTRAINT external_exam_results_student_id_fkey;
ALTER TABLE ONLY public.external_exam_results DROP CONSTRAINT external_exam_results_registration_id_fkey;
ALTER TABLE ONLY public.external_exam_results DROP CONSTRAINT external_exam_results_internal_grade_id_fkey;
ALTER TABLE ONLY public.external_exam_results DROP CONSTRAINT external_exam_results_examination_id_fkey;
ALTER TABLE ONLY public.external_exam_registrations DROP CONSTRAINT external_exam_registrations_student_id_fkey;
ALTER TABLE ONLY public.external_exam_registrations DROP CONSTRAINT external_exam_registrations_examination_id_fkey;
ALTER TABLE ONLY public.external_exam_import_logs DROP CONSTRAINT external_exam_import_logs_examination_id_fkey;
ALTER TABLE ONLY public.external_exam_import_logs DROP CONSTRAINT external_exam_import_logs_created_by_fkey;
ALTER TABLE ONLY public.exams DROP CONSTRAINT exams_subject_id_fkey;
ALTER TABLE ONLY public.exams DROP CONSTRAINT exams_created_by_fkey;
ALTER TABLE ONLY public.exams DROP CONSTRAINT exams_class_id_fkey;
ALTER TABLE ONLY public.event_role_association DROP CONSTRAINT event_role_association_role_id_fkey;
ALTER TABLE ONLY public.event_role_association DROP CONSTRAINT event_role_association_event_id_fkey;
ALTER TABLE ONLY public.enhanced_sba DROP CONSTRAINT enhanced_sba_subject_id_fkey;
ALTER TABLE ONLY public.enhanced_sba DROP CONSTRAINT enhanced_sba_student_id_fkey;
ALTER TABLE ONLY public.enhanced_sba DROP CONSTRAINT enhanced_sba_curriculum_id_fkey;
ALTER TABLE ONLY public.enhanced_sba DROP CONSTRAINT enhanced_sba_assessed_by_fkey;
ALTER TABLE ONLY public.enhanced_grades DROP CONSTRAINT enhanced_grades_teacher_id_fkey;
ALTER TABLE ONLY public.enhanced_grades DROP CONSTRAINT enhanced_grades_subject_id_fkey;
ALTER TABLE ONLY public.enhanced_grades DROP CONSTRAINT enhanced_grades_student_id_fkey;
ALTER TABLE ONLY public.enhanced_grades DROP CONSTRAINT enhanced_grades_grading_scheme_id_fkey;
ALTER TABLE ONLY public.enhanced_grades DROP CONSTRAINT enhanced_grades_assessment_type_id_fkey;
ALTER TABLE ONLY public.differentiated_assessments DROP CONSTRAINT differentiated_assessments_task_id_fkey;
ALTER TABLE ONLY public.differentiated_assessments DROP CONSTRAINT differentiated_assessments_student_id_fkey;
ALTER TABLE ONLY public.departments DROP CONSTRAINT departments_head_id_fkey;
ALTER TABLE ONLY public.department_staff DROP CONSTRAINT department_staff_user_id_fkey;
ALTER TABLE ONLY public.department_staff DROP CONSTRAINT department_staff_department_id_fkey;
ALTER TABLE ONLY public.curriculum_units DROP CONSTRAINT curriculum_units_curriculum_id_fkey;
ALTER TABLE ONLY public.curriculum_competencies DROP CONSTRAINT curriculum_competencies_curriculum_id_fkey;
ALTER TABLE ONLY public.curriculum_competencies DROP CONSTRAINT curriculum_competencies_competency_id_fkey;
ALTER TABLE ONLY public.curricula DROP CONSTRAINT curricula_subject_id_fkey;
ALTER TABLE ONLY public.curricula DROP CONSTRAINT curricula_created_by_fkey;
ALTER TABLE ONLY public.continuous_assessment_records DROP CONSTRAINT continuous_assessment_records_teacher_id_fkey;
ALTER TABLE ONLY public.continuous_assessment_records DROP CONSTRAINT continuous_assessment_records_subject_id_fkey;
ALTER TABLE ONLY public.continuous_assessment_records DROP CONSTRAINT continuous_assessment_records_student_id_fkey;
ALTER TABLE ONLY public.continuous_assessment_records DROP CONSTRAINT continuous_assessment_records_class_id_fkey;
ALTER TABLE ONLY public.competency_learning_activities DROP CONSTRAINT competency_learning_activities_created_by_fkey;
ALTER TABLE ONLY public.competency_indicators DROP CONSTRAINT competency_indicators_proficiency_level_id_fkey;
ALTER TABLE ONLY public.competency_indicators DROP CONSTRAINT competency_indicators_educational_level_id_fkey;
ALTER TABLE ONLY public.competency_indicators DROP CONSTRAINT competency_indicators_domain_id_fkey;
ALTER TABLE ONLY public.competency_evidence DROP CONSTRAINT competency_evidence_indicator_id_fkey;
ALTER TABLE ONLY public.competency_evidence DROP CONSTRAINT competency_evidence_collected_by_fkey;
ALTER TABLE ONLY public.competency_evidence DROP CONSTRAINT competency_evidence_assessment_id_fkey;
ALTER TABLE ONLY public.classes DROP CONSTRAINT classes_teacher_id_fkey;
ALTER TABLE ONLY public.classes DROP CONSTRAINT classes_educational_level_id_fkey;
ALTER TABLE ONLY public.class_subjects DROP CONSTRAINT class_subjects_subject_id_fkey;
ALTER TABLE ONLY public.class_subjects DROP CONSTRAINT class_subjects_class_id_fkey;
ALTER TABLE ONLY public.character_traits DROP CONSTRAINT character_traits_educational_level_id_fkey;
ALTER TABLE ONLY public.character_traits DROP CONSTRAINT character_traits_domain_id_fkey;
ALTER TABLE ONLY public.character_development_plans DROP CONSTRAINT character_development_plans_student_id_fkey;
ALTER TABLE ONLY public.character_assessments DROP CONSTRAINT character_assessments_trait_id_fkey;
ALTER TABLE ONLY public.character_assessments DROP CONSTRAINT character_assessments_teacher_id_fkey;
ALTER TABLE ONLY public.character_assessments DROP CONSTRAINT character_assessments_student_id_fkey;
ALTER TABLE ONLY public.character_activities DROP CONSTRAINT character_activities_educational_level_id_fkey;
ALTER TABLE ONLY public.calendar_events DROP CONSTRAINT calendar_events_created_by_fkey;
ALTER TABLE ONLY public.budgets DROP CONSTRAINT budgets_created_by_fkey;
ALTER TABLE ONLY public.attendances DROP CONSTRAINT attendances_subject_id_fkey;
ALTER TABLE ONLY public.attendances DROP CONSTRAINT attendances_student_id_fkey;
ALTER TABLE ONLY public.attendances DROP CONSTRAINT attendances_recorded_by_fkey;
ALTER TABLE ONLY public.attendances DROP CONSTRAINT attendances_class_id_fkey;
ALTER TABLE ONLY public.assignments DROP CONSTRAINT assignments_teacher_id_fkey;
ALTER TABLE ONLY public.assignments DROP CONSTRAINT assignments_subject_id_fkey;
ALTER TABLE ONLY public.assignments DROP CONSTRAINT assignments_class_id_fkey;
ALTER TABLE ONLY public.assignment_submissions DROP CONSTRAINT assignment_submissions_student_id_fkey;
ALTER TABLE ONLY public.assignment_submissions DROP CONSTRAINT assignment_submissions_graded_by_fkey;
ALTER TABLE ONLY public.assignment_submissions DROP CONSTRAINT assignment_submissions_assignment_id_fkey;
ALTER TABLE ONLY public.assets DROP CONSTRAINT assets_facility_id_fkey;
ALTER TABLE ONLY public.assets DROP CONSTRAINT assets_created_by_fkey;
ALTER TABLE ONLY public.assessment_tasks DROP CONSTRAINT assessment_tasks_framework_id_fkey;
ALTER TABLE ONLY public.assessment_submissions DROP CONSTRAINT assessment_submissions_task_id_fkey;
ALTER TABLE ONLY public.assessment_submissions DROP CONSTRAINT assessment_submissions_student_id_fkey;
ALTER TABLE ONLY public.assessment_scores DROP CONSTRAINT assessment_scores_teacher_id_fkey;
ALTER TABLE ONLY public.assessment_scores DROP CONSTRAINT assessment_scores_submission_id_fkey;
ALTER TABLE ONLY public.assessment_scores DROP CONSTRAINT assessment_scores_rubric_id_fkey;
ALTER TABLE ONLY public.assessment_rubrics DROP CONSTRAINT assessment_rubrics_task_id_fkey;
ALTER TABLE ONLY public.assessment_frameworks DROP CONSTRAINT assessment_frameworks_subject_id_fkey;
ALTER TABLE ONLY public.assessment_frameworks DROP CONSTRAINT assessment_frameworks_educational_level_id_fkey;
ALTER TABLE ONLY public.announcements DROP CONSTRAINT announcements_teacher_id_fkey;
ALTER TABLE ONLY public.announcements DROP CONSTRAINT announcements_class_id_fkey;
ALTER TABLE ONLY public.activity_traits DROP CONSTRAINT activity_traits_trait_id_fkey;
ALTER TABLE ONLY public.activity_traits DROP CONSTRAINT activity_traits_activity_id_fkey;
ALTER TABLE ONLY public.activity_implementations DROP CONSTRAINT activity_implementations_teacher_id_fkey;
ALTER TABLE ONLY public.activity_implementations DROP CONSTRAINT activity_implementations_class_id_fkey;
ALTER TABLE ONLY public.activity_implementations DROP CONSTRAINT activity_implementations_activity_id_fkey;
DROP INDEX public.idx_student_competency_student_id;
DROP INDEX public.idx_stem_resource_bookings_date;
DROP INDEX public.idx_stem_resource_bookings_class;
DROP INDEX public.idx_stem_projects_module;
DROP INDEX public.idx_stem_learning_modules_subject_level;
DROP INDEX public.idx_stem_assessments_module;
DROP INDEX public.idx_stem_assessment_results_student;
DROP INDEX public.idx_sba_teacher_id;
DROP INDEX public.idx_sba_subject_id;
DROP INDEX public.idx_sba_student_id;
DROP INDEX public.idx_sba_class_id;
DROP INDEX public.idx_sba_academic_year_term;
DROP INDEX public.idx_final_grades_student_term;
DROP INDEX public.idx_enhanced_grades_student_subject;
DROP INDEX public.idx_continuous_assessment_subject_id;
DROP INDEX public.idx_continuous_assessment_student_id;
DROP INDEX public.idx_continuous_assessment_class_id;
DROP INDEX public.idx_continuous_assessment_academic_year_term;
DROP INDEX public.idx_character_traits_level_domain;
DROP INDEX public.idx_assessment_frameworks_level_subject;
ALTER TABLE ONLY public.values_education_resources DROP CONSTRAINT values_education_resources_pkey;
ALTER TABLE ONLY public.users DROP CONSTRAINT users_username_key;
ALTER TABLE ONLY public.users DROP CONSTRAINT users_pkey;
ALTER TABLE ONLY public.users DROP CONSTRAINT users_email_key;
ALTER TABLE ONLY public.user_roles DROP CONSTRAINT user_roles_pkey;
ALTER TABLE ONLY public.student_competency_profiles DROP CONSTRAINT unique_student_year_profile;
ALTER TABLE ONLY public.transactions DROP CONSTRAINT transactions_reference_number_key;
ALTER TABLE ONLY public.transactions DROP CONSTRAINT transactions_pkey;
ALTER TABLE ONLY public.teachers DROP CONSTRAINT teachers_user_id_key;
ALTER TABLE ONLY public.teachers DROP CONSTRAINT teachers_pkey;
ALTER TABLE ONLY public.teachers DROP CONSTRAINT teachers_employee_id_key;
ALTER TABLE ONLY public.teacher_subjects DROP CONSTRAINT teacher_subjects_pkey;
ALTER TABLE ONLY public.teacher_attendances DROP CONSTRAINT teacher_attendances_pkey;
ALTER TABLE ONLY public.subjects DROP CONSTRAINT subjects_pkey;
ALTER TABLE ONLY public.subjects DROP CONSTRAINT subjects_code_key;
ALTER TABLE ONLY public.students DROP CONSTRAINT students_student_id_number_key;
ALTER TABLE ONLY public.students DROP CONSTRAINT students_pkey;
ALTER TABLE ONLY public.students DROP CONSTRAINT students_admission_number_key;
ALTER TABLE ONLY public.student_progressions DROP CONSTRAINT student_progressions_pkey;
ALTER TABLE ONLY public.student_competency_profiles DROP CONSTRAINT student_competency_profiles_pkey;
ALTER TABLE ONLY public.student_competency_assessments DROP CONSTRAINT student_competency_assessments_pkey;
ALTER TABLE ONLY public.stem_subjects DROP CONSTRAINT stem_subjects_pkey;
ALTER TABLE ONLY public.stem_resource_center DROP CONSTRAINT stem_resource_center_pkey;
ALTER TABLE ONLY public.stem_resource_bookings DROP CONSTRAINT stem_resource_bookings_pkey;
ALTER TABLE ONLY public.stem_projects DROP CONSTRAINT stem_projects_pkey;
ALTER TABLE ONLY public.stem_project_submissions DROP CONSTRAINT stem_project_submissions_pkey;
ALTER TABLE ONLY public.stem_learning_modules DROP CONSTRAINT stem_learning_modules_pkey;
ALTER TABLE ONLY public.stem_domains DROP CONSTRAINT stem_domains_pkey;
ALTER TABLE ONLY public.stem_domains DROP CONSTRAINT stem_domains_name_key;
ALTER TABLE ONLY public.stem_domains DROP CONSTRAINT stem_domains_code_key;
ALTER TABLE ONLY public.stem_assessments DROP CONSTRAINT stem_assessments_pkey;
ALTER TABLE ONLY public.stem_assessment_results DROP CONSTRAINT stem_assessment_results_pkey;
ALTER TABLE ONLY public.school_based_assessments DROP CONSTRAINT school_based_assessments_pkey;
ALTER TABLE ONLY public.roles DROP CONSTRAINT roles_pkey;
ALTER TABLE ONLY public.roles DROP CONSTRAINT roles_name_key;
ALTER TABLE ONLY public.resources DROP CONSTRAINT resources_pkey;
ALTER TABLE ONLY public.proficiency_levels DROP CONSTRAINT proficiency_levels_pkey;
ALTER TABLE ONLY public.proficiency_levels DROP CONSTRAINT proficiency_levels_name_key;
ALTER TABLE ONLY public.proficiency_levels DROP CONSTRAINT proficiency_levels_level_number_key;
ALTER TABLE ONLY public.parents DROP CONSTRAINT parents_user_id_key;
ALTER TABLE ONLY public.parents DROP CONSTRAINT parents_pkey;
ALTER TABLE ONLY public.notifications DROP CONSTRAINT notifications_pkey;
ALTER TABLE ONLY public.maintenance_requests DROP CONSTRAINT maintenance_requests_pkey;
ALTER TABLE ONLY public.login_history DROP CONSTRAINT login_history_pkey;
ALTER TABLE ONLY public.lessons DROP CONSTRAINT lessons_pkey;
ALTER TABLE ONLY public.learning_objectives DROP CONSTRAINT learning_objectives_pkey;
ALTER TABLE ONLY public.learning_approaches DROP CONSTRAINT learning_approaches_pkey;
ALTER TABLE ONLY public.learning_approaches DROP CONSTRAINT learning_approaches_name_key;
ALTER TABLE ONLY public.grading_standards DROP CONSTRAINT grading_standards_pkey;
ALTER TABLE ONLY public.grading_standards DROP CONSTRAINT grading_standards_name_key;
ALTER TABLE ONLY public.grading_standards DROP CONSTRAINT grading_standards_code_key;
ALTER TABLE ONLY public.grading_schemes DROP CONSTRAINT grading_schemes_pkey;
ALTER TABLE ONLY public.grades DROP CONSTRAINT grades_pkey;
ALTER TABLE ONLY public.grade_boundaries DROP CONSTRAINT grade_boundaries_pkey;
ALTER TABLE ONLY public.final_grades DROP CONSTRAINT final_grades_pkey;
ALTER TABLE ONLY public.fee_structures DROP CONSTRAINT fee_structures_pkey;
ALTER TABLE ONLY public.fee_records DROP CONSTRAINT fee_records_pkey;
ALTER TABLE ONLY public.fee_payments DROP CONSTRAINT fee_payments_reference_number_key;
ALTER TABLE ONLY public.fee_payments DROP CONSTRAINT fee_payments_receipt_number_key;
ALTER TABLE ONLY public.fee_payments DROP CONSTRAINT fee_payments_pkey;
ALTER TABLE ONLY public.facilities DROP CONSTRAINT facilities_pkey;
ALTER TABLE ONLY public.external_examinations DROP CONSTRAINT external_examinations_pkey;
ALTER TABLE ONLY public.external_exam_results DROP CONSTRAINT external_exam_results_pkey;
ALTER TABLE ONLY public.external_exam_registrations DROP CONSTRAINT external_exam_registrations_pkey;
ALTER TABLE ONLY public.external_exam_registrations DROP CONSTRAINT external_exam_registrations_index_number_key;
ALTER TABLE ONLY public.external_exam_import_logs DROP CONSTRAINT external_exam_import_logs_pkey;
ALTER TABLE ONLY public.exams DROP CONSTRAINT exams_pkey;
ALTER TABLE ONLY public.event_role_association DROP CONSTRAINT event_role_association_pkey;
ALTER TABLE ONLY public.enhanced_sba DROP CONSTRAINT enhanced_sba_pkey;
ALTER TABLE ONLY public.enhanced_grades DROP CONSTRAINT enhanced_grades_pkey;
ALTER TABLE ONLY public.educational_levels DROP CONSTRAINT educational_levels_pkey;
ALTER TABLE ONLY public.educational_levels DROP CONSTRAINT educational_levels_name_key;
ALTER TABLE ONLY public.educational_levels DROP CONSTRAINT educational_levels_code_key;
ALTER TABLE ONLY public.differentiation_strategies DROP CONSTRAINT differentiation_strategies_pkey;
ALTER TABLE ONLY public.differentiation_strategies DROP CONSTRAINT differentiation_strategies_name_key;
ALTER TABLE ONLY public.differentiated_assessments DROP CONSTRAINT differentiated_assessments_pkey;
ALTER TABLE ONLY public.departments DROP CONSTRAINT departments_pkey;
ALTER TABLE ONLY public.departments DROP CONSTRAINT departments_name_key;
ALTER TABLE ONLY public.departments DROP CONSTRAINT departments_code_key;
ALTER TABLE ONLY public.department_staff DROP CONSTRAINT department_staff_pkey;
ALTER TABLE ONLY public.dashboard_statistics DROP CONSTRAINT dashboard_statistics_pkey;
ALTER TABLE ONLY public.curriculum_units DROP CONSTRAINT curriculum_units_pkey;
ALTER TABLE ONLY public.curriculum_competencies DROP CONSTRAINT curriculum_competencies_pkey;
ALTER TABLE ONLY public.curricula DROP CONSTRAINT curricula_pkey;
ALTER TABLE ONLY public.core_competencies DROP CONSTRAINT core_competencies_pkey;
ALTER TABLE ONLY public.core_competencies DROP CONSTRAINT core_competencies_name_key;
ALTER TABLE ONLY public.continuous_assessment_records DROP CONSTRAINT continuous_assessment_records_pkey;
ALTER TABLE ONLY public.competency_learning_activities DROP CONSTRAINT competency_learning_activities_pkey;
ALTER TABLE ONLY public.competency_indicators DROP CONSTRAINT competency_indicators_pkey;
ALTER TABLE ONLY public.competency_indicators DROP CONSTRAINT competency_indicators_indicator_code_key;
ALTER TABLE ONLY public.competency_evidence DROP CONSTRAINT competency_evidence_pkey;
ALTER TABLE ONLY public.competency_domains DROP CONSTRAINT competency_domains_pkey;
ALTER TABLE ONLY public.competency_domains DROP CONSTRAINT competency_domains_name_key;
ALTER TABLE ONLY public.classes DROP CONSTRAINT classes_pkey;
ALTER TABLE ONLY public.class_subjects DROP CONSTRAINT class_subjects_pkey;
ALTER TABLE ONLY public.character_traits DROP CONSTRAINT character_traits_pkey;
ALTER TABLE ONLY public.character_domains DROP CONSTRAINT character_domains_pkey;
ALTER TABLE ONLY public.character_domains DROP CONSTRAINT character_domains_name_key;
ALTER TABLE ONLY public.character_development_plans DROP CONSTRAINT character_development_plans_pkey;
ALTER TABLE ONLY public.character_assessments DROP CONSTRAINT character_assessments_pkey;
ALTER TABLE ONLY public.character_activities DROP CONSTRAINT character_activities_pkey;
ALTER TABLE ONLY public.calendar_events DROP CONSTRAINT calendar_events_pkey;
ALTER TABLE ONLY public.budgets DROP CONSTRAINT budgets_pkey;
ALTER TABLE ONLY public.attendances DROP CONSTRAINT attendances_pkey;
ALTER TABLE ONLY public.assignments DROP CONSTRAINT assignments_pkey;
ALTER TABLE ONLY public.assignment_submissions DROP CONSTRAINT assignment_submissions_pkey;
ALTER TABLE ONLY public.assets DROP CONSTRAINT assets_pkey;
ALTER TABLE ONLY public.assets DROP CONSTRAINT assets_asset_tag_key;
ALTER TABLE ONLY public.assessment_types DROP CONSTRAINT assessment_types_pkey;
ALTER TABLE ONLY public.assessment_types DROP CONSTRAINT assessment_types_name_key;
ALTER TABLE ONLY public.assessment_types DROP CONSTRAINT assessment_types_code_key;
ALTER TABLE ONLY public.assessment_tasks DROP CONSTRAINT assessment_tasks_pkey;
ALTER TABLE ONLY public.assessment_submissions DROP CONSTRAINT assessment_submissions_pkey;
ALTER TABLE ONLY public.assessment_scores DROP CONSTRAINT assessment_scores_pkey;
ALTER TABLE ONLY public.assessment_rubrics DROP CONSTRAINT assessment_rubrics_pkey;
ALTER TABLE ONLY public.assessment_modes DROP CONSTRAINT assessment_modes_pkey;
ALTER TABLE ONLY public.assessment_modes DROP CONSTRAINT assessment_modes_name_key;
ALTER TABLE ONLY public.assessment_modes DROP CONSTRAINT assessment_modes_code_key;
ALTER TABLE ONLY public.assessment_frequencies DROP CONSTRAINT assessment_frequencies_pkey;
ALTER TABLE ONLY public.assessment_frequencies DROP CONSTRAINT assessment_frequencies_name_key;
ALTER TABLE ONLY public.assessment_frameworks DROP CONSTRAINT assessment_frameworks_pkey;
ALTER TABLE ONLY public.assessment_analytics DROP CONSTRAINT assessment_analytics_pkey;
ALTER TABLE ONLY public.announcements DROP CONSTRAINT announcements_pkey;
ALTER TABLE ONLY public.analytics DROP CONSTRAINT analytics_pkey;
ALTER TABLE ONLY public.alembic_version DROP CONSTRAINT alembic_version_pkc;
ALTER TABLE ONLY public.activity_traits DROP CONSTRAINT activity_traits_pkey;
ALTER TABLE ONLY public.activity_implementations DROP CONSTRAINT activity_implementations_pkey;
ALTER TABLE public.values_education_resources ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.transactions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.teachers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.teacher_attendances ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.subjects ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.students ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.student_progressions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.student_competency_profiles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.student_competency_assessments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.stem_subjects ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.stem_resource_center ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.stem_resource_bookings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.stem_projects ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.stem_project_submissions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.stem_learning_modules ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.stem_domains ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.stem_assessments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.stem_assessment_results ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.school_based_assessments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.roles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.resources ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.proficiency_levels ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.parents ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.notifications ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.maintenance_requests ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.login_history ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.lessons ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.learning_objectives ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.learning_approaches ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.grading_standards ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.grading_schemes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.grades ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.grade_boundaries ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.final_grades ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.fee_structures ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.fee_records ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.fee_payments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.facilities ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.external_examinations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.external_exam_results ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.external_exam_registrations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.external_exam_import_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.exams ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.enhanced_sba ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.enhanced_grades ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.educational_levels ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.differentiation_strategies ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.differentiated_assessments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.departments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.curriculum_units ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.curricula ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.core_competencies ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.continuous_assessment_records ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.competency_learning_activities ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.competency_indicators ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.competency_evidence ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.competency_domains ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.classes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.character_traits ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.character_domains ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.character_development_plans ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.character_assessments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.character_activities ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.budgets ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.attendances ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.assignments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.assignment_submissions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.assets ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.assessment_types ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.assessment_tasks ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.assessment_submissions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.assessment_scores ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.assessment_rubrics ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.assessment_modes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.assessment_frequencies ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.assessment_frameworks ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.assessment_analytics ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.announcements ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.activity_implementations ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE public.values_education_resources_id_seq;
DROP TABLE public.values_education_resources;
DROP SEQUENCE public.users_id_seq;
DROP TABLE public.users;
DROP TABLE public.user_roles;
DROP SEQUENCE public.transactions_id_seq;
DROP TABLE public.transactions;
DROP SEQUENCE public.teachers_id_seq;
DROP TABLE public.teachers;
DROP TABLE public.teacher_subjects;
DROP SEQUENCE public.teacher_attendances_id_seq;
DROP TABLE public.teacher_attendances;
DROP SEQUENCE public.subjects_id_seq;
DROP TABLE public.subjects;
DROP SEQUENCE public.students_id_seq;
DROP TABLE public.students;
DROP SEQUENCE public.student_progressions_id_seq;
DROP TABLE public.student_progressions;
DROP SEQUENCE public.student_competency_profiles_id_seq;
DROP TABLE public.student_competency_profiles;
DROP SEQUENCE public.student_competency_assessments_id_seq;
DROP TABLE public.student_competency_assessments;
DROP SEQUENCE public.stem_subjects_id_seq;
DROP TABLE public.stem_subjects;
DROP SEQUENCE public.stem_resource_center_id_seq;
DROP TABLE public.stem_resource_center;
DROP SEQUENCE public.stem_resource_bookings_id_seq;
DROP TABLE public.stem_resource_bookings;
DROP SEQUENCE public.stem_projects_id_seq;
DROP TABLE public.stem_projects;
DROP SEQUENCE public.stem_project_submissions_id_seq;
DROP TABLE public.stem_project_submissions;
DROP SEQUENCE public.stem_learning_modules_id_seq;
DROP TABLE public.stem_learning_modules;
DROP SEQUENCE public.stem_domains_id_seq;
DROP TABLE public.stem_domains;
DROP SEQUENCE public.stem_assessments_id_seq;
DROP TABLE public.stem_assessments;
DROP SEQUENCE public.stem_assessment_results_id_seq;
DROP TABLE public.stem_assessment_results;
DROP SEQUENCE public.school_based_assessments_id_seq;
DROP TABLE public.school_based_assessments;
DROP SEQUENCE public.roles_id_seq;
DROP TABLE public.roles;
DROP SEQUENCE public.resources_id_seq;
DROP TABLE public.resources;
DROP SEQUENCE public.proficiency_levels_id_seq;
DROP TABLE public.proficiency_levels;
DROP SEQUENCE public.parents_id_seq;
DROP TABLE public.parents;
DROP SEQUENCE public.notifications_id_seq;
DROP TABLE public.notifications;
DROP SEQUENCE public.maintenance_requests_id_seq;
DROP TABLE public.maintenance_requests;
DROP SEQUENCE public.login_history_id_seq;
DROP TABLE public.login_history;
DROP SEQUENCE public.lessons_id_seq;
DROP TABLE public.lessons;
DROP SEQUENCE public.learning_objectives_id_seq;
DROP TABLE public.learning_objectives;
DROP SEQUENCE public.learning_approaches_id_seq;
DROP TABLE public.learning_approaches;
DROP SEQUENCE public.grading_standards_id_seq;
DROP TABLE public.grading_standards;
DROP SEQUENCE public.grading_schemes_id_seq;
DROP TABLE public.grading_schemes;
DROP SEQUENCE public.grades_id_seq;
DROP TABLE public.grades;
DROP SEQUENCE public.grade_boundaries_id_seq;
DROP TABLE public.grade_boundaries;
DROP SEQUENCE public.final_grades_id_seq;
DROP TABLE public.final_grades;
DROP SEQUENCE public.fee_structures_id_seq;
DROP TABLE public.fee_structures;
DROP SEQUENCE public.fee_records_id_seq;
DROP TABLE public.fee_records;
DROP SEQUENCE public.fee_payments_id_seq;
DROP TABLE public.fee_payments;
DROP SEQUENCE public.facilities_id_seq;
DROP TABLE public.facilities;
DROP SEQUENCE public.external_examinations_id_seq;
DROP TABLE public.external_examinations;
DROP SEQUENCE public.external_exam_results_id_seq;
DROP TABLE public.external_exam_results;
DROP SEQUENCE public.external_exam_registrations_id_seq;
DROP TABLE public.external_exam_registrations;
DROP SEQUENCE public.external_exam_import_logs_id_seq;
DROP TABLE public.external_exam_import_logs;
DROP SEQUENCE public.exams_id_seq;
DROP TABLE public.exams;
DROP TABLE public.event_role_association;
DROP SEQUENCE public.enhanced_sba_id_seq;
DROP TABLE public.enhanced_sba;
DROP SEQUENCE public.enhanced_grades_id_seq;
DROP TABLE public.enhanced_grades;
DROP SEQUENCE public.educational_levels_id_seq;
DROP TABLE public.educational_levels;
DROP SEQUENCE public.differentiation_strategies_id_seq;
DROP TABLE public.differentiation_strategies;
DROP SEQUENCE public.differentiated_assessments_id_seq;
DROP TABLE public.differentiated_assessments;
DROP SEQUENCE public.departments_id_seq;
DROP TABLE public.departments;
DROP TABLE public.department_staff;
DROP TABLE public.dashboard_statistics;
DROP SEQUENCE public.curriculum_units_id_seq;
DROP TABLE public.curriculum_units;
DROP TABLE public.curriculum_competencies;
DROP SEQUENCE public.curricula_id_seq;
DROP TABLE public.curricula;
DROP SEQUENCE public.core_competencies_id_seq;
DROP TABLE public.core_competencies;
DROP SEQUENCE public.continuous_assessment_records_id_seq;
DROP TABLE public.continuous_assessment_records;
DROP SEQUENCE public.competency_learning_activities_id_seq;
DROP TABLE public.competency_learning_activities;
DROP SEQUENCE public.competency_indicators_id_seq;
DROP TABLE public.competency_indicators;
DROP SEQUENCE public.competency_evidence_id_seq;
DROP TABLE public.competency_evidence;
DROP SEQUENCE public.competency_domains_id_seq;
DROP TABLE public.competency_domains;
DROP SEQUENCE public.classes_id_seq;
DROP TABLE public.classes;
DROP TABLE public.class_subjects;
DROP SEQUENCE public.character_traits_id_seq;
DROP TABLE public.character_traits;
DROP SEQUENCE public.character_domains_id_seq;
DROP TABLE public.character_domains;
DROP SEQUENCE public.character_development_plans_id_seq;
DROP TABLE public.character_development_plans;
DROP SEQUENCE public.character_assessments_id_seq;
DROP TABLE public.character_assessments;
DROP SEQUENCE public.character_activities_id_seq;
DROP TABLE public.character_activities;
DROP TABLE public.calendar_events;
DROP SEQUENCE public.budgets_id_seq;
DROP TABLE public.budgets;
DROP SEQUENCE public.attendances_id_seq;
DROP TABLE public.attendances;
DROP SEQUENCE public.assignments_id_seq;
DROP TABLE public.assignments;
DROP SEQUENCE public.assignment_submissions_id_seq;
DROP TABLE public.assignment_submissions;
DROP SEQUENCE public.assets_id_seq;
DROP TABLE public.assets;
DROP SEQUENCE public.assessment_types_id_seq;
DROP TABLE public.assessment_types;
DROP SEQUENCE public.assessment_tasks_id_seq;
DROP TABLE public.assessment_tasks;
DROP SEQUENCE public.assessment_submissions_id_seq;
DROP TABLE public.assessment_submissions;
DROP SEQUENCE public.assessment_scores_id_seq;
DROP TABLE public.assessment_scores;
DROP SEQUENCE public.assessment_rubrics_id_seq;
DROP TABLE public.assessment_rubrics;
DROP SEQUENCE public.assessment_modes_id_seq;
DROP TABLE public.assessment_modes;
DROP SEQUENCE public.assessment_frequencies_id_seq;
DROP TABLE public.assessment_frequencies;
DROP SEQUENCE public.assessment_frameworks_id_seq;
DROP TABLE public.assessment_frameworks;
DROP SEQUENCE public.assessment_analytics_id_seq;
DROP TABLE public.assessment_analytics;
DROP SEQUENCE public.announcements_id_seq;
DROP TABLE public.announcements;
DROP TABLE public.analytics;
DROP TABLE public.alembic_version;
DROP TABLE public.activity_traits;
DROP SEQUENCE public.activity_implementations_id_seq;
DROP TABLE public.activity_implementations;
DROP TYPE public.transactiontype;
DROP TYPE public.stemdomain;
DROP TYPE public.resultstatus;
DROP TYPE public.promotionstatus;
DROP TYPE public.proficiencylevel;
DROP TYPE public.paymentstatus;
DROP TYPE public.maintenancestatus;
DROP TYPE public.maintenancepriority;
DROP TYPE public.learningobjectivetype;
DROP TYPE public.learningapproach;
DROP TYPE public.keyphase;
DROP TYPE public.gradingstandard;
DROP TYPE public.facilitytype;
DROP TYPE public.facilitystatus;
DROP TYPE public.externalexamtype;
DROP TYPE public.examsession;
DROP TYPE public.differentiationstrategy;
DROP TYPE public.curriculumstandard;
DROP TYPE public.competencydomain;
DROP TYPE public.characterdomain;
DROP TYPE public.budgetcategory;
DROP TYPE public.assetcondition;
DROP TYPE public.assessmenttype;
DROP TYPE public.assessmentmode;
DROP TYPE public.assessmentfrequency;
--
-- TOC entry 1214 (class 1247 OID 100496)
-- Name: assessmentfrequency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.assessmentfrequency AS ENUM (
    'DAILY',
    'WEEKLY',
    'MONTHLY',
    'TERMLY',
    'ANNUALLY'
);


--
-- TOC entry 1220 (class 1247 OID 100530)
-- Name: assessmentmode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.assessmentmode AS ENUM (
    'WRITTEN',
    'ORAL',
    'PRACTICAL',
    'DIGITAL',
    'OBSERVATION',
    'DEMONSTRATION',
    'PRESENTATION',
    'PORTFOLIO_REVIEW'
);


--
-- TOC entry 1217 (class 1247 OID 100508)
-- Name: assessmenttype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.assessmenttype AS ENUM (
    'FORMATIVE',
    'SUMMATIVE',
    'DIAGNOSTIC',
    'SCHOOL_BASED',
    'CONTINUOUS',
    'PORTFOLIO',
    'PROJECT',
    'PERFORMANCE',
    'PEER',
    'SELF'
);


--
-- TOC entry 1265 (class 1247 OID 100710)
-- Name: assetcondition; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.assetcondition AS ENUM (
    'EXCELLENT',
    'GOOD',
    'FAIR',
    'POOR',
    'DAMAGED'
);


--
-- TOC entry 1244 (class 1247 OID 100624)
-- Name: budgetcategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.budgetcategory AS ENUM (
    'SALARIES',
    'UTILITIES',
    'MAINTENANCE',
    'SUPPLIES',
    'EQUIPMENT',
    'TRANSPORTATION',
    'OTHER'
);


--
-- TOC entry 1211 (class 1247 OID 100482)
-- Name: characterdomain; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.characterdomain AS ENUM (
    'RELIGIOUS_VALUES',
    'MORAL_VALUES',
    'CULTURAL_VALUES',
    'CIVIC_VALUES',
    'SOCIAL_VALUES',
    'PERSONAL_VALUES'
);


--
-- TOC entry 1199 (class 1247 OID 100432)
-- Name: competencydomain; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.competencydomain AS ENUM (
    'COMMUNICATION_COLLABORATION',
    'CRITICAL_THINKING_PROBLEM_SOLVING',
    'CREATIVITY_INNOVATION',
    'CULTURAL_IDENTITY_GLOBAL_CITIZENSHIP',
    'PERSONAL_DEVELOPMENT_LEADERSHIP',
    'DIGITAL_LITERACY'
);


--
-- TOC entry 1238 (class 1247 OID 100606)
-- Name: curriculumstandard; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.curriculumstandard AS ENUM (
    'STANDARDS_BASED',
    'COMPETENCY_BASED',
    'STEM_FOCUSED',
    'CHARACTER_DEVELOPMENT'
);


--
-- TOC entry 1223 (class 1247 OID 100548)
-- Name: differentiationstrategy; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.differentiationstrategy AS ENUM (
    'CONTENT',
    'PROCESS',
    'PRODUCT',
    'LEARNING_ENVIRONMENT',
    'READINESS',
    'INTEREST',
    'LEARNING_PROFILE'
);


--
-- TOC entry 1232 (class 1247 OID 100586)
-- Name: examsession; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.examsession AS ENUM (
    'MAY_JUNE',
    'NOVEMBER_DECEMBER',
    'MARCH_APRIL'
);


--
-- TOC entry 1229 (class 1247 OID 100576)
-- Name: externalexamtype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.externalexamtype AS ENUM (
    'BECE',
    'WASSCE',
    'NOVDEC',
    'PRIVATE'
);


--
-- TOC entry 1256 (class 1247 OID 100680)
-- Name: facilitystatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.facilitystatus AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'UNDER_MAINTENANCE',
    'UNDER_CONSTRUCTION'
);


--
-- TOC entry 1253 (class 1247 OID 100656)
-- Name: facilitytype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.facilitytype AS ENUM (
    'CLASSROOM',
    'LABORATORY',
    'LIBRARY',
    'OFFICE',
    'AUDITORIUM',
    'GYMNASIUM',
    'CAFETERIA',
    'PLAYGROUND',
    'PARKING',
    'STORAGE',
    'OTHER'
);


--
-- TOC entry 1196 (class 1247 OID 100422)
-- Name: gradingstandard; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.gradingstandard AS ENUM (
    'CONTINUOUS_ASSESSMENT',
    'BECE',
    'WASSCE',
    'INTERNAL_EXAM'
);


--
-- TOC entry 1193 (class 1247 OID 100410)
-- Name: keyphase; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.keyphase AS ENUM (
    'KEY_PHASE_1',
    'KEY_PHASE_2',
    'KEY_PHASE_3',
    'KEY_PHASE_4',
    'KEY_PHASE_5'
);


--
-- TOC entry 1208 (class 1247 OID 100468)
-- Name: learningapproach; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.learningapproach AS ENUM (
    'PROJECT_BASED',
    'INQUIRY_BASED',
    'PROBLEM_SOLVING',
    'HANDS_ON',
    'COLLABORATIVE',
    'DESIGN_THINKING'
);


--
-- TOC entry 1241 (class 1247 OID 100616)
-- Name: learningobjectivetype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.learningobjectivetype AS ENUM (
    'KNOWLEDGE',
    'SKILLS',
    'ATTITUDES'
);


--
-- TOC entry 1259 (class 1247 OID 100690)
-- Name: maintenancepriority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.maintenancepriority AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
);


--
-- TOC entry 1262 (class 1247 OID 100700)
-- Name: maintenancestatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.maintenancestatus AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


--
-- TOC entry 1250 (class 1247 OID 100646)
-- Name: paymentstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.paymentstatus AS ENUM (
    'PENDING',
    'PAID',
    'OVERDUE',
    'CANCELLED'
);


--
-- TOC entry 1202 (class 1247 OID 100446)
-- Name: proficiencylevel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.proficiencylevel AS ENUM (
    'BEGINNING',
    'DEVELOPING',
    'PROFICIENT',
    'EXCELLENT'
);


--
-- TOC entry 1226 (class 1247 OID 100564)
-- Name: promotionstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.promotionstatus AS ENUM (
    'PROMOTED',
    'RETAINED',
    'CONDITIONAL',
    'TRANSFERRED',
    'GRADUATED'
);


--
-- TOC entry 1235 (class 1247 OID 100594)
-- Name: resultstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.resultstatus AS ENUM (
    'PENDING',
    'RELEASED',
    'VERIFIED',
    'DISPUTED',
    'CANCELLED'
);


--
-- TOC entry 1205 (class 1247 OID 100456)
-- Name: stemdomain; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stemdomain AS ENUM (
    'SCIENCE',
    'TECHNOLOGY',
    'ENGINEERING',
    'MATHEMATICS',
    'INTEGRATED'
);


--
-- TOC entry 1247 (class 1247 OID 100640)
-- Name: transactiontype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transactiontype AS ENUM (
    'INCOME',
    'EXPENSE'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 363 (class 1259 OID 101064)
-- Name: activity_implementations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_implementations (
    id integer NOT NULL,
    activity_id integer NOT NULL,
    class_id integer NOT NULL,
    teacher_id integer NOT NULL,
    implementation_date timestamp without time zone NOT NULL,
    actual_duration integer,
    participation_rate double precision,
    effectiveness_rating integer,
    student_engagement integer,
    learning_outcomes_achieved boolean,
    teacher_reflection text,
    student_feedback text,
    modifications_made text,
    recommendations text,
    created_at timestamp without time zone
);


--
-- TOC entry 362 (class 1259 OID 101063)
-- Name: activity_implementations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_implementations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6085 (class 0 OID 0)
-- Dependencies: 362
-- Name: activity_implementations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_implementations_id_seq OWNED BY public.activity_implementations.id;


--
-- TOC entry 361 (class 1259 OID 101048)
-- Name: activity_traits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_traits (
    activity_id integer NOT NULL,
    trait_id integer NOT NULL
);


--
-- TOC entry 266 (class 1259 OID 99629)
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- TOC entry 245 (class 1259 OID 90740)
-- Name: analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics (
    id character varying(36) NOT NULL,
    metric_type character varying(100) NOT NULL,
    metric_name character varying(200) NOT NULL,
    metric_value double precision NOT NULL,
    entity_type character varying(50),
    entity_id character varying(36),
    period_start timestamp without time zone,
    period_end timestamp without time zone,
    additional_data json,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 250 (class 1259 OID 90825)
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    recipients character varying(50),
    send_email boolean,
    class_id integer NOT NULL,
    teacher_id integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 249 (class 1259 OID 90824)
-- Name: announcements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.announcements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6086 (class 0 OID 0)
-- Dependencies: 249
-- Name: announcements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.announcements_id_seq OWNED BY public.announcements.id;


--
-- TOC entry 345 (class 1259 OID 100886)
-- Name: assessment_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_analytics (
    id integer NOT NULL,
    analysis_type character varying(50) NOT NULL,
    entity_id integer NOT NULL,
    academic_year character varying(20) NOT NULL,
    term character varying(20),
    average_score double precision,
    median_score double precision,
    score_distribution json,
    competency_strengths json,
    competency_gaps json,
    performance_trend character varying(20),
    trend_data json,
    intervention_recommendations json,
    enrichment_opportunities json,
    ai_insights json,
    generated_at timestamp without time zone,
    generated_by character varying(100)
);


--
-- TOC entry 344 (class 1259 OID 100885)
-- Name: assessment_analytics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assessment_analytics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6087 (class 0 OID 0)
-- Dependencies: 344
-- Name: assessment_analytics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assessment_analytics_id_seq OWNED BY public.assessment_analytics.id;


--
-- TOC entry 309 (class 1259 OID 100113)
-- Name: assessment_frameworks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_frameworks (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    educational_level_id integer NOT NULL,
    subject_id integer,
    framework_type character varying(50) NOT NULL,
    description text,
    assessment_criteria json,
    scoring_rubric json,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 308 (class 1259 OID 100112)
-- Name: assessment_frameworks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assessment_frameworks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6088 (class 0 OID 0)
-- Dependencies: 308
-- Name: assessment_frameworks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assessment_frameworks_id_seq OWNED BY public.assessment_frameworks.id;


--
-- TOC entry 301 (class 1259 OID 100059)
-- Name: assessment_frequencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_frequencies (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    interval_days integer NOT NULL,
    description text,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 300 (class 1259 OID 100058)
-- Name: assessment_frequencies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assessment_frequencies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6089 (class 0 OID 0)
-- Dependencies: 300
-- Name: assessment_frequencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assessment_frequencies_id_seq OWNED BY public.assessment_frequencies.id;


--
-- TOC entry 305 (class 1259 OID 100089)
-- Name: assessment_modes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_modes (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20) NOT NULL,
    description text,
    is_digital boolean,
    requires_supervision boolean,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 304 (class 1259 OID 100088)
-- Name: assessment_modes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assessment_modes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6090 (class 0 OID 0)
-- Dependencies: 304
-- Name: assessment_modes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assessment_modes_id_seq OWNED BY public.assessment_modes.id;


--
-- TOC entry 365 (class 1259 OID 101088)
-- Name: assessment_rubrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_rubrics (
    id integer NOT NULL,
    task_id integer NOT NULL,
    criterion_name character varying(100) NOT NULL,
    description text,
    excellent_descriptor text,
    proficient_descriptor text,
    developing_descriptor text,
    beginning_descriptor text,
    excellent_points integer,
    proficient_points integer,
    developing_points integer,
    beginning_points integer,
    weight_percentage double precision,
    created_at timestamp without time zone
);


--
-- TOC entry 364 (class 1259 OID 101087)
-- Name: assessment_rubrics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assessment_rubrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6091 (class 0 OID 0)
-- Dependencies: 364
-- Name: assessment_rubrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assessment_rubrics_id_seq OWNED BY public.assessment_rubrics.id;


--
-- TOC entry 383 (class 1259 OID 101273)
-- Name: assessment_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_scores (
    id integer NOT NULL,
    submission_id integer NOT NULL,
    rubric_id integer,
    teacher_id integer NOT NULL,
    raw_score double precision NOT NULL,
    percentage_score double precision,
    grade_level integer,
    written_feedback text,
    audio_feedback_url character varying(255),
    criterion_scores json,
    scored_at timestamp without time zone,
    is_final boolean
);


--
-- TOC entry 382 (class 1259 OID 101272)
-- Name: assessment_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assessment_scores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6092 (class 0 OID 0)
-- Dependencies: 382
-- Name: assessment_scores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assessment_scores_id_seq OWNED BY public.assessment_scores.id;


--
-- TOC entry 367 (class 1259 OID 101102)
-- Name: assessment_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_submissions (
    id integer NOT NULL,
    task_id integer NOT NULL,
    student_id integer NOT NULL,
    submitted_at timestamp without time zone,
    submission_content text,
    file_attachments json,
    differentiation_applied json,
    is_submitted boolean,
    is_late boolean,
    created_at timestamp without time zone
);


--
-- TOC entry 366 (class 1259 OID 101101)
-- Name: assessment_submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assessment_submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6093 (class 0 OID 0)
-- Dependencies: 366
-- Name: assessment_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assessment_submissions_id_seq OWNED BY public.assessment_submissions.id;


--
-- TOC entry 343 (class 1259 OID 100872)
-- Name: assessment_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_tasks (
    id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    framework_id integer NOT NULL,
    assessment_type public.assessmenttype NOT NULL,
    assessment_mode public.assessmentmode NOT NULL,
    scheduled_date date,
    duration_minutes integer,
    is_differentiated boolean,
    differentiation_strategies json,
    total_marks integer NOT NULL,
    pass_mark integer,
    learning_objectives json,
    competency_indicators json,
    instructions text,
    materials_needed json,
    accessibility_features json,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 342 (class 1259 OID 100871)
-- Name: assessment_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assessment_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6094 (class 0 OID 0)
-- Dependencies: 342
-- Name: assessment_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assessment_tasks_id_seq OWNED BY public.assessment_tasks.id;


--
-- TOC entry 277 (class 1259 OID 99851)
-- Name: assessment_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_types (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20) NOT NULL,
    weight_percentage double precision NOT NULL,
    description text,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 276 (class 1259 OID 99850)
-- Name: assessment_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assessment_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6095 (class 0 OID 0)
-- Dependencies: 276
-- Name: assessment_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assessment_types_id_seq OWNED BY public.assessment_types.id;


--
-- TOC entry 381 (class 1259 OID 101252)
-- Name: assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assets (
    id integer NOT NULL,
    facility_id integer,
    name character varying(100) NOT NULL,
    asset_tag character varying(50) NOT NULL,
    category character varying(100) NOT NULL,
    description text,
    brand character varying(100),
    model character varying(100),
    serial_number character varying(100),
    purchase_date date,
    purchase_cost numeric(10,2),
    current_value numeric(10,2),
    condition public.assetcondition,
    is_active boolean,
    warranty_expiry date,
    last_service_date date,
    next_service_date date,
    supplier_name character varying(255),
    supplier_contact character varying(100),
    created_by integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 380 (class 1259 OID 101251)
-- Name: assets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6096 (class 0 OID 0)
-- Dependencies: 380
-- Name: assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assets_id_seq OWNED BY public.assets.id;


--
-- TOC entry 263 (class 1259 OID 90958)
-- Name: assignment_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_submissions (
    id integer NOT NULL,
    assignment_id integer NOT NULL,
    student_id integer NOT NULL,
    submission_date timestamp without time zone,
    content text,
    file_path character varying(255),
    score double precision,
    feedback text,
    status character varying(20),
    graded_by integer,
    graded_at timestamp without time zone,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 262 (class 1259 OID 90957)
-- Name: assignment_submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assignment_submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6097 (class 0 OID 0)
-- Dependencies: 262
-- Name: assignment_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assignment_submissions_id_seq OWNED BY public.assignment_submissions.id;


--
-- TOC entry 259 (class 1259 OID 90915)
-- Name: assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignments (
    id integer NOT NULL,
    title character varying(100) NOT NULL,
    description text,
    class_id integer NOT NULL,
    subject_id integer NOT NULL,
    teacher_id integer NOT NULL,
    due_date timestamp without time zone NOT NULL,
    total_points double precision NOT NULL,
    assignment_type character varying(50) NOT NULL,
    status character varying(20),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 258 (class 1259 OID 90914)
-- Name: assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6098 (class 0 OID 0)
-- Dependencies: 258
-- Name: assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assignments_id_seq OWNED BY public.assignments.id;


--
-- TOC entry 236 (class 1259 OID 82456)
-- Name: attendances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendances (
    id integer NOT NULL,
    student_id integer NOT NULL,
    class_id integer NOT NULL,
    subject_id integer,
    date date NOT NULL,
    status character varying(20) NOT NULL,
    remarks text,
    recorded_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 235 (class 1259 OID 82455)
-- Name: attendances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attendances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6099 (class 0 OID 0)
-- Dependencies: 235
-- Name: attendances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attendances_id_seq OWNED BY public.attendances.id;


--
-- TOC entry 354 (class 1259 OID 100974)
-- Name: budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budgets (
    id integer NOT NULL,
    category public.budgetcategory NOT NULL,
    description character varying(255) NOT NULL,
    allocated_amount numeric(10,2) NOT NULL,
    spent_amount numeric(10,2),
    remaining_amount numeric(10,2) NOT NULL,
    fiscal_year character varying(10) NOT NULL,
    quarter character varying(10),
    department character varying(100),
    created_by integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 353 (class 1259 OID 100973)
-- Name: budgets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.budgets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6100 (class 0 OID 0)
-- Dependencies: 353
-- Name: budgets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.budgets_id_seq OWNED BY public.budgets.id;


--
-- TOC entry 244 (class 1259 OID 82610)
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_events (
    id character varying(36) NOT NULL,
    title character varying(100) NOT NULL,
    date timestamp without time zone NOT NULL,
    type character varying(20) NOT NULL,
    description text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    created_by integer,
    location character varying(100),
    start_time character varying(10),
    end_time character varying(10)
);


--
-- TOC entry 337 (class 1259 OID 100830)
-- Name: character_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_activities (
    id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text NOT NULL,
    activity_type character varying(50),
    duration_minutes integer,
    group_size character varying(20),
    educational_level_id integer,
    subject_integration json,
    primary_domain public.characterdomain NOT NULL,
    materials_needed json,
    preparation_time integer,
    assessment_method text,
    cultural_context character varying(100),
    local_proverbs json,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 336 (class 1259 OID 100829)
-- Name: character_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.character_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6101 (class 0 OID 0)
-- Dependencies: 336
-- Name: character_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.character_activities_id_seq OWNED BY public.character_activities.id;


--
-- TOC entry 335 (class 1259 OID 100806)
-- Name: character_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_assessments (
    id integer NOT NULL,
    student_id integer NOT NULL,
    trait_id integer NOT NULL,
    teacher_id integer NOT NULL,
    assessment_date timestamp without time zone NOT NULL,
    frequency public.assessmentfrequency NOT NULL,
    score integer NOT NULL,
    evidence text,
    context character varying(200),
    teacher_comments text,
    improvement_suggestions text,
    parent_feedback text,
    home_reinforcement_activities json,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 334 (class 1259 OID 100805)
-- Name: character_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.character_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6102 (class 0 OID 0)
-- Dependencies: 334
-- Name: character_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.character_assessments_id_seq OWNED BY public.character_assessments.id;


--
-- TOC entry 339 (class 1259 OID 100844)
-- Name: character_development_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_development_plans (
    id integer NOT NULL,
    student_id integer NOT NULL,
    academic_year character varying(10) NOT NULL,
    term integer NOT NULL,
    strengths json,
    areas_for_growth json,
    goals json,
    strategies json,
    baseline_assessment json,
    mid_term_review json,
    final_assessment json,
    parent_involvement_plan json,
    community_service_hours integer,
    peer_mentoring_activities json,
    is_active boolean,
    completion_status character varying(20),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 338 (class 1259 OID 100843)
-- Name: character_development_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.character_development_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6103 (class 0 OID 0)
-- Dependencies: 338
-- Name: character_development_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.character_development_plans_id_seq OWNED BY public.character_development_plans.id;


--
-- TOC entry 299 (class 1259 OID 100048)
-- Name: character_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_domains (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    cultural_context text,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 298 (class 1259 OID 100047)
-- Name: character_domains_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.character_domains_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6104 (class 0 OID 0)
-- Dependencies: 298
-- Name: character_domains_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.character_domains_id_seq OWNED BY public.character_domains.id;


--
-- TOC entry 303 (class 1259 OID 100070)
-- Name: character_traits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_traits (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    domain_id integer NOT NULL,
    educational_level_id integer NOT NULL,
    description text,
    behavioral_indicators json,
    assessment_criteria json,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 302 (class 1259 OID 100069)
-- Name: character_traits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.character_traits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6105 (class 0 OID 0)
-- Dependencies: 302
-- Name: character_traits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.character_traits_id_seq OWNED BY public.character_traits.id;


--
-- TOC entry 234 (class 1259 OID 82440)
-- Name: class_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_subjects (
    class_id integer NOT NULL,
    subject_id integer NOT NULL,
    assigned_date timestamp without time zone
);


--
-- TOC entry 228 (class 1259 OID 82379)
-- Name: classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.classes (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    grade_level character varying(20) NOT NULL,
    section character varying(20),
    academic_year character varying(20) NOT NULL,
    capacity integer,
    teacher_id integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    start_time character varying(20),
    end_time character varying(20),
    days character varying(100),
    room character varying(50),
    description text,
    status character varying(20) DEFAULT 'active'::character varying,
    educational_level_id integer
);


--
-- TOC entry 227 (class 1259 OID 82378)
-- Name: classes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.classes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6106 (class 0 OID 0)
-- Dependencies: 227
-- Name: classes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.classes_id_seq OWNED BY public.classes.id;


--
-- TOC entry 287 (class 1259 OID 99952)
-- Name: competency_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.competency_domains (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    color_code character varying(7),
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 286 (class 1259 OID 99951)
-- Name: competency_domains_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.competency_domains_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6107 (class 0 OID 0)
-- Dependencies: 286
-- Name: competency_domains_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.competency_domains_id_seq OWNED BY public.competency_domains.id;


--
-- TOC entry 329 (class 1259 OID 100744)
-- Name: competency_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.competency_evidence (
    id integer NOT NULL,
    assessment_id integer NOT NULL,
    indicator_id integer NOT NULL,
    evidence_type character varying(50) NOT NULL,
    evidence_title character varying(200) NOT NULL,
    evidence_description text,
    file_path character varying(500),
    file_type character varying(50),
    file_size integer,
    proficiency_demonstrated public.proficiencylevel NOT NULL,
    observer_notes text,
    subject_context character varying(100),
    activity_context character varying(200),
    collaboration_involved boolean,
    collected_date date NOT NULL,
    collected_by integer NOT NULL,
    created_at timestamp without time zone
);


--
-- TOC entry 328 (class 1259 OID 100743)
-- Name: competency_evidence_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.competency_evidence_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6108 (class 0 OID 0)
-- Dependencies: 328
-- Name: competency_evidence_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.competency_evidence_id_seq OWNED BY public.competency_evidence.id;


--
-- TOC entry 291 (class 1259 OID 99976)
-- Name: competency_indicators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.competency_indicators (
    id integer NOT NULL,
    domain_id integer NOT NULL,
    educational_level_id integer NOT NULL,
    indicator_code character varying(20) NOT NULL,
    description text NOT NULL,
    proficiency_level_id integer NOT NULL,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 290 (class 1259 OID 99975)
-- Name: competency_indicators_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.competency_indicators_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6109 (class 0 OID 0)
-- Dependencies: 290
-- Name: competency_indicators_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.competency_indicators_id_seq OWNED BY public.competency_indicators.id;


--
-- TOC entry 331 (class 1259 OID 100768)
-- Name: competency_learning_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.competency_learning_activities (
    id integer NOT NULL,
    activity_name character varying(200) NOT NULL,
    activity_description text NOT NULL,
    activity_type character varying(50) NOT NULL,
    target_competencies json NOT NULL,
    target_indicators json,
    primary_domain public.competencydomain NOT NULL,
    suitable_educational_levels json NOT NULL,
    subject_integration json,
    duration_minutes integer,
    group_size_min integer,
    group_size_max integer,
    resources_required json,
    assessment_rubric json,
    success_indicators json,
    is_active boolean,
    created_by integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 330 (class 1259 OID 100767)
-- Name: competency_learning_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.competency_learning_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6110 (class 0 OID 0)
-- Dependencies: 330
-- Name: competency_learning_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.competency_learning_activities_id_seq OWNED BY public.competency_learning_activities.id;


--
-- TOC entry 323 (class 1259 OID 100322)
-- Name: continuous_assessment_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.continuous_assessment_records (
    id integer NOT NULL,
    student_id integer NOT NULL,
    subject_id integer NOT NULL,
    class_id integer NOT NULL,
    teacher_id integer NOT NULL,
    academic_year character varying(20) NOT NULL,
    term character varying(20) NOT NULL,
    week_number integer,
    assessment_date date NOT NULL,
    assessment_focus character varying(200),
    class_score double precision,
    homework_score double precision,
    participation_score double precision,
    quiz_score double precision,
    competencies_demonstrated json,
    competency_levels json,
    teacher_observations text,
    learning_difficulties text,
    strengths_noted text,
    next_steps text,
    support_needed text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 322 (class 1259 OID 100321)
-- Name: continuous_assessment_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.continuous_assessment_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6111 (class 0 OID 0)
-- Dependencies: 322
-- Name: continuous_assessment_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.continuous_assessment_records_id_seq OWNED BY public.continuous_assessment_records.id;


--
-- TOC entry 271 (class 1259 OID 99798)
-- Name: core_competencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.core_competencies (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    category character varying(50) NOT NULL,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 270 (class 1259 OID 99797)
-- Name: core_competencies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.core_competencies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6112 (class 0 OID 0)
-- Dependencies: 270
-- Name: core_competencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.core_competencies_id_seq OWNED BY public.core_competencies.id;


--
-- TOC entry 261 (class 1259 OID 90939)
-- Name: curricula; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.curricula (
    id integer NOT NULL,
    title character varying(100) NOT NULL,
    description text,
    grade_level character varying(20) NOT NULL,
    subject_id integer NOT NULL,
    academic_year character varying(20) NOT NULL,
    created_by integer NOT NULL,
    status character varying(20),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 260 (class 1259 OID 90938)
-- Name: curricula_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.curricula_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6113 (class 0 OID 0)
-- Dependencies: 260
-- Name: curricula_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.curricula_id_seq OWNED BY public.curricula.id;


--
-- TOC entry 352 (class 1259 OID 100958)
-- Name: curriculum_competencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.curriculum_competencies (
    curriculum_id integer NOT NULL,
    competency_id integer NOT NULL,
    weight_percentage double precision,
    created_at timestamp without time zone
);


--
-- TOC entry 265 (class 1259 OID 90982)
-- Name: curriculum_units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.curriculum_units (
    id integer NOT NULL,
    curriculum_id integer NOT NULL,
    title character varying(100) NOT NULL,
    description text,
    objectives text,
    resources text,
    duration_weeks integer NOT NULL,
    sequence_order integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 264 (class 1259 OID 90981)
-- Name: curriculum_units_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.curriculum_units_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6114 (class 0 OID 0)
-- Dependencies: 264
-- Name: curriculum_units_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.curriculum_units_id_seq OWNED BY public.curriculum_units.id;


--
-- TOC entry 243 (class 1259 OID 82605)
-- Name: dashboard_statistics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dashboard_statistics (
    id character varying(36) NOT NULL,
    title character varying(100) NOT NULL,
    value character varying(100) NOT NULL,
    change_value double precision,
    change_is_positive boolean,
    color character varying(20) NOT NULL,
    role character varying(20),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 257 (class 1259 OID 90899)
-- Name: department_staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.department_staff (
    department_id integer NOT NULL,
    user_id integer NOT NULL,
    role character varying(50),
    created_at timestamp without time zone
);


--
-- TOC entry 256 (class 1259 OID 90882)
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(10) NOT NULL,
    description text,
    head_id integer,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 255 (class 1259 OID 90881)
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6115 (class 0 OID 0)
-- Dependencies: 255
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- TOC entry 369 (class 1259 OID 101121)
-- Name: differentiated_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.differentiated_assessments (
    id integer NOT NULL,
    task_id integer NOT NULL,
    student_id integer NOT NULL,
    differentiation_type public.differentiationstrategy NOT NULL,
    modified_content text,
    complexity_level character varying(20),
    learning_modalities json,
    pacing_adjustments character varying(100),
    alternative_formats json,
    choice_options json,
    seating_arrangement character varying(100),
    noise_level character varying(50),
    lighting_needs character varying(100),
    scaffolding_provided json,
    assistive_technology json,
    effectiveness_rating integer,
    student_feedback text,
    teacher_notes text,
    created_at timestamp without time zone
);


--
-- TOC entry 368 (class 1259 OID 101120)
-- Name: differentiated_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.differentiated_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6116 (class 0 OID 0)
-- Dependencies: 368
-- Name: differentiated_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.differentiated_assessments_id_seq OWNED BY public.differentiated_assessments.id;


--
-- TOC entry 307 (class 1259 OID 100102)
-- Name: differentiation_strategies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.differentiation_strategies (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    category character varying(50) NOT NULL,
    description text,
    implementation_guide text,
    target_learning_styles json,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 306 (class 1259 OID 100101)
-- Name: differentiation_strategies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.differentiation_strategies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6117 (class 0 OID 0)
-- Dependencies: 306
-- Name: differentiation_strategies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.differentiation_strategies_id_seq OWNED BY public.differentiation_strategies.id;


--
-- TOC entry 269 (class 1259 OID 99785)
-- Name: educational_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.educational_levels (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(10) NOT NULL,
    key_phase character varying(50) NOT NULL,
    age_range_start integer,
    age_range_end integer,
    description text,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 268 (class 1259 OID 99784)
-- Name: educational_levels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.educational_levels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6118 (class 0 OID 0)
-- Dependencies: 268
-- Name: educational_levels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.educational_levels_id_seq OWNED BY public.educational_levels.id;


--
-- TOC entry 283 (class 1259 OID 99898)
-- Name: enhanced_grades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enhanced_grades (
    id integer NOT NULL,
    student_id integer NOT NULL,
    subject_id integer NOT NULL,
    assessment_type_id integer NOT NULL,
    grading_scheme_id integer NOT NULL,
    raw_score double precision NOT NULL,
    weighted_score double precision,
    grade character varying(5),
    grade_point double precision,
    assessment_date date NOT NULL,
    teacher_id integer,
    term character varying(20),
    academic_year character varying(10),
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    class_id integer NOT NULL,
    assessment_name character varying(100) NOT NULL,
    total_marks double precision,
    percentage double precision,
    grade_symbol character varying(5),
    grade_points double precision,
    is_passing boolean,
    weight double precision,
    contributes_to_final boolean,
    is_class_score boolean,
    is_external_exam boolean,
    teacher_comments text,
    remedial_action text
);


--
-- TOC entry 282 (class 1259 OID 99897)
-- Name: enhanced_grades_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.enhanced_grades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6119 (class 0 OID 0)
-- Dependencies: 282
-- Name: enhanced_grades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.enhanced_grades_id_seq OWNED BY public.enhanced_grades.id;


--
-- TOC entry 360 (class 1259 OID 101012)
-- Name: enhanced_sba; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enhanced_sba (
    id integer NOT NULL,
    student_id integer NOT NULL,
    subject_id integer NOT NULL,
    curriculum_id integer NOT NULL,
    academic_year character varying(20) NOT NULL,
    term character varying(20) NOT NULL,
    class_exercises_score double precision,
    class_exercises_weight double precision,
    homework_score double precision,
    homework_weight double precision,
    project_work_score double precision,
    project_work_weight double precision,
    class_tests_score double precision,
    class_tests_weight double precision,
    practical_work_score double precision,
    practical_work_weight double precision,
    oral_assessment_score double precision,
    oral_assessment_weight double precision,
    total_sba_score double precision,
    sba_percentage double precision,
    critical_thinking_score double precision,
    creativity_score double precision,
    communication_score double precision,
    collaboration_score double precision,
    character_traits_scores json,
    assessed_by integer NOT NULL,
    last_updated timestamp without time zone,
    is_finalized boolean,
    finalized_at timestamp without time zone,
    CONSTRAINT enhanced_sba_class_exercises_score_check CHECK (((class_exercises_score >= (0)::double precision) AND (class_exercises_score <= (100)::double precision))),
    CONSTRAINT enhanced_sba_class_tests_score_check CHECK (((class_tests_score >= (0)::double precision) AND (class_tests_score <= (100)::double precision))),
    CONSTRAINT enhanced_sba_collaboration_score_check CHECK (((collaboration_score >= (1)::double precision) AND (collaboration_score <= (4)::double precision))),
    CONSTRAINT enhanced_sba_communication_score_check CHECK (((communication_score >= (1)::double precision) AND (communication_score <= (4)::double precision))),
    CONSTRAINT enhanced_sba_creativity_score_check CHECK (((creativity_score >= (1)::double precision) AND (creativity_score <= (4)::double precision))),
    CONSTRAINT enhanced_sba_critical_thinking_score_check CHECK (((critical_thinking_score >= (1)::double precision) AND (critical_thinking_score <= (4)::double precision))),
    CONSTRAINT enhanced_sba_homework_score_check CHECK (((homework_score >= (0)::double precision) AND (homework_score <= (100)::double precision))),
    CONSTRAINT enhanced_sba_project_work_score_check CHECK (((project_work_score >= (0)::double precision) AND (project_work_score <= (100)::double precision)))
);


--
-- TOC entry 359 (class 1259 OID 101011)
-- Name: enhanced_sba_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.enhanced_sba_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6120 (class 0 OID 0)
-- Dependencies: 359
-- Name: enhanced_sba_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.enhanced_sba_id_seq OWNED BY public.enhanced_sba.id;


--
-- TOC entry 267 (class 1259 OID 99769)
-- Name: event_role_association; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_role_association (
    event_id character varying(36) NOT NULL,
    role_id integer NOT NULL
);


--
-- TOC entry 240 (class 1259 OID 82499)
-- Name: exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exams (
    id integer NOT NULL,
    title character varying(100) NOT NULL,
    description text,
    exam_date timestamp without time zone NOT NULL,
    duration integer NOT NULL,
    total_marks double precision NOT NULL,
    passing_marks double precision NOT NULL,
    class_id integer NOT NULL,
    subject_id integer NOT NULL,
    created_by integer NOT NULL,
    status character varying(20),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 239 (class 1259 OID 82498)
-- Name: exams_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.exams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6121 (class 0 OID 0)
-- Dependencies: 239
-- Name: exams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.exams_id_seq OWNED BY public.exams.id;


--
-- TOC entry 373 (class 1259 OID 101161)
-- Name: external_exam_import_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_exam_import_logs (
    id integer NOT NULL,
    examination_id integer NOT NULL,
    import_type character varying(50) NOT NULL,
    import_source character varying(200) NOT NULL,
    batch_id character varying(50) NOT NULL,
    total_records integer,
    successful_imports integer,
    failed_imports integer,
    duplicate_records integer,
    import_status character varying(20),
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone,
    error_summary json,
    error_details text,
    created_by integer NOT NULL,
    created_at timestamp without time zone
);


--
-- TOC entry 372 (class 1259 OID 101160)
-- Name: external_exam_import_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.external_exam_import_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6122 (class 0 OID 0)
-- Dependencies: 372
-- Name: external_exam_import_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.external_exam_import_logs_id_seq OWNED BY public.external_exam_import_logs.id;


--
-- TOC entry 371 (class 1259 OID 101140)
-- Name: external_exam_registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_exam_registrations (
    id integer NOT NULL,
    examination_id integer NOT NULL,
    student_id integer NOT NULL,
    index_number character varying(50) NOT NULL,
    center_number character varying(20) NOT NULL,
    center_name character varying(200) NOT NULL,
    registration_date date NOT NULL,
    registration_status character varying(20),
    is_private_candidate boolean,
    registered_subjects json NOT NULL,
    registration_fee double precision,
    payment_status character varying(20),
    payment_date date,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 370 (class 1259 OID 101139)
-- Name: external_exam_registrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.external_exam_registrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6123 (class 0 OID 0)
-- Dependencies: 370
-- Name: external_exam_registrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.external_exam_registrations_id_seq OWNED BY public.external_exam_registrations.id;


--
-- TOC entry 385 (class 1259 OID 101297)
-- Name: external_exam_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_exam_results (
    id integer NOT NULL,
    examination_id integer NOT NULL,
    registration_id integer NOT NULL,
    student_id integer NOT NULL,
    subject_id integer NOT NULL,
    subject_code character varying(20) NOT NULL,
    raw_score double precision,
    percentage_score double precision,
    grade_symbol character varying(5) NOT NULL,
    grade_points double precision,
    result_status character varying(20),
    is_verified boolean,
    verification_date date,
    internal_grade_id integer,
    is_integrated boolean,
    integration_date timestamp without time zone,
    remarks text,
    special_considerations text,
    import_source character varying(100),
    import_date timestamp without time zone,
    import_batch_id character varying(50),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 384 (class 1259 OID 101296)
-- Name: external_exam_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.external_exam_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6124 (class 0 OID 0)
-- Dependencies: 384
-- Name: external_exam_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.external_exam_results_id_seq OWNED BY public.external_exam_results.id;


--
-- TOC entry 349 (class 1259 OID 100933)
-- Name: external_examinations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_examinations (
    id integer NOT NULL,
    exam_type public.externalexamtype NOT NULL,
    exam_year integer NOT NULL,
    exam_session public.examsession NOT NULL,
    exam_name character varying(200) NOT NULL,
    exam_code character varying(50) NOT NULL,
    registration_start_date date,
    registration_end_date date,
    exam_start_date date NOT NULL,
    exam_end_date date NOT NULL,
    result_release_date date,
    result_status public.resultstatus,
    auto_import_enabled boolean,
    last_import_date timestamp without time zone,
    import_source character varying(100),
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    created_by integer NOT NULL
);


--
-- TOC entry 348 (class 1259 OID 100932)
-- Name: external_examinations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.external_examinations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6125 (class 0 OID 0)
-- Dependencies: 348
-- Name: external_examinations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.external_examinations_id_seq OWNED BY public.external_examinations.id;


--
-- TOC entry 358 (class 1259 OID 100998)
-- Name: facilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facilities (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    facility_type public.facilitytype NOT NULL,
    location character varying(255) NOT NULL,
    capacity integer,
    area_sqm numeric(10,2),
    description text,
    status public.facilitystatus,
    floor_number character varying(10),
    building_name character varying(100),
    room_number character varying(20),
    last_maintenance_date date,
    next_maintenance_date date,
    created_by integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 357 (class 1259 OID 100997)
-- Name: facilities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.facilities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6126 (class 0 OID 0)
-- Dependencies: 357
-- Name: facilities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.facilities_id_seq OWNED BY public.facilities.id;


--
-- TOC entry 387 (class 1259 OID 101331)
-- Name: fee_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_payments (
    id integer NOT NULL,
    fee_record_id integer NOT NULL,
    amount_paid numeric(10,2) NOT NULL,
    payment_date date NOT NULL,
    payment_method character varying(50) NOT NULL,
    reference_number character varying(100) NOT NULL,
    receipt_number character varying(100) NOT NULL,
    bank_name character varying(100),
    cheque_number character varying(50),
    mobile_money_number character varying(20),
    notes text,
    processed_by integer NOT NULL,
    created_at timestamp without time zone
);


--
-- TOC entry 386 (class 1259 OID 101330)
-- Name: fee_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fee_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6127 (class 0 OID 0)
-- Dependencies: 386
-- Name: fee_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fee_payments_id_seq OWNED BY public.fee_payments.id;


--
-- TOC entry 377 (class 1259 OID 101206)
-- Name: fee_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_records (
    id integer NOT NULL,
    student_id integer NOT NULL,
    fee_structure_id integer NOT NULL,
    total_fee_amount numeric(10,2) NOT NULL,
    paid_amount numeric(10,2),
    discount_amount numeric(10,2),
    penalty_amount numeric(10,2),
    due_date date NOT NULL,
    status public.paymentstatus,
    scholarship_percentage numeric(5,2),
    scholarship_reason character varying(255),
    created_by integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 376 (class 1259 OID 101205)
-- Name: fee_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fee_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6128 (class 0 OID 0)
-- Dependencies: 376
-- Name: fee_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fee_records_id_seq OWNED BY public.fee_records.id;


--
-- TOC entry 356 (class 1259 OID 100986)
-- Name: fee_structures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_structures (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    grade_level character varying(50) NOT NULL,
    academic_year character varying(10) NOT NULL,
    term character varying(20) NOT NULL,
    tuition_fee numeric(10,2),
    registration_fee numeric(10,2),
    library_fee numeric(10,2),
    laboratory_fee numeric(10,2),
    sports_fee numeric(10,2),
    transport_fee numeric(10,2),
    uniform_fee numeric(10,2),
    examination_fee numeric(10,2),
    miscellaneous_fee numeric(10,2),
    total_fee numeric(10,2) NOT NULL,
    is_active boolean,
    created_by integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 355 (class 1259 OID 100985)
-- Name: fee_structures_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fee_structures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6129 (class 0 OID 0)
-- Dependencies: 355
-- Name: fee_structures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fee_structures_id_seq OWNED BY public.fee_structures.id;


--
-- TOC entry 285 (class 1259 OID 99930)
-- Name: final_grades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.final_grades (
    id integer NOT NULL,
    student_id integer NOT NULL,
    subject_id integer NOT NULL,
    grading_scheme_id integer NOT NULL,
    term character varying(20) NOT NULL,
    academic_year character varying(10) NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    class_score_average double precision,
    external_exam_score double precision,
    final_percentage double precision,
    final_grade_symbol character varying(5),
    final_grade_points double precision,
    is_passing boolean,
    class_rank integer,
    subject_rank integer,
    conduct_grade character varying(5),
    interest_grade character varying(5),
    teacher_remarks text,
    computed_at timestamp without time zone,
    computed_by integer,
    class_id integer NOT NULL
);


--
-- TOC entry 284 (class 1259 OID 99929)
-- Name: final_grades_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.final_grades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6130 (class 0 OID 0)
-- Dependencies: 284
-- Name: final_grades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.final_grades_id_seq OWNED BY public.final_grades.id;


--
-- TOC entry 281 (class 1259 OID 99886)
-- Name: grade_boundaries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grade_boundaries (
    id integer NOT NULL,
    grading_scheme_id integer NOT NULL,
    grade character varying(5) NOT NULL,
    min_score double precision NOT NULL,
    max_score double precision NOT NULL,
    grade_point double precision,
    interpretation character varying(100),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 280 (class 1259 OID 99885)
-- Name: grade_boundaries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.grade_boundaries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6131 (class 0 OID 0)
-- Dependencies: 280
-- Name: grade_boundaries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.grade_boundaries_id_seq OWNED BY public.grade_boundaries.id;


--
-- TOC entry 242 (class 1259 OID 82523)
-- Name: grades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grades (
    id integer NOT NULL,
    student_id integer NOT NULL,
    exam_id integer NOT NULL,
    marks_obtained double precision NOT NULL,
    percentage double precision NOT NULL,
    grade_letter character varying(5),
    remarks text,
    graded_by integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    subject_id integer,
    class_id integer,
    term character varying(20),
    academic_year character varying(20),
    assessment_type character varying(20),
    is_final boolean,
    weight double precision
);


--
-- TOC entry 241 (class 1259 OID 82522)
-- Name: grades_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.grades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6132 (class 0 OID 0)
-- Dependencies: 241
-- Name: grades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.grades_id_seq OWNED BY public.grades.id;


--
-- TOC entry 279 (class 1259 OID 99864)
-- Name: grading_schemes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grading_schemes (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    grading_standard_id integer NOT NULL,
    educational_level_id integer,
    subject_id integer,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 278 (class 1259 OID 99863)
-- Name: grading_schemes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.grading_schemes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6133 (class 0 OID 0)
-- Dependencies: 278
-- Name: grading_schemes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.grading_schemes_id_seq OWNED BY public.grading_schemes.id;


--
-- TOC entry 275 (class 1259 OID 99838)
-- Name: grading_standards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grading_standards (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20) NOT NULL,
    description text,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 274 (class 1259 OID 99837)
-- Name: grading_standards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.grading_standards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6134 (class 0 OID 0)
-- Dependencies: 274
-- Name: grading_standards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.grading_standards_id_seq OWNED BY public.grading_standards.id;


--
-- TOC entry 295 (class 1259 OID 100015)
-- Name: learning_approaches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learning_approaches (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    methodology text,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 294 (class 1259 OID 100014)
-- Name: learning_approaches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.learning_approaches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6135 (class 0 OID 0)
-- Dependencies: 294
-- Name: learning_approaches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.learning_approaches_id_seq OWNED BY public.learning_approaches.id;


--
-- TOC entry 351 (class 1259 OID 100945)
-- Name: learning_objectives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learning_objectives (
    id integer NOT NULL,
    curriculum_id integer NOT NULL,
    objective_code character varying(20) NOT NULL,
    objective_text text NOT NULL,
    objective_type public.learningobjectivetype NOT NULL,
    core_competency_ids json,
    subject_competency_ids json,
    assessment_criteria json,
    performance_indicators json,
    sequence_order integer NOT NULL,
    prerequisite_objectives json,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 350 (class 1259 OID 100944)
-- Name: learning_objectives_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.learning_objectives_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6136 (class 0 OID 0)
-- Dependencies: 350
-- Name: learning_objectives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.learning_objectives_id_seq OWNED BY public.learning_objectives.id;


--
-- TOC entry 252 (class 1259 OID 90844)
-- Name: lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lessons (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    date date NOT NULL,
    status character varying(50),
    materials json,
    class_id integer NOT NULL,
    teacher_id integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 251 (class 1259 OID 90843)
-- Name: lessons_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lessons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6137 (class 0 OID 0)
-- Dependencies: 251
-- Name: lessons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lessons_id_seq OWNED BY public.lessons.id;


--
-- TOC entry 222 (class 1259 OID 82335)
-- Name: login_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    login_timestamp timestamp without time zone NOT NULL,
    ip_address character varying(45),
    user_agent character varying(255),
    success boolean NOT NULL
);


--
-- TOC entry 221 (class 1259 OID 82334)
-- Name: login_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.login_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6138 (class 0 OID 0)
-- Dependencies: 221
-- Name: login_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.login_history_id_seq OWNED BY public.login_history.id;


--
-- TOC entry 379 (class 1259 OID 101228)
-- Name: maintenance_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maintenance_requests (
    id integer NOT NULL,
    facility_id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text NOT NULL,
    priority public.maintenancepriority,
    status public.maintenancestatus,
    reported_date date NOT NULL,
    scheduled_date date,
    completed_date date,
    estimated_cost numeric(10,2),
    actual_cost numeric(10,2),
    reported_by integer NOT NULL,
    assigned_to integer,
    contractor_name character varying(255),
    contractor_contact character varying(50),
    notes text,
    completion_notes text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 378 (class 1259 OID 101227)
-- Name: maintenance_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.maintenance_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6139 (class 0 OID 0)
-- Dependencies: 378
-- Name: maintenance_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.maintenance_requests_id_seq OWNED BY public.maintenance_requests.id;


--
-- TOC entry 238 (class 1259 OID 82485)
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id character varying(36) NOT NULL,
    title character varying(100) NOT NULL,
    "time" timestamp without time zone,
    read boolean,
    type character varying(20) NOT NULL,
    user_id integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    message text NOT NULL
);


--
-- TOC entry 237 (class 1259 OID 82484)
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6140 (class 0 OID 0)
-- Dependencies: 237
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- TOC entry 224 (class 1259 OID 82347)
-- Name: parents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parents (
    id integer NOT NULL,
    user_id integer NOT NULL,
    occupation character varying(100),
    address character varying(255),
    emergency_contact character varying(20),
    relationship character varying(50),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 223 (class 1259 OID 82346)
-- Name: parents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.parents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6141 (class 0 OID 0)
-- Dependencies: 223
-- Name: parents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.parents_id_seq OWNED BY public.parents.id;


--
-- TOC entry 289 (class 1259 OID 99963)
-- Name: proficiency_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proficiency_levels (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    level_number integer NOT NULL,
    description text,
    color_code character varying(7),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 288 (class 1259 OID 99962)
-- Name: proficiency_levels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proficiency_levels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6142 (class 0 OID 0)
-- Dependencies: 288
-- Name: proficiency_levels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proficiency_levels_id_seq OWNED BY public.proficiency_levels.id;


--
-- TOC entry 254 (class 1259 OID 90863)
-- Name: resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resources (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    url character varying(512),
    file_path character varying(512),
    description text,
    class_id integer NOT NULL,
    teacher_id integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 253 (class 1259 OID 90862)
-- Name: resources_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.resources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6143 (class 0 OID 0)
-- Dependencies: 253
-- Name: resources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.resources_id_seq OWNED BY public.resources.id;


--
-- TOC entry 218 (class 1259 OID 82315)
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description character varying(255),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 217 (class 1259 OID 82314)
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6144 (class 0 OID 0)
-- Dependencies: 217
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- TOC entry 325 (class 1259 OID 100356)
-- Name: school_based_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.school_based_assessments (
    id integer NOT NULL,
    student_id integer NOT NULL,
    subject_id integer NOT NULL,
    class_id integer NOT NULL,
    academic_year character varying(20) NOT NULL,
    term character varying(20) NOT NULL,
    class_exercises_score double precision DEFAULT 0.0,
    homework_score double precision DEFAULT 0.0,
    project_score double precision DEFAULT 0.0,
    assignment_score double precision DEFAULT 0.0,
    class_test_scores json,
    class_test_average double precision DEFAULT 0.0,
    total_sba_score double precision DEFAULT 0.0,
    sba_percentage double precision DEFAULT 0.0,
    core_competencies_score json,
    subject_competencies_score json,
    teacher_id integer NOT NULL,
    assessment_date date NOT NULL,
    is_moderated boolean DEFAULT false,
    moderated_by integer,
    moderation_date date,
    moderation_comments text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 324 (class 1259 OID 100355)
-- Name: school_based_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.school_based_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6145 (class 0 OID 0)
-- Dependencies: 324
-- Name: school_based_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.school_based_assessments_id_seq OWNED BY public.school_based_assessments.id;


--
-- TOC entry 317 (class 1259 OID 100242)
-- Name: stem_assessment_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stem_assessment_results (
    id integer NOT NULL,
    assessment_id integer NOT NULL,
    student_id integer NOT NULL,
    scientific_method_score double precision NOT NULL,
    technical_skills_score double precision NOT NULL,
    innovation_creativity_score double precision NOT NULL,
    communication_score double precision NOT NULL,
    total_score double precision NOT NULL,
    percentage double precision NOT NULL,
    grade_letter character varying(5) NOT NULL,
    strengths text,
    areas_for_improvement text,
    teacher_comments text,
    competencies_demonstrated json,
    competency_levels json,
    assessed_by integer NOT NULL,
    assessment_date timestamp without time zone NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 316 (class 1259 OID 100241)
-- Name: stem_assessment_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stem_assessment_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6146 (class 0 OID 0)
-- Dependencies: 316
-- Name: stem_assessment_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stem_assessment_results_id_seq OWNED BY public.stem_assessment_results.id;


--
-- TOC entry 315 (class 1259 OID 100223)
-- Name: stem_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stem_assessments (
    id integer NOT NULL,
    learning_module_id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    assessment_type character varying(50) NOT NULL,
    scientific_method_weight double precision,
    technical_skills_weight double precision,
    innovation_creativity_weight double precision,
    communication_weight double precision,
    total_marks double precision NOT NULL,
    duration_minutes integer,
    requires_presentation boolean,
    requires_demonstration boolean,
    rubric_criteria json,
    success_indicators json,
    is_active boolean,
    created_by integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 314 (class 1259 OID 100222)
-- Name: stem_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stem_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6147 (class 0 OID 0)
-- Dependencies: 314
-- Name: stem_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stem_assessments_id_seq OWNED BY public.stem_assessments.id;


--
-- TOC entry 293 (class 1259 OID 100002)
-- Name: stem_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stem_domains (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(10) NOT NULL,
    description text,
    color_code character varying(7),
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 292 (class 1259 OID 100001)
-- Name: stem_domains_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stem_domains_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6148 (class 0 OID 0)
-- Dependencies: 292
-- Name: stem_domains_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stem_domains_id_seq OWNED BY public.stem_domains.id;


--
-- TOC entry 311 (class 1259 OID 100180)
-- Name: stem_learning_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stem_learning_modules (
    id integer NOT NULL,
    stem_subject_id integer NOT NULL,
    educational_level_id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    learning_objectives json,
    primary_approach character varying(50) NOT NULL,
    secondary_approaches json,
    duration_weeks integer NOT NULL,
    sequence_order integer NOT NULL,
    term character varying(20) NOT NULL,
    required_materials json,
    technology_requirements json,
    safety_considerations text,
    formative_assessment_percentage double precision,
    summative_assessment_percentage double precision,
    is_active boolean,
    created_by integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 310 (class 1259 OID 100179)
-- Name: stem_learning_modules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stem_learning_modules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6149 (class 0 OID 0)
-- Dependencies: 310
-- Name: stem_learning_modules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stem_learning_modules_id_seq OWNED BY public.stem_learning_modules.id;


--
-- TOC entry 333 (class 1259 OID 100782)
-- Name: stem_project_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stem_project_submissions (
    id integer NOT NULL,
    project_id integer NOT NULL,
    student_id integer NOT NULL,
    group_members json,
    is_group_leader boolean,
    submission_date timestamp without time zone NOT NULL,
    project_title character varying(200) NOT NULL,
    project_description text NOT NULL,
    documentation_file character varying(255),
    presentation_file character varying(255),
    prototype_images json,
    video_demonstration character varying(255),
    challenges_faced text,
    lessons_learned text,
    future_improvements text,
    status character varying(20),
    teacher_feedback text,
    peer_feedback json,
    total_score double precision,
    innovation_score double precision,
    technical_score double precision,
    presentation_score double precision,
    collaboration_score double precision,
    graded_by integer,
    graded_at timestamp without time zone,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 332 (class 1259 OID 100781)
-- Name: stem_project_submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stem_project_submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6150 (class 0 OID 0)
-- Dependencies: 332
-- Name: stem_project_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stem_project_submissions_id_seq OWNED BY public.stem_project_submissions.id;


--
-- TOC entry 313 (class 1259 OID 100204)
-- Name: stem_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stem_projects (
    id integer NOT NULL,
    learning_module_id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text NOT NULL,
    problem_statement text NOT NULL,
    is_individual boolean,
    is_group boolean,
    max_group_size integer,
    duration_days integer NOT NULL,
    milestones json,
    required_resources json,
    expected_deliverables json,
    evaluation_criteria json,
    industry_connections json,
    community_impact text,
    sustainability_focus boolean,
    difficulty_level character varying(20),
    is_active boolean,
    created_by integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 312 (class 1259 OID 100203)
-- Name: stem_projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stem_projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6151 (class 0 OID 0)
-- Dependencies: 312
-- Name: stem_projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stem_projects_id_seq OWNED BY public.stem_projects.id;


--
-- TOC entry 321 (class 1259 OID 100280)
-- Name: stem_resource_bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stem_resource_bookings (
    id integer NOT NULL,
    resource_id integer NOT NULL,
    booked_by integer NOT NULL,
    booking_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    quantity_requested integer,
    purpose text NOT NULL,
    class_id integer,
    status character varying(20),
    approved_by integer,
    approval_date timestamp without time zone,
    rejection_reason text,
    actual_usage_notes text,
    condition_after_use character varying(50),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 320 (class 1259 OID 100279)
-- Name: stem_resource_bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stem_resource_bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6152 (class 0 OID 0)
-- Dependencies: 320
-- Name: stem_resource_bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stem_resource_bookings_id_seq OWNED BY public.stem_resource_bookings.id;


--
-- TOC entry 319 (class 1259 OID 100266)
-- Name: stem_resource_center; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stem_resource_center (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    resource_type character varying(50) NOT NULL,
    stem_domains json NOT NULL,
    educational_levels json NOT NULL,
    total_quantity integer,
    available_quantity integer,
    location character varying(100),
    usage_instructions text,
    safety_guidelines text,
    maintenance_schedule json,
    file_path character varying(255),
    external_url character varying(500),
    access_requirements json,
    is_active boolean,
    created_by integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 318 (class 1259 OID 100265)
-- Name: stem_resource_center_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stem_resource_center_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6153 (class 0 OID 0)
-- Dependencies: 318
-- Name: stem_resource_center_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stem_resource_center_id_seq OWNED BY public.stem_resource_center.id;


--
-- TOC entry 297 (class 1259 OID 100026)
-- Name: stem_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stem_subjects (
    id integer NOT NULL,
    subject_id integer NOT NULL,
    stem_domain_id integer NOT NULL,
    educational_level_id integer NOT NULL,
    integration_level character varying(20) NOT NULL,
    practical_hours_per_week integer,
    theory_hours_per_week integer,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 296 (class 1259 OID 100025)
-- Name: stem_subjects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stem_subjects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6154 (class 0 OID 0)
-- Dependencies: 296
-- Name: stem_subjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stem_subjects_id_seq OWNED BY public.stem_subjects.id;


--
-- TOC entry 273 (class 1259 OID 99809)
-- Name: student_competency_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_competency_assessments (
    id integer NOT NULL,
    student_id integer NOT NULL,
    competency_id integer NOT NULL,
    assessment_date date NOT NULL,
    proficiency_level character varying(20) NOT NULL,
    score double precision,
    evidence text,
    teacher_id integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 272 (class 1259 OID 99808)
-- Name: student_competency_assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_competency_assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6155 (class 0 OID 0)
-- Dependencies: 272
-- Name: student_competency_assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_competency_assessments_id_seq OWNED BY public.student_competency_assessments.id;


--
-- TOC entry 327 (class 1259 OID 100722)
-- Name: student_competency_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_competency_profiles (
    id integer NOT NULL,
    student_id integer NOT NULL,
    academic_year character varying(20) NOT NULL,
    communication_collaboration_score double precision,
    critical_thinking_score double precision,
    creativity_innovation_score double precision,
    cultural_identity_score double precision,
    personal_development_score double precision,
    digital_literacy_score double precision,
    overall_competency_level public.proficiencylevel,
    overall_score double precision,
    strengths json,
    areas_for_improvement json,
    recommended_activities json,
    teacher_comments text,
    parent_feedback text,
    last_updated timestamp without time zone,
    updated_by integer NOT NULL,
    CONSTRAINT overall_score_range_check CHECK (((overall_score >= (0)::double precision) AND (overall_score <= (4)::double precision)))
);


--
-- TOC entry 326 (class 1259 OID 100721)
-- Name: student_competency_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_competency_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6156 (class 0 OID 0)
-- Dependencies: 326
-- Name: student_competency_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_competency_profiles_id_seq OWNED BY public.student_competency_profiles.id;


--
-- TOC entry 347 (class 1259 OID 100895)
-- Name: student_progressions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_progressions (
    id integer NOT NULL,
    student_id integer NOT NULL,
    academic_year character varying(20) NOT NULL,
    current_level_id integer NOT NULL,
    next_level_id integer,
    overall_academic_average double precision NOT NULL,
    attendance_percentage double precision NOT NULL,
    core_competencies_average double precision NOT NULL,
    character_development_score double precision NOT NULL,
    english_score double precision,
    mathematics_score double precision,
    science_score double precision,
    meets_academic_threshold boolean,
    meets_attendance_threshold boolean,
    meets_competency_threshold boolean,
    meets_age_requirement boolean,
    promotion_status public.promotionstatus NOT NULL,
    promotion_decision_date date NOT NULL,
    decision_rationale text,
    requires_remedial_support boolean,
    remedial_subjects json,
    intervention_plan text,
    recommended_by integer NOT NULL,
    approved_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    CONSTRAINT student_progressions_attendance_percentage_check CHECK (((attendance_percentage >= (0)::double precision) AND (attendance_percentage <= (100)::double precision))),
    CONSTRAINT student_progressions_character_development_score_check CHECK (((character_development_score >= (1)::double precision) AND (character_development_score <= (4)::double precision))),
    CONSTRAINT student_progressions_core_competencies_average_check CHECK (((core_competencies_average >= (1)::double precision) AND (core_competencies_average <= (4)::double precision))),
    CONSTRAINT student_progressions_overall_academic_average_check CHECK (((overall_academic_average >= (0)::double precision) AND (overall_academic_average <= (100)::double precision)))
);


--
-- TOC entry 346 (class 1259 OID 100894)
-- Name: student_progressions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_progressions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6157 (class 0 OID 0)
-- Dependencies: 346
-- Name: student_progressions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_progressions_id_seq OWNED BY public.student_progressions.id;


--
-- TOC entry 230 (class 1259 OID 82391)
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id integer NOT NULL,
    user_id integer NOT NULL,
    admission_number character varying(20) NOT NULL,
    date_of_birth date NOT NULL,
    gender character varying(10) NOT NULL,
    address character varying(255),
    class_id integer,
    parent_id integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    profile_picture character varying(255),
    surname character varying(100),
    place_of_birth character varying(255),
    religious_denomination character varying(100),
    telephone character varying(20),
    whatsapp character varying(20),
    postal_address character varying(255),
    digital_address character varying(100),
    city character varying(100),
    country character varying(100),
    residential_address character varying(255),
    local_landmark character varying(255),
    special_circumstance text,
    allergies text,
    medication text,
    physician_name character varying(100),
    physician_phone character varying(20),
    previous_school character varying(255),
    previous_class character varying(50),
    previous_team character varying(100),
    previous_year character varying(10),
    father_name character varying(100),
    father_contact character varying(20),
    father_address character varying(255),
    father_email character varying(100),
    father_profession character varying(100),
    father_workplace character varying(255),
    mother_name character varying(100),
    mother_contact character varying(20),
    mother_address character varying(255),
    mother_profession character varying(100),
    mother_workplace character varying(255),
    mother_email character varying(100),
    name character varying(200),
    email character varying(100),
    phone character varying(20),
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    middle_name character varying(100),
    status character varying(20),
    nationality character varying(100),
    blood_group character varying(10),
    emergency_contact_name character varying(100),
    emergency_contact_phone character varying(20),
    emergency_contact_relationship character varying(50),
    enrollment_date date,
    graduation_date date,
    extracurricular_activities text,
    achievements text,
    student_id_number character varying(50),
    preferred_name character varying(100),
    birth_certificate_number character varying(50),
    passport_number character varying(50),
    passport_expiry date,
    primary_language character varying(50),
    secondary_language character varying(50),
    height double precision,
    weight double precision,
    blood_pressure character varying(20),
    vision character varying(20),
    hearing character varying(20),
    immunization_status text,
    learning_style character varying(50),
    special_needs text,
    academic_strengths text,
    academic_weaknesses text,
    career_aspirations text,
    guardian_name character varying(100),
    guardian_relationship character varying(50),
    guardian_contact character varying(20),
    guardian_email character varying(100),
    guardian_address character varying(255),
    fee_category character varying(50),
    scholarship_details text,
    payment_method character varying(50),
    medical_conditions text,
    awards_achievements text,
    standardized_test_scores text,
    secondary_contact_name character varying(100),
    secondary_contact_phone character varying(20),
    secondary_contact_relationship character varying(50),
    individualized_education_plan boolean DEFAULT false,
    iep_details text,
    student_email character varying(100),
    library_card_number character varying(50)
);


--
-- TOC entry 229 (class 1259 OID 82390)
-- Name: students_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.students_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6158 (class 0 OID 0)
-- Dependencies: 229
-- Name: students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.students_id_seq OWNED BY public.students.id;


--
-- TOC entry 232 (class 1259 OID 82415)
-- Name: subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subjects (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20) NOT NULL,
    description text,
    credit_hours double precision NOT NULL,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    department_id integer
);


--
-- TOC entry 231 (class 1259 OID 82414)
-- Name: subjects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subjects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6159 (class 0 OID 0)
-- Dependencies: 231
-- Name: subjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subjects_id_seq OWNED BY public.subjects.id;


--
-- TOC entry 248 (class 1259 OID 90799)
-- Name: teacher_attendances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teacher_attendances (
    id integer NOT NULL,
    teacher_id integer NOT NULL,
    date date NOT NULL,
    status character varying(20) NOT NULL,
    note text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 247 (class 1259 OID 90798)
-- Name: teacher_attendances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.teacher_attendances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6160 (class 0 OID 0)
-- Dependencies: 247
-- Name: teacher_attendances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.teacher_attendances_id_seq OWNED BY public.teacher_attendances.id;


--
-- TOC entry 233 (class 1259 OID 82425)
-- Name: teacher_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teacher_subjects (
    teacher_id integer NOT NULL,
    subject_id integer NOT NULL,
    assigned_date timestamp without time zone,
    is_primary boolean
);


--
-- TOC entry 226 (class 1259 OID 82361)
-- Name: teachers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teachers (
    id integer NOT NULL,
    user_id integer NOT NULL,
    employee_id character varying(20) NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    date_of_birth date,
    gender character varying(10),
    address character varying(255),
    phone_number character varying(20),
    qualification character varying(100),
    specialization character varying(100),
    joining_date date,
    status character varying(20),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 225 (class 1259 OID 82360)
-- Name: teachers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.teachers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6161 (class 0 OID 0)
-- Dependencies: 225
-- Name: teachers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.teachers_id_seq OWNED BY public.teachers.id;


--
-- TOC entry 375 (class 1259 OID 101180)
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    transaction_type public.transactiontype NOT NULL,
    category character varying(100) NOT NULL,
    description character varying(255) NOT NULL,
    amount numeric(10,2) NOT NULL,
    transaction_date date NOT NULL,
    reference_number character varying(50) NOT NULL,
    payment_method character varying(50),
    vendor_supplier character varying(255),
    receipt_number character varying(100),
    budget_id integer,
    created_by integer NOT NULL,
    approved_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 374 (class 1259 OID 101179)
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6162 (class 0 OID 0)
-- Dependencies: 374
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- TOC entry 246 (class 1259 OID 90778)
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    user_id integer NOT NULL,
    role_id integer NOT NULL
);


--
-- TOC entry 220 (class 1259 OID 82324)
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(80) NOT NULL,
    email character varying(120) NOT NULL,
    password_hash character varying(128) NOT NULL,
    role character varying(20),
    status character varying(20),
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    last_login timestamp without time zone
);


--
-- TOC entry 219 (class 1259 OID 82323)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6163 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 341 (class 1259 OID 100858)
-- Name: values_education_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.values_education_resources (
    id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    resource_type character varying(50),
    format character varying(20),
    language character varying(20),
    educational_level_id integer,
    character_domains json,
    content_url character varying(500),
    duration_minutes integer,
    difficulty_level character varying(20),
    cultural_background character varying(100),
    moral_lessons json,
    discussion_questions json,
    usage_count integer,
    average_rating double precision,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- TOC entry 340 (class 1259 OID 100857)
-- Name: values_education_resources_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.values_education_resources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 6164 (class 0 OID 0)
-- Dependencies: 340
-- Name: values_education_resources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.values_education_resources_id_seq OWNED BY public.values_education_resources.id;


--
-- TOC entry 5295 (class 2604 OID 101067)
-- Name: activity_implementations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_implementations ALTER COLUMN id SET DEFAULT nextval('public.activity_implementations_id_seq'::regclass);


--
-- TOC entry 5230 (class 2604 OID 90828)
-- Name: announcements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements ALTER COLUMN id SET DEFAULT nextval('public.announcements_id_seq'::regclass);


--
-- TOC entry 5287 (class 2604 OID 100889)
-- Name: assessment_analytics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_analytics ALTER COLUMN id SET DEFAULT nextval('public.assessment_analytics_id_seq'::regclass);


--
-- TOC entry 5258 (class 2604 OID 100116)
-- Name: assessment_frameworks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_frameworks ALTER COLUMN id SET DEFAULT nextval('public.assessment_frameworks_id_seq'::regclass);


--
-- TOC entry 5254 (class 2604 OID 100062)
-- Name: assessment_frequencies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_frequencies ALTER COLUMN id SET DEFAULT nextval('public.assessment_frequencies_id_seq'::regclass);


--
-- TOC entry 5256 (class 2604 OID 100092)
-- Name: assessment_modes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_modes ALTER COLUMN id SET DEFAULT nextval('public.assessment_modes_id_seq'::regclass);


--
-- TOC entry 5296 (class 2604 OID 101091)
-- Name: assessment_rubrics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_rubrics ALTER COLUMN id SET DEFAULT nextval('public.assessment_rubrics_id_seq'::regclass);


--
-- TOC entry 5305 (class 2604 OID 101276)
-- Name: assessment_scores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_scores ALTER COLUMN id SET DEFAULT nextval('public.assessment_scores_id_seq'::regclass);


--
-- TOC entry 5297 (class 2604 OID 101105)
-- Name: assessment_submissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_submissions ALTER COLUMN id SET DEFAULT nextval('public.assessment_submissions_id_seq'::regclass);


--
-- TOC entry 5286 (class 2604 OID 100875)
-- Name: assessment_tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_tasks ALTER COLUMN id SET DEFAULT nextval('public.assessment_tasks_id_seq'::regclass);


--
-- TOC entry 5242 (class 2604 OID 99854)
-- Name: assessment_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_types ALTER COLUMN id SET DEFAULT nextval('public.assessment_types_id_seq'::regclass);


--
-- TOC entry 5304 (class 2604 OID 101255)
-- Name: assets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets ALTER COLUMN id SET DEFAULT nextval('public.assets_id_seq'::regclass);


--
-- TOC entry 5236 (class 2604 OID 90961)
-- Name: assignment_submissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_submissions ALTER COLUMN id SET DEFAULT nextval('public.assignment_submissions_id_seq'::regclass);


--
-- TOC entry 5234 (class 2604 OID 90918)
-- Name: assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments ALTER COLUMN id SET DEFAULT nextval('public.assignments_id_seq'::regclass);


--
-- TOC entry 5225 (class 2604 OID 82459)
-- Name: attendances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendances ALTER COLUMN id SET DEFAULT nextval('public.attendances_id_seq'::regclass);


--
-- TOC entry 5291 (class 2604 OID 100977)
-- Name: budgets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets ALTER COLUMN id SET DEFAULT nextval('public.budgets_id_seq'::regclass);


--
-- TOC entry 5283 (class 2604 OID 100833)
-- Name: character_activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_activities ALTER COLUMN id SET DEFAULT nextval('public.character_activities_id_seq'::regclass);


--
-- TOC entry 5282 (class 2604 OID 100809)
-- Name: character_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_assessments ALTER COLUMN id SET DEFAULT nextval('public.character_assessments_id_seq'::regclass);


--
-- TOC entry 5284 (class 2604 OID 100847)
-- Name: character_development_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_development_plans ALTER COLUMN id SET DEFAULT nextval('public.character_development_plans_id_seq'::regclass);


--
-- TOC entry 5253 (class 2604 OID 100051)
-- Name: character_domains id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_domains ALTER COLUMN id SET DEFAULT nextval('public.character_domains_id_seq'::regclass);


--
-- TOC entry 5255 (class 2604 OID 100073)
-- Name: character_traits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_traits ALTER COLUMN id SET DEFAULT nextval('public.character_traits_id_seq'::regclass);


--
-- TOC entry 5220 (class 2604 OID 82382)
-- Name: classes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes ALTER COLUMN id SET DEFAULT nextval('public.classes_id_seq'::regclass);


--
-- TOC entry 5247 (class 2604 OID 99955)
-- Name: competency_domains id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competency_domains ALTER COLUMN id SET DEFAULT nextval('public.competency_domains_id_seq'::regclass);


--
-- TOC entry 5279 (class 2604 OID 100747)
-- Name: competency_evidence id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competency_evidence ALTER COLUMN id SET DEFAULT nextval('public.competency_evidence_id_seq'::regclass);


--
-- TOC entry 5249 (class 2604 OID 99979)
-- Name: competency_indicators id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competency_indicators ALTER COLUMN id SET DEFAULT nextval('public.competency_indicators_id_seq'::regclass);


--
-- TOC entry 5280 (class 2604 OID 100771)
-- Name: competency_learning_activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competency_learning_activities ALTER COLUMN id SET DEFAULT nextval('public.competency_learning_activities_id_seq'::regclass);


--
-- TOC entry 5265 (class 2604 OID 100325)
-- Name: continuous_assessment_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.continuous_assessment_records ALTER COLUMN id SET DEFAULT nextval('public.continuous_assessment_records_id_seq'::regclass);


--
-- TOC entry 5239 (class 2604 OID 99801)
-- Name: core_competencies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_competencies ALTER COLUMN id SET DEFAULT nextval('public.core_competencies_id_seq'::regclass);


--
-- TOC entry 5235 (class 2604 OID 90942)
-- Name: curricula id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curricula ALTER COLUMN id SET DEFAULT nextval('public.curricula_id_seq'::regclass);


--
-- TOC entry 5237 (class 2604 OID 90985)
-- Name: curriculum_units id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curriculum_units ALTER COLUMN id SET DEFAULT nextval('public.curriculum_units_id_seq'::regclass);


--
-- TOC entry 5233 (class 2604 OID 90885)
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- TOC entry 5298 (class 2604 OID 101124)
-- Name: differentiated_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.differentiated_assessments ALTER COLUMN id SET DEFAULT nextval('public.differentiated_assessments_id_seq'::regclass);


--
-- TOC entry 5257 (class 2604 OID 100105)
-- Name: differentiation_strategies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.differentiation_strategies ALTER COLUMN id SET DEFAULT nextval('public.differentiation_strategies_id_seq'::regclass);


--
-- TOC entry 5238 (class 2604 OID 99788)
-- Name: educational_levels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.educational_levels ALTER COLUMN id SET DEFAULT nextval('public.educational_levels_id_seq'::regclass);


--
-- TOC entry 5245 (class 2604 OID 99901)
-- Name: enhanced_grades id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enhanced_grades ALTER COLUMN id SET DEFAULT nextval('public.enhanced_grades_id_seq'::regclass);


--
-- TOC entry 5294 (class 2604 OID 101015)
-- Name: enhanced_sba id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enhanced_sba ALTER COLUMN id SET DEFAULT nextval('public.enhanced_sba_id_seq'::regclass);


--
-- TOC entry 5227 (class 2604 OID 82502)
-- Name: exams id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams ALTER COLUMN id SET DEFAULT nextval('public.exams_id_seq'::regclass);


--
-- TOC entry 5300 (class 2604 OID 101164)
-- Name: external_exam_import_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_exam_import_logs ALTER COLUMN id SET DEFAULT nextval('public.external_exam_import_logs_id_seq'::regclass);


--
-- TOC entry 5299 (class 2604 OID 101143)
-- Name: external_exam_registrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_exam_registrations ALTER COLUMN id SET DEFAULT nextval('public.external_exam_registrations_id_seq'::regclass);


--
-- TOC entry 5306 (class 2604 OID 101300)
-- Name: external_exam_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_exam_results ALTER COLUMN id SET DEFAULT nextval('public.external_exam_results_id_seq'::regclass);


--
-- TOC entry 5289 (class 2604 OID 100936)
-- Name: external_examinations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_examinations ALTER COLUMN id SET DEFAULT nextval('public.external_examinations_id_seq'::regclass);


--
-- TOC entry 5293 (class 2604 OID 101001)
-- Name: facilities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facilities ALTER COLUMN id SET DEFAULT nextval('public.facilities_id_seq'::regclass);


--
-- TOC entry 5307 (class 2604 OID 101334)
-- Name: fee_payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_payments ALTER COLUMN id SET DEFAULT nextval('public.fee_payments_id_seq'::regclass);


--
-- TOC entry 5302 (class 2604 OID 101209)
-- Name: fee_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_records ALTER COLUMN id SET DEFAULT nextval('public.fee_records_id_seq'::regclass);


--
-- TOC entry 5292 (class 2604 OID 100989)
-- Name: fee_structures id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_structures ALTER COLUMN id SET DEFAULT nextval('public.fee_structures_id_seq'::regclass);


--
-- TOC entry 5246 (class 2604 OID 99933)
-- Name: final_grades id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_grades ALTER COLUMN id SET DEFAULT nextval('public.final_grades_id_seq'::regclass);


--
-- TOC entry 5244 (class 2604 OID 99889)
-- Name: grade_boundaries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grade_boundaries ALTER COLUMN id SET DEFAULT nextval('public.grade_boundaries_id_seq'::regclass);


--
-- TOC entry 5228 (class 2604 OID 82526)
-- Name: grades id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grades ALTER COLUMN id SET DEFAULT nextval('public.grades_id_seq'::regclass);


--
-- TOC entry 5243 (class 2604 OID 99867)
-- Name: grading_schemes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grading_schemes ALTER COLUMN id SET DEFAULT nextval('public.grading_schemes_id_seq'::regclass);


--
-- TOC entry 5241 (class 2604 OID 99841)
-- Name: grading_standards id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grading_standards ALTER COLUMN id SET DEFAULT nextval('public.grading_standards_id_seq'::regclass);


--
-- TOC entry 5251 (class 2604 OID 100018)
-- Name: learning_approaches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_approaches ALTER COLUMN id SET DEFAULT nextval('public.learning_approaches_id_seq'::regclass);


--
-- TOC entry 5290 (class 2604 OID 100948)
-- Name: learning_objectives id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_objectives ALTER COLUMN id SET DEFAULT nextval('public.learning_objectives_id_seq'::regclass);


--
-- TOC entry 5231 (class 2604 OID 90847)
-- Name: lessons id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons ALTER COLUMN id SET DEFAULT nextval('public.lessons_id_seq'::regclass);


--
-- TOC entry 5217 (class 2604 OID 82338)
-- Name: login_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_history ALTER COLUMN id SET DEFAULT nextval('public.login_history_id_seq'::regclass);


--
-- TOC entry 5303 (class 2604 OID 101231)
-- Name: maintenance_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_requests ALTER COLUMN id SET DEFAULT nextval('public.maintenance_requests_id_seq'::regclass);


--
-- TOC entry 5226 (class 2604 OID 90747)
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- TOC entry 5218 (class 2604 OID 82350)
-- Name: parents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parents ALTER COLUMN id SET DEFAULT nextval('public.parents_id_seq'::regclass);


--
-- TOC entry 5248 (class 2604 OID 99966)
-- Name: proficiency_levels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proficiency_levels ALTER COLUMN id SET DEFAULT nextval('public.proficiency_levels_id_seq'::regclass);


--
-- TOC entry 5232 (class 2604 OID 90866)
-- Name: resources id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resources ALTER COLUMN id SET DEFAULT nextval('public.resources_id_seq'::regclass);


--
-- TOC entry 5215 (class 2604 OID 82318)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 5267 (class 2604 OID 100359)
-- Name: school_based_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_based_assessments ALTER COLUMN id SET DEFAULT nextval('public.school_based_assessments_id_seq'::regclass);


--
-- TOC entry 5262 (class 2604 OID 100245)
-- Name: stem_assessment_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_assessment_results ALTER COLUMN id SET DEFAULT nextval('public.stem_assessment_results_id_seq'::regclass);


--
-- TOC entry 5261 (class 2604 OID 100226)
-- Name: stem_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_assessments ALTER COLUMN id SET DEFAULT nextval('public.stem_assessments_id_seq'::regclass);


--
-- TOC entry 5250 (class 2604 OID 100005)
-- Name: stem_domains id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_domains ALTER COLUMN id SET DEFAULT nextval('public.stem_domains_id_seq'::regclass);


--
-- TOC entry 5259 (class 2604 OID 100183)
-- Name: stem_learning_modules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_learning_modules ALTER COLUMN id SET DEFAULT nextval('public.stem_learning_modules_id_seq'::regclass);


--
-- TOC entry 5281 (class 2604 OID 100785)
-- Name: stem_project_submissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_project_submissions ALTER COLUMN id SET DEFAULT nextval('public.stem_project_submissions_id_seq'::regclass);


--
-- TOC entry 5260 (class 2604 OID 100207)
-- Name: stem_projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_projects ALTER COLUMN id SET DEFAULT nextval('public.stem_projects_id_seq'::regclass);


--
-- TOC entry 5264 (class 2604 OID 100283)
-- Name: stem_resource_bookings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_resource_bookings ALTER COLUMN id SET DEFAULT nextval('public.stem_resource_bookings_id_seq'::regclass);


--
-- TOC entry 5263 (class 2604 OID 100269)
-- Name: stem_resource_center id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_resource_center ALTER COLUMN id SET DEFAULT nextval('public.stem_resource_center_id_seq'::regclass);


--
-- TOC entry 5252 (class 2604 OID 100029)
-- Name: stem_subjects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_subjects ALTER COLUMN id SET DEFAULT nextval('public.stem_subjects_id_seq'::regclass);


--
-- TOC entry 5240 (class 2604 OID 99812)
-- Name: student_competency_assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_competency_assessments ALTER COLUMN id SET DEFAULT nextval('public.student_competency_assessments_id_seq'::regclass);


--
-- TOC entry 5278 (class 2604 OID 100725)
-- Name: student_competency_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_competency_profiles ALTER COLUMN id SET DEFAULT nextval('public.student_competency_profiles_id_seq'::regclass);


--
-- TOC entry 5288 (class 2604 OID 100898)
-- Name: student_progressions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_progressions ALTER COLUMN id SET DEFAULT nextval('public.student_progressions_id_seq'::regclass);


--
-- TOC entry 5222 (class 2604 OID 82394)
-- Name: students id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students ALTER COLUMN id SET DEFAULT nextval('public.students_id_seq'::regclass);


--
-- TOC entry 5224 (class 2604 OID 82418)
-- Name: subjects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects ALTER COLUMN id SET DEFAULT nextval('public.subjects_id_seq'::regclass);


--
-- TOC entry 5229 (class 2604 OID 90802)
-- Name: teacher_attendances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_attendances ALTER COLUMN id SET DEFAULT nextval('public.teacher_attendances_id_seq'::regclass);


--
-- TOC entry 5219 (class 2604 OID 82364)
-- Name: teachers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers ALTER COLUMN id SET DEFAULT nextval('public.teachers_id_seq'::regclass);


--
-- TOC entry 5301 (class 2604 OID 101183)
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- TOC entry 5216 (class 2604 OID 82327)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5285 (class 2604 OID 100861)
-- Name: values_education_resources id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.values_education_resources ALTER COLUMN id SET DEFAULT nextval('public.values_education_resources_id_seq'::regclass);


--
-- TOC entry 6055 (class 0 OID 101064)
-- Dependencies: 363
-- Data for Name: activity_implementations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.activity_implementations (id, activity_id, class_id, teacher_id, implementation_date, actual_duration, participation_rate, effectiveness_rating, student_engagement, learning_outcomes_achieved, teacher_reflection, student_feedback, modifications_made, recommendations, created_at) FROM stdin;
\.


--
-- TOC entry 6053 (class 0 OID 101048)
-- Dependencies: 361
-- Data for Name: activity_traits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.activity_traits (activity_id, trait_id) FROM stdin;
\.


--
-- TOC entry 5958 (class 0 OID 99629)
-- Dependencies: 266
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alembic_version (version_num) FROM stdin;
5f46bd5ff7d0
add_remaining_cols
add_class_id_final
b00a1e3c02e9
add_assess_name_col
add_advanced_stem_tables
6a88585c4fbc
398b401a2e97
2847b2a927c7
\.


--
-- TOC entry 5937 (class 0 OID 90740)
-- Dependencies: 245
-- Data for Name: analytics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.analytics (id, metric_type, metric_name, metric_value, entity_type, entity_id, period_start, period_end, additional_data, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5942 (class 0 OID 90825)
-- Dependencies: 250
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.announcements (id, title, content, recipients, send_email, class_id, teacher_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6037 (class 0 OID 100886)
-- Dependencies: 345
-- Data for Name: assessment_analytics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assessment_analytics (id, analysis_type, entity_id, academic_year, term, average_score, median_score, score_distribution, competency_strengths, competency_gaps, performance_trend, trend_data, intervention_recommendations, enrichment_opportunities, ai_insights, generated_at, generated_by) FROM stdin;
\.


--
-- TOC entry 6001 (class 0 OID 100113)
-- Dependencies: 309
-- Data for Name: assessment_frameworks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assessment_frameworks (id, name, educational_level_id, subject_id, framework_type, description, assessment_criteria, scoring_rubric, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5993 (class 0 OID 100059)
-- Dependencies: 301
-- Data for Name: assessment_frequencies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assessment_frequencies (id, name, interval_days, description, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5997 (class 0 OID 100089)
-- Dependencies: 305
-- Data for Name: assessment_modes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assessment_modes (id, name, code, description, is_digital, requires_supervision, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6057 (class 0 OID 101088)
-- Dependencies: 365
-- Data for Name: assessment_rubrics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assessment_rubrics (id, task_id, criterion_name, description, excellent_descriptor, proficient_descriptor, developing_descriptor, beginning_descriptor, excellent_points, proficient_points, developing_points, beginning_points, weight_percentage, created_at) FROM stdin;
\.


--
-- TOC entry 6075 (class 0 OID 101273)
-- Dependencies: 383
-- Data for Name: assessment_scores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assessment_scores (id, submission_id, rubric_id, teacher_id, raw_score, percentage_score, grade_level, written_feedback, audio_feedback_url, criterion_scores, scored_at, is_final) FROM stdin;
\.


--
-- TOC entry 6059 (class 0 OID 101102)
-- Dependencies: 367
-- Data for Name: assessment_submissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assessment_submissions (id, task_id, student_id, submitted_at, submission_content, file_attachments, differentiation_applied, is_submitted, is_late, created_at) FROM stdin;
\.


--
-- TOC entry 6035 (class 0 OID 100872)
-- Dependencies: 343
-- Data for Name: assessment_tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assessment_tasks (id, title, description, framework_id, assessment_type, assessment_mode, scheduled_date, duration_minutes, is_differentiated, differentiation_strategies, total_marks, pass_mark, learning_objectives, competency_indicators, instructions, materials_needed, accessibility_features, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5969 (class 0 OID 99851)
-- Dependencies: 277
-- Data for Name: assessment_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assessment_types (id, name, code, weight_percentage, description, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6073 (class 0 OID 101252)
-- Dependencies: 381
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assets (id, facility_id, name, asset_tag, category, description, brand, model, serial_number, purchase_date, purchase_cost, current_value, condition, is_active, warranty_expiry, last_service_date, next_service_date, supplier_name, supplier_contact, created_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5955 (class 0 OID 90958)
-- Dependencies: 263
-- Data for Name: assignment_submissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assignment_submissions (id, assignment_id, student_id, submission_date, content, file_path, score, feedback, status, graded_by, graded_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5951 (class 0 OID 90915)
-- Dependencies: 259
-- Data for Name: assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assignments (id, title, description, class_id, subject_id, teacher_id, due_date, total_points, assignment_type, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5928 (class 0 OID 82456)
-- Dependencies: 236
-- Data for Name: attendances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attendances (id, student_id, class_id, subject_id, date, status, remarks, recorded_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6046 (class 0 OID 100974)
-- Dependencies: 354
-- Data for Name: budgets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.budgets (id, category, description, allocated_amount, spent_amount, remaining_amount, fiscal_year, quarter, department, created_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5936 (class 0 OID 82610)
-- Dependencies: 244
-- Data for Name: calendar_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.calendar_events (id, title, date, type, description, created_at, updated_at, created_by, location, start_time, end_time) FROM stdin;
cf46f76a-dd66-47c1-abe0-f22e1d000947	Math Final Exam	2025-06-21 05:40:22.166757	exam	Final examination for Mathematics	2025-06-06 05:40:22.1689	2025-06-06 05:40:22.1689	\N	\N	\N	\N
4c0a84c1-c2df-4597-9d5c-59d82d20bf15	Parent-Teacher Meeting	2025-06-13 05:40:22.166757	meeting	Discuss student progress with parents	2025-06-06 05:40:22.1689	2025-06-06 05:40:22.1689	\N	\N	\N	\N
8689ac0d-63d9-43ad-bc2f-9a804ed88861	Science Project Due	2025-06-16 05:40:22.166757	class	Submit final science projects	2025-06-06 05:40:22.1689	2025-06-06 05:40:22.1689	\N	\N	\N	\N
7730e664-2334-4696-a533-27585cb05e6a	School Holiday	2025-06-26 05:40:22.166757	holiday	Mid-term break	2025-06-06 05:40:22.1689	2025-06-06 05:40:22.1689	\N	\N	\N	\N
\.


--
-- TOC entry 6029 (class 0 OID 100830)
-- Dependencies: 337
-- Data for Name: character_activities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.character_activities (id, title, description, activity_type, duration_minutes, group_size, educational_level_id, subject_integration, primary_domain, materials_needed, preparation_time, assessment_method, cultural_context, local_proverbs, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6027 (class 0 OID 100806)
-- Dependencies: 335
-- Data for Name: character_assessments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.character_assessments (id, student_id, trait_id, teacher_id, assessment_date, frequency, score, evidence, context, teacher_comments, improvement_suggestions, parent_feedback, home_reinforcement_activities, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6031 (class 0 OID 100844)
-- Dependencies: 339
-- Data for Name: character_development_plans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.character_development_plans (id, student_id, academic_year, term, strengths, areas_for_growth, goals, strategies, baseline_assessment, mid_term_review, final_assessment, parent_involvement_plan, community_service_hours, peer_mentoring_activities, is_active, completion_status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5991 (class 0 OID 100048)
-- Dependencies: 299
-- Data for Name: character_domains; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.character_domains (id, name, description, cultural_context, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5995 (class 0 OID 100070)
-- Dependencies: 303
-- Data for Name: character_traits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.character_traits (id, name, domain_id, educational_level_id, description, behavioral_indicators, assessment_criteria, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5926 (class 0 OID 82440)
-- Dependencies: 234
-- Data for Name: class_subjects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.class_subjects (class_id, subject_id, assigned_date) FROM stdin;
\.


--
-- TOC entry 5920 (class 0 OID 82379)
-- Dependencies: 228
-- Data for Name: classes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.classes (id, name, grade_level, section, academic_year, capacity, teacher_id, created_at, updated_at, start_time, end_time, days, room, description, status, educational_level_id) FROM stdin;
39	Basic Two	2	A	2025	30	6	2025-08-01 09:13:03.611628	2025-08-01 09:13:03.611628	07:30	16:30	monday_to_friday	Kings		active	\N
40	Class One	1	\N	2025-2026	\N	\N	2025-08-29 02:43:55.615883	2025-08-29 02:43:55.615883	\N	\N	\N	1	\N	active	\N
\.


--
-- TOC entry 5979 (class 0 OID 99952)
-- Dependencies: 287
-- Data for Name: competency_domains; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.competency_domains (id, name, description, color_code, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6021 (class 0 OID 100744)
-- Dependencies: 329
-- Data for Name: competency_evidence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.competency_evidence (id, assessment_id, indicator_id, evidence_type, evidence_title, evidence_description, file_path, file_type, file_size, proficiency_demonstrated, observer_notes, subject_context, activity_context, collaboration_involved, collected_date, collected_by, created_at) FROM stdin;
\.


--
-- TOC entry 5983 (class 0 OID 99976)
-- Dependencies: 291
-- Data for Name: competency_indicators; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.competency_indicators (id, domain_id, educational_level_id, indicator_code, description, proficiency_level_id, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6023 (class 0 OID 100768)
-- Dependencies: 331
-- Data for Name: competency_learning_activities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.competency_learning_activities (id, activity_name, activity_description, activity_type, target_competencies, target_indicators, primary_domain, suitable_educational_levels, subject_integration, duration_minutes, group_size_min, group_size_max, resources_required, assessment_rubric, success_indicators, is_active, created_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6015 (class 0 OID 100322)
-- Dependencies: 323
-- Data for Name: continuous_assessment_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.continuous_assessment_records (id, student_id, subject_id, class_id, teacher_id, academic_year, term, week_number, assessment_date, assessment_focus, class_score, homework_score, participation_score, quiz_score, competencies_demonstrated, competency_levels, teacher_observations, learning_difficulties, strengths_noted, next_steps, support_needed, created_at) FROM stdin;
\.


--
-- TOC entry 5963 (class 0 OID 99798)
-- Dependencies: 271
-- Data for Name: core_competencies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.core_competencies (id, name, description, category, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5953 (class 0 OID 90939)
-- Dependencies: 261
-- Data for Name: curricula; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.curricula (id, title, description, grade_level, subject_id, academic_year, created_by, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6044 (class 0 OID 100958)
-- Dependencies: 352
-- Data for Name: curriculum_competencies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.curriculum_competencies (curriculum_id, competency_id, weight_percentage, created_at) FROM stdin;
\.


--
-- TOC entry 5957 (class 0 OID 90982)
-- Dependencies: 265
-- Data for Name: curriculum_units; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.curriculum_units (id, curriculum_id, title, description, objectives, resources, duration_weeks, sequence_order, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5935 (class 0 OID 82605)
-- Dependencies: 243
-- Data for Name: dashboard_statistics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dashboard_statistics (id, title, value, change_value, change_is_positive, color, role, created_at, updated_at) FROM stdin;
5eee668f-9441-4607-846e-94255dabc3bf	Total Students	300	5.2	t	primary	\N	2025-06-06 05:40:22.15875	2025-06-06 05:40:22.15875
16572e9b-efa3-492c-9629-b887881cc37b	Total Teachers	15	2.1	t	success	\N	2025-06-06 05:40:22.15875	2025-06-06 05:40:22.15875
5d71b28e-4029-4a5d-aa68-84818b736f8a	Total Parents	100	3.5	t	primary	\N	2025-06-06 05:40:22.15875	2025-06-06 05:40:22.15875
8625fddb-a569-48e1-a2d8-56ce8bfa7034	Attendance Rate	85%	1.2	t	warning	\N	2025-06-06 05:40:22.15875	2025-06-06 05:40:22.15875
\.


--
-- TOC entry 5949 (class 0 OID 90899)
-- Dependencies: 257
-- Data for Name: department_staff; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.department_staff (department_id, user_id, role, created_at) FROM stdin;
\.


--
-- TOC entry 5948 (class 0 OID 90882)
-- Dependencies: 256
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.departments (id, name, code, description, head_id, is_active, created_at, updated_at) FROM stdin;
1	Mathematics	M	Default department: Mathematics	\N	\N	\N	\N
2	Science	S	Default department: Science	\N	\N	\N	\N
3	Languages	L	Default department: Languages	\N	\N	\N	\N
4	Social Studies	SS	Default department: Social Studies	\N	\N	\N	\N
5	Arts	A	Default department: Arts	\N	\N	\N	\N
6	Physical Education	PE	Default department: Physical Education	\N	\N	\N	\N
7	Computer Science	CS	Default department: Computer Science	\N	\N	\N	\N
8	Business Studies	BS	Default department: Business Studies	\N	\N	\N	\N
9	Religious Studies	RS	Default department: Religious Studies	\N	\N	\N	\N
10	Technology	T	Default department: Technology	\N	\N	\N	\N
\.


--
-- TOC entry 6061 (class 0 OID 101121)
-- Dependencies: 369
-- Data for Name: differentiated_assessments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.differentiated_assessments (id, task_id, student_id, differentiation_type, modified_content, complexity_level, learning_modalities, pacing_adjustments, alternative_formats, choice_options, seating_arrangement, noise_level, lighting_needs, scaffolding_provided, assistive_technology, effectiveness_rating, student_feedback, teacher_notes, created_at) FROM stdin;
\.


--
-- TOC entry 5999 (class 0 OID 100102)
-- Dependencies: 307
-- Data for Name: differentiation_strategies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.differentiation_strategies (id, name, category, description, implementation_guide, target_learning_styles, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5961 (class 0 OID 99785)
-- Dependencies: 269
-- Data for Name: educational_levels; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.educational_levels (id, name, code, key_phase, age_range_start, age_range_end, description, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5975 (class 0 OID 99898)
-- Dependencies: 283
-- Data for Name: enhanced_grades; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.enhanced_grades (id, student_id, subject_id, assessment_type_id, grading_scheme_id, raw_score, weighted_score, grade, grade_point, assessment_date, teacher_id, term, academic_year, created_at, updated_at, class_id, assessment_name, total_marks, percentage, grade_symbol, grade_points, is_passing, weight, contributes_to_final, is_class_score, is_external_exam, teacher_comments, remedial_action) FROM stdin;
\.


--
-- TOC entry 6052 (class 0 OID 101012)
-- Dependencies: 360
-- Data for Name: enhanced_sba; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.enhanced_sba (id, student_id, subject_id, curriculum_id, academic_year, term, class_exercises_score, class_exercises_weight, homework_score, homework_weight, project_work_score, project_work_weight, class_tests_score, class_tests_weight, practical_work_score, practical_work_weight, oral_assessment_score, oral_assessment_weight, total_sba_score, sba_percentage, critical_thinking_score, creativity_score, communication_score, collaboration_score, character_traits_scores, assessed_by, last_updated, is_finalized, finalized_at) FROM stdin;
\.


--
-- TOC entry 5959 (class 0 OID 99769)
-- Dependencies: 267
-- Data for Name: event_role_association; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.event_role_association (event_id, role_id) FROM stdin;
\.


--
-- TOC entry 5932 (class 0 OID 82499)
-- Dependencies: 240
-- Data for Name: exams; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exams (id, title, description, exam_date, duration, total_marks, passing_marks, class_id, subject_id, created_by, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6065 (class 0 OID 101161)
-- Dependencies: 373
-- Data for Name: external_exam_import_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.external_exam_import_logs (id, examination_id, import_type, import_source, batch_id, total_records, successful_imports, failed_imports, duplicate_records, import_status, start_time, end_time, error_summary, error_details, created_by, created_at) FROM stdin;
\.


--
-- TOC entry 6063 (class 0 OID 101140)
-- Dependencies: 371
-- Data for Name: external_exam_registrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.external_exam_registrations (id, examination_id, student_id, index_number, center_number, center_name, registration_date, registration_status, is_private_candidate, registered_subjects, registration_fee, payment_status, payment_date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6077 (class 0 OID 101297)
-- Dependencies: 385
-- Data for Name: external_exam_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.external_exam_results (id, examination_id, registration_id, student_id, subject_id, subject_code, raw_score, percentage_score, grade_symbol, grade_points, result_status, is_verified, verification_date, internal_grade_id, is_integrated, integration_date, remarks, special_considerations, import_source, import_date, import_batch_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6041 (class 0 OID 100933)
-- Dependencies: 349
-- Data for Name: external_examinations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.external_examinations (id, exam_type, exam_year, exam_session, exam_name, exam_code, registration_start_date, registration_end_date, exam_start_date, exam_end_date, result_release_date, result_status, auto_import_enabled, last_import_date, import_source, created_at, updated_at, created_by) FROM stdin;
\.


--
-- TOC entry 6050 (class 0 OID 100998)
-- Dependencies: 358
-- Data for Name: facilities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.facilities (id, name, facility_type, location, capacity, area_sqm, description, status, floor_number, building_name, room_number, last_maintenance_date, next_maintenance_date, created_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6079 (class 0 OID 101331)
-- Dependencies: 387
-- Data for Name: fee_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fee_payments (id, fee_record_id, amount_paid, payment_date, payment_method, reference_number, receipt_number, bank_name, cheque_number, mobile_money_number, notes, processed_by, created_at) FROM stdin;
\.


--
-- TOC entry 6069 (class 0 OID 101206)
-- Dependencies: 377
-- Data for Name: fee_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fee_records (id, student_id, fee_structure_id, total_fee_amount, paid_amount, discount_amount, penalty_amount, due_date, status, scholarship_percentage, scholarship_reason, created_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6048 (class 0 OID 100986)
-- Dependencies: 356
-- Data for Name: fee_structures; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fee_structures (id, name, grade_level, academic_year, term, tuition_fee, registration_fee, library_fee, laboratory_fee, sports_fee, transport_fee, uniform_fee, examination_fee, miscellaneous_fee, total_fee, is_active, created_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5977 (class 0 OID 99930)
-- Dependencies: 285
-- Data for Name: final_grades; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.final_grades (id, student_id, subject_id, grading_scheme_id, term, academic_year, created_at, updated_at, class_score_average, external_exam_score, final_percentage, final_grade_symbol, final_grade_points, is_passing, class_rank, subject_rank, conduct_grade, interest_grade, teacher_remarks, computed_at, computed_by, class_id) FROM stdin;
\.


--
-- TOC entry 5973 (class 0 OID 99886)
-- Dependencies: 281
-- Data for Name: grade_boundaries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.grade_boundaries (id, grading_scheme_id, grade, min_score, max_score, grade_point, interpretation, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5934 (class 0 OID 82523)
-- Dependencies: 242
-- Data for Name: grades; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.grades (id, student_id, exam_id, marks_obtained, percentage, grade_letter, remarks, graded_by, created_at, updated_at, subject_id, class_id, term, academic_year, assessment_type, is_final, weight) FROM stdin;
\.


--
-- TOC entry 5971 (class 0 OID 99864)
-- Dependencies: 279
-- Data for Name: grading_schemes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.grading_schemes (id, name, grading_standard_id, educational_level_id, subject_id, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5967 (class 0 OID 99838)
-- Dependencies: 275
-- Data for Name: grading_standards; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.grading_standards (id, name, code, description, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5987 (class 0 OID 100015)
-- Dependencies: 295
-- Data for Name: learning_approaches; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.learning_approaches (id, name, description, methodology, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6043 (class 0 OID 100945)
-- Dependencies: 351
-- Data for Name: learning_objectives; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.learning_objectives (id, curriculum_id, objective_code, objective_text, objective_type, core_competency_ids, subject_competency_ids, assessment_criteria, performance_indicators, sequence_order, prerequisite_objectives, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5944 (class 0 OID 90844)
-- Dependencies: 252
-- Data for Name: lessons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lessons (id, title, description, date, status, materials, class_id, teacher_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5914 (class 0 OID 82335)
-- Dependencies: 222
-- Data for Name: login_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.login_history (id, user_id, login_timestamp, ip_address, user_agent, success) FROM stdin;
\.


--
-- TOC entry 6071 (class 0 OID 101228)
-- Dependencies: 379
-- Data for Name: maintenance_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.maintenance_requests (id, facility_id, title, description, priority, status, reported_date, scheduled_date, completed_date, estimated_cost, actual_cost, reported_by, assigned_to, contractor_name, contractor_contact, notes, completion_notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5930 (class 0 OID 82485)
-- Dependencies: 238
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, title, "time", read, type, user_id, created_at, updated_at, message) FROM stdin;
\.


--
-- TOC entry 5916 (class 0 OID 82347)
-- Dependencies: 224
-- Data for Name: parents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.parents (id, user_id, occupation, address, emergency_contact, relationship, created_at, updated_at) FROM stdin;
1	25	Accountant	5294 Pine Street, Hillcrest	+1-508-330-8377	Mother	2025-06-06 00:39:23.287547	2025-06-06 00:39:23.287547
2	26	Business Owner	4804 Elm Boulevard, Riverdale	+1-946-766-1627	Mother	2025-06-06 00:39:23.49853	2025-06-06 00:39:23.49853
3	27	Engineer	4745 Maple Road, Forestville	+1-686-909-5359	Guardian	2025-06-06 00:39:23.690078	2025-06-06 00:39:23.690078
4	28	Lawyer	9653 Pine Street, Springfield	+1-284-529-6328	Guardian	2025-06-06 00:39:23.876724	2025-06-06 00:39:23.876724
5	29	Engineer	3211 Pine Street, Lakeside	+1-693-985-4217	Father	2025-06-06 00:39:24.062077	2025-06-06 00:39:24.062077
6	30	Lawyer	8632 Cedar Lane, Lakeside	+1-694-934-8373	Mother	2025-06-06 00:39:24.265978	2025-06-06 00:39:24.265978
7	31	Lawyer	4963 Pine Street, Hillcrest	+1-500-493-8199	Guardian	2025-06-06 00:39:24.499597	2025-06-06 00:39:24.499597
8	32	Engineer	2390 Elm Boulevard, Hillcrest	+1-209-908-2662	Father	2025-06-06 00:39:24.722295	2025-06-06 00:39:24.722295
9	33	Teacher	4503 Elm Boulevard, Springfield	+1-364-185-6734	Guardian	2025-06-06 00:39:24.956836	2025-06-06 00:39:24.956836
10	34	Business Owner	8714 Pine Street, Lakeside	+1-564-762-3245	Mother	2025-06-06 00:39:25.175882	2025-06-06 00:39:25.175882
11	35	Engineer	5193 Pine Street, Forestville	+1-401-399-1387	Father	2025-06-06 00:39:25.395718	2025-06-06 00:39:25.395718
12	36	Accountant	6283 Cedar Lane, Riverdale	+1-838-896-4049	Guardian	2025-06-06 00:39:25.641057	2025-06-06 00:39:25.641057
13	37	Engineer	1619 Pine Street, Lakeside	+1-947-765-9517	Father	2025-06-06 00:39:25.854995	2025-06-06 00:39:25.854995
14	38	Engineer	6616 Cedar Lane, Riverdale	+1-570-714-6770	Guardian	2025-06-06 00:39:26.075088	2025-06-06 00:39:26.075088
15	39	Teacher	805 Cedar Lane, Forestville	+1-713-606-9356	Guardian	2025-06-06 00:39:26.29391	2025-06-06 00:39:26.29391
16	40	Lawyer	5219 Oak Avenue, Meadowbrook	+1-863-421-1588	Father	2025-06-06 00:39:26.498131	2025-06-06 00:39:26.498131
17	41	Accountant	8310 Cedar Lane, Riverdale	+1-752-245-6911	Father	2025-06-06 00:39:26.715918	2025-06-06 00:39:26.715918
18	42	Engineer	9957 Cedar Lane, Lakeside	+1-924-676-1593	Guardian	2025-06-06 00:39:26.924468	2025-06-06 00:39:26.924468
19	43	Doctor	7134 Elm Boulevard, Lakeside	+1-932-729-5851	Mother	2025-06-06 00:39:27.133794	2025-06-06 00:39:27.133794
20	44	Lawyer	5070 Maple Road, Lakeside	+1-498-308-5446	Mother	2025-06-06 00:39:27.332405	2025-06-06 00:39:27.332405
21	45	Business Owner	3970 Elm Boulevard, Meadowbrook	+1-465-714-3463	Guardian	2025-06-06 00:39:27.51938	2025-06-06 00:39:27.51938
22	46	Doctor	2517 Maple Road, Springfield	+1-899-745-6773	Father	2025-06-06 00:39:27.706698	2025-06-06 00:39:27.706698
23	47	Accountant	7666 Oak Avenue, Hillcrest	+1-473-225-2872	Guardian	2025-06-06 00:39:27.903035	2025-06-06 00:39:27.903035
24	48	Engineer	1381 Pine Street, Springfield	+1-408-834-7987	Mother	2025-06-06 00:39:28.097119	2025-06-06 00:39:28.097119
25	49	Accountant	8682 Cedar Lane, Forestville	+1-914-602-2595	Guardian	2025-06-06 00:39:28.285668	2025-06-06 00:39:28.285668
26	50	Engineer	2669 Main St, Forestville	+1-873-209-1948	Guardian	2025-06-06 00:39:28.520568	2025-06-06 00:39:28.520568
27	51	Teacher	9738 Main St, Forestville	+1-937-845-2618	Mother	2025-06-06 00:39:28.739434	2025-06-06 00:39:28.739434
28	52	Teacher	3057 Elm Boulevard, Forestville	+1-404-972-7956	Mother	2025-06-06 00:39:28.968829	2025-06-06 00:39:28.968829
29	53	Doctor	8726 Pine Street, Lakeside	+1-675-464-9972	Mother	2025-06-06 00:39:29.192599	2025-06-06 00:39:29.192599
30	54	Doctor	6131 Main St, Meadowbrook	+1-879-132-7643	Father	2025-06-06 00:39:29.412304	2025-06-06 00:39:29.412304
31	55	Accountant	5902 Pine Street, Riverdale	+1-706-237-7769	Father	2025-06-06 00:39:29.658849	2025-06-06 00:39:29.658849
32	56	Lawyer	2458 Oak Avenue, Meadowbrook	+1-789-228-3353	Father	2025-06-06 00:39:29.858983	2025-06-06 00:39:29.858983
33	57	Lawyer	9106 Main St, Riverdale	+1-418-632-8671	Mother	2025-06-06 00:39:30.081886	2025-06-06 00:39:30.081886
34	58	Engineer	1630 Pine Street, Hillcrest	+1-226-206-5277	Father	2025-06-06 00:39:30.30864	2025-06-06 00:39:30.30864
35	59	Lawyer	7994 Elm Boulevard, Hillcrest	+1-813-154-8017	Father	2025-06-06 00:39:30.604774	2025-06-06 00:39:30.604774
36	60	Teacher	1755 Cedar Lane, Lakeside	+1-942-929-8905	Mother	2025-06-06 00:39:30.826176	2025-06-06 00:39:30.826176
37	61	Engineer	5778 Elm Boulevard, Springfield	+1-577-360-4682	Mother	2025-06-06 00:39:31.037466	2025-06-06 00:39:31.037466
38	62	Lawyer	8484 Pine Street, Meadowbrook	+1-836-320-6998	Mother	2025-06-06 00:39:31.246694	2025-06-06 00:39:31.246694
39	63	Teacher	1377 Maple Road, Meadowbrook	+1-280-329-5726	Father	2025-06-06 00:39:31.455455	2025-06-06 00:39:31.455455
40	64	Lawyer	9075 Maple Road, Forestville	+1-780-646-5804	Guardian	2025-06-06 00:39:31.641196	2025-06-06 00:39:31.641196
41	65	Business Owner	6854 Pine Street, Lakeside	+1-222-556-6504	Mother	2025-06-06 00:39:31.830793	2025-06-06 00:39:31.830793
42	66	Doctor	5346 Maple Road, Forestville	+1-908-974-5737	Mother	2025-06-06 00:39:32.020243	2025-06-06 00:39:32.020243
43	67	Teacher	450 Maple Road, Hillcrest	+1-399-905-6090	Guardian	2025-06-06 00:39:32.211273	2025-06-06 00:39:32.211273
44	68	Engineer	3666 Main St, Riverdale	+1-888-324-6967	Father	2025-06-06 00:39:32.423613	2025-06-06 00:39:32.423613
45	69	Engineer	9828 Main St, Riverdale	+1-646-434-5412	Mother	2025-06-06 00:39:32.680483	2025-06-06 00:39:32.680483
46	70	Accountant	7023 Pine Street, Meadowbrook	+1-779-768-5070	Guardian	2025-06-06 00:39:32.914511	2025-06-06 00:39:32.914511
47	71	Business Owner	9306 Oak Avenue, Meadowbrook	+1-747-301-4617	Guardian	2025-06-06 00:39:33.161385	2025-06-06 00:39:33.161385
48	72	Accountant	7843 Oak Avenue, Lakeside	+1-689-880-7565	Mother	2025-06-06 00:39:33.38983	2025-06-06 00:39:33.38983
49	73	Engineer	1801 Cedar Lane, Meadowbrook	+1-712-915-2901	Guardian	2025-06-06 00:39:33.61108	2025-06-06 00:39:33.61108
50	74	Teacher	8409 Maple Road, Meadowbrook	+1-392-766-3912	Father	2025-06-06 00:39:33.862286	2025-06-06 00:39:33.862286
51	75	Lawyer	3464 Maple Road, Hillcrest	+1-231-196-9219	Mother	2025-06-06 00:39:34.068332	2025-06-06 00:39:34.068332
52	76	Accountant	6212 Elm Boulevard, Meadowbrook	+1-823-340-5318	Mother	2025-06-06 00:39:34.292296	2025-06-06 00:39:34.292296
53	77	Business Owner	3388 Elm Boulevard, Lakeside	+1-764-559-9335	Mother	2025-06-06 00:39:34.521107	2025-06-06 00:39:34.521107
54	78	Business Owner	4750 Maple Road, Lakeside	+1-578-655-6958	Mother	2025-06-06 00:39:34.722629	2025-06-06 00:39:34.722629
55	79	Doctor	3517 Cedar Lane, Springfield	+1-591-988-9266	Guardian	2025-06-06 00:39:34.93742	2025-06-06 00:39:34.93742
56	80	Business Owner	8562 Oak Avenue, Hillcrest	+1-419-487-9417	Father	2025-06-06 00:39:35.154666	2025-06-06 00:39:35.154666
57	81	Lawyer	3890 Oak Avenue, Forestville	+1-544-108-8849	Guardian	2025-06-06 00:39:35.360205	2025-06-06 00:39:35.360205
58	82	Teacher	7982 Cedar Lane, Hillcrest	+1-408-753-5620	Father	2025-06-06 00:39:35.55962	2025-06-06 00:39:35.55962
59	83	Doctor	7915 Pine Street, Lakeside	+1-820-540-4602	Mother	2025-06-06 00:39:35.746832	2025-06-06 00:39:35.746832
60	84	Engineer	4988 Maple Road, Springfield	+1-668-651-3156	Guardian	2025-06-06 00:39:35.931875	2025-06-06 00:39:35.931875
61	85	Doctor	5575 Main St, Forestville	+1-639-839-6815	Mother	2025-06-06 00:39:36.125579	2025-06-06 00:39:36.125579
62	86	Engineer	9673 Elm Boulevard, Meadowbrook	+1-322-559-3909	Guardian	2025-06-06 00:39:36.323267	2025-06-06 00:39:36.323267
63	87	Accountant	937 Main St, Springfield	+1-324-992-4229	Father	2025-06-06 00:39:36.528814	2025-06-06 00:39:36.528814
64	88	Business Owner	4723 Main St, Hillcrest	+1-748-719-2469	Guardian	2025-06-06 00:39:36.757306	2025-06-06 00:39:36.757306
65	89	Engineer	5924 Main St, Hillcrest	+1-997-675-1360	Father	2025-06-06 00:39:36.971603	2025-06-06 00:39:36.971603
66	90	Engineer	9169 Oak Avenue, Forestville	+1-516-716-1474	Mother	2025-06-06 00:39:37.20365	2025-06-06 00:39:37.20365
67	91	Teacher	6474 Main St, Meadowbrook	+1-694-940-1499	Mother	2025-06-06 00:39:37.4435	2025-06-06 00:39:37.4435
68	92	Lawyer	8393 Maple Road, Hillcrest	+1-517-667-5157	Guardian	2025-06-06 00:39:37.676801	2025-06-06 00:39:37.676801
69	93	Engineer	6422 Main St, Meadowbrook	+1-302-100-8667	Mother	2025-06-06 00:39:37.918916	2025-06-06 00:39:37.918916
70	94	Lawyer	3932 Oak Avenue, Forestville	+1-310-911-8494	Guardian	2025-06-06 00:39:38.129825	2025-06-06 00:39:38.129825
71	95	Engineer	2742 Main St, Forestville	+1-489-328-5597	Mother	2025-06-06 00:39:38.353738	2025-06-06 00:39:38.353738
72	96	Teacher	5626 Main St, Hillcrest	+1-884-987-5726	Father	2025-06-06 00:39:38.597202	2025-06-06 00:39:38.597202
73	97	Lawyer	5589 Main St, Forestville	+1-296-392-7467	Guardian	2025-06-06 00:39:38.805431	2025-06-06 00:39:38.805431
74	98	Engineer	1047 Elm Boulevard, Lakeside	+1-517-436-2088	Mother	2025-06-06 00:39:39.021664	2025-06-06 00:39:39.021664
75	99	Doctor	6661 Oak Avenue, Riverdale	+1-286-780-3225	Father	2025-06-06 00:39:39.235697	2025-06-06 00:39:39.235697
76	100	Doctor	356 Elm Boulevard, Forestville	+1-212-428-3170	Father	2025-06-06 00:39:39.439257	2025-06-06 00:39:39.439257
77	101	Doctor	3177 Elm Boulevard, Springfield	+1-284-918-2174	Mother	2025-06-06 00:39:39.641886	2025-06-06 00:39:39.641886
78	102	Lawyer	7153 Pine Street, Meadowbrook	+1-451-697-2969	Mother	2025-06-06 00:39:39.83994	2025-06-06 00:39:39.83994
79	103	Accountant	6016 Main St, Forestville	+1-441-993-7281	Mother	2025-06-06 00:39:40.027458	2025-06-06 00:39:40.027458
80	104	Accountant	620 Elm Boulevard, Springfield	+1-508-568-5489	Mother	2025-06-06 00:39:40.211387	2025-06-06 00:39:40.211387
81	105	Engineer	2360 Maple Road, Lakeside	+1-355-969-2948	Mother	2025-06-06 00:39:40.397173	2025-06-06 00:39:40.397173
82	106	Doctor	3366 Elm Boulevard, Springfield	+1-752-260-3810	Father	2025-06-06 00:39:40.585586	2025-06-06 00:39:40.585586
83	107	Teacher	9720 Oak Avenue, Forestville	+1-507-407-2485	Mother	2025-06-06 00:39:40.834016	2025-06-06 00:39:40.834016
84	108	Doctor	3765 Pine Street, Riverdale	+1-941-236-7119	Father	2025-06-06 00:39:41.056981	2025-06-06 00:39:41.056981
85	109	Doctor	4152 Maple Road, Forestville	+1-781-236-9813	Guardian	2025-06-06 00:39:41.293673	2025-06-06 00:39:41.293673
86	110	Engineer	6037 Pine Street, Hillcrest	+1-792-681-8216	Mother	2025-06-06 00:39:41.516028	2025-06-06 00:39:41.516028
87	111	Doctor	2961 Pine Street, Forestville	+1-988-598-8539	Mother	2025-06-06 00:39:41.73674	2025-06-06 00:39:41.73674
88	112	Doctor	5482 Main St, Lakeside	+1-343-833-4189	Mother	2025-06-06 00:39:41.987712	2025-06-06 00:39:41.987712
89	113	Teacher	3924 Cedar Lane, Riverdale	+1-361-796-7768	Mother	2025-06-06 00:39:42.211986	2025-06-06 00:39:42.211986
90	114	Engineer	4816 Cedar Lane, Forestville	+1-746-447-3802	Guardian	2025-06-06 00:39:42.437864	2025-06-06 00:39:42.437864
91	115	Doctor	4780 Maple Road, Lakeside	+1-878-840-6277	Guardian	2025-06-06 00:39:42.667516	2025-06-06 00:39:42.667516
92	116	Engineer	8772 Maple Road, Lakeside	+1-477-639-2841	Guardian	2025-06-06 00:39:42.871759	2025-06-06 00:39:42.871759
93	117	Lawyer	4163 Oak Avenue, Lakeside	+1-456-617-3251	Guardian	2025-06-06 00:39:43.088116	2025-06-06 00:39:43.088116
94	118	Business Owner	2389 Main St, Meadowbrook	+1-429-648-9608	Father	2025-06-06 00:39:43.329674	2025-06-06 00:39:43.329674
95	119	Business Owner	742 Maple Road, Springfield	+1-281-387-4999	Guardian	2025-06-06 00:39:43.534879	2025-06-06 00:39:43.534879
96	120	Doctor	2451 Maple Road, Forestville	+1-530-985-7829	Mother	2025-06-06 00:39:43.751816	2025-06-06 00:39:43.751816
97	121	Business Owner	4718 Main St, Meadowbrook	+1-450-384-5055	Father	2025-06-06 00:39:43.93993	2025-06-06 00:39:43.93993
98	122	Teacher	6153 Cedar Lane, Forestville	+1-602-661-5370	Mother	2025-06-06 00:39:44.127872	2025-06-06 00:39:44.127872
99	123	Engineer	4586 Elm Boulevard, Forestville	+1-219-328-9254	Father	2025-06-06 00:39:44.313905	2025-06-06 00:39:44.313905
100	124	Teacher	7661 Pine Street, Meadowbrook	+1-546-265-1168	Mother	2025-06-06 00:39:44.511961	2025-06-06 00:39:44.511961
\.


--
-- TOC entry 5981 (class 0 OID 99963)
-- Dependencies: 289
-- Data for Name: proficiency_levels; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.proficiency_levels (id, name, level_number, description, color_code, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5946 (class 0 OID 90863)
-- Dependencies: 254
-- Data for Name: resources; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.resources (id, title, type, url, file_path, description, class_id, teacher_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5910 (class 0 OID 82315)
-- Dependencies: 218
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roles (id, name, description, created_at, updated_at) FROM stdin;
5	admin	Administrator with full access	2025-06-06 00:39:19.485628	2025-06-06 00:39:19.485628
6	teacher	Teacher with access to classes and grades	2025-06-06 00:39:19.485628	2025-06-06 00:39:19.485628
7	student	Student with limited access	2025-06-06 00:39:19.485628	2025-06-06 00:39:19.485628
8	parent	Parent with access to their children's data	2025-06-06 00:39:19.485628	2025-06-06 00:39:19.485628
\.


--
-- TOC entry 6017 (class 0 OID 100356)
-- Dependencies: 325
-- Data for Name: school_based_assessments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.school_based_assessments (id, student_id, subject_id, class_id, academic_year, term, class_exercises_score, homework_score, project_score, assignment_score, class_test_scores, class_test_average, total_sba_score, sba_percentage, core_competencies_score, subject_competencies_score, teacher_id, assessment_date, is_moderated, moderated_by, moderation_date, moderation_comments, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6009 (class 0 OID 100242)
-- Dependencies: 317
-- Data for Name: stem_assessment_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stem_assessment_results (id, assessment_id, student_id, scientific_method_score, technical_skills_score, innovation_creativity_score, communication_score, total_score, percentage, grade_letter, strengths, areas_for_improvement, teacher_comments, competencies_demonstrated, competency_levels, assessed_by, assessment_date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6007 (class 0 OID 100223)
-- Dependencies: 315
-- Data for Name: stem_assessments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stem_assessments (id, learning_module_id, title, description, assessment_type, scientific_method_weight, technical_skills_weight, innovation_creativity_weight, communication_weight, total_marks, duration_minutes, requires_presentation, requires_demonstration, rubric_criteria, success_indicators, is_active, created_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5985 (class 0 OID 100002)
-- Dependencies: 293
-- Data for Name: stem_domains; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stem_domains (id, name, code, description, color_code, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6003 (class 0 OID 100180)
-- Dependencies: 311
-- Data for Name: stem_learning_modules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stem_learning_modules (id, stem_subject_id, educational_level_id, title, description, learning_objectives, primary_approach, secondary_approaches, duration_weeks, sequence_order, term, required_materials, technology_requirements, safety_considerations, formative_assessment_percentage, summative_assessment_percentage, is_active, created_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6025 (class 0 OID 100782)
-- Dependencies: 333
-- Data for Name: stem_project_submissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stem_project_submissions (id, project_id, student_id, group_members, is_group_leader, submission_date, project_title, project_description, documentation_file, presentation_file, prototype_images, video_demonstration, challenges_faced, lessons_learned, future_improvements, status, teacher_feedback, peer_feedback, total_score, innovation_score, technical_score, presentation_score, collaboration_score, graded_by, graded_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6005 (class 0 OID 100204)
-- Dependencies: 313
-- Data for Name: stem_projects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stem_projects (id, learning_module_id, title, description, problem_statement, is_individual, is_group, max_group_size, duration_days, milestones, required_resources, expected_deliverables, evaluation_criteria, industry_connections, community_impact, sustainability_focus, difficulty_level, is_active, created_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6013 (class 0 OID 100280)
-- Dependencies: 321
-- Data for Name: stem_resource_bookings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stem_resource_bookings (id, resource_id, booked_by, booking_date, start_time, end_time, quantity_requested, purpose, class_id, status, approved_by, approval_date, rejection_reason, actual_usage_notes, condition_after_use, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6011 (class 0 OID 100266)
-- Dependencies: 319
-- Data for Name: stem_resource_center; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stem_resource_center (id, name, description, resource_type, stem_domains, educational_levels, total_quantity, available_quantity, location, usage_instructions, safety_guidelines, maintenance_schedule, file_path, external_url, access_requirements, is_active, created_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5989 (class 0 OID 100026)
-- Dependencies: 297
-- Data for Name: stem_subjects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stem_subjects (id, subject_id, stem_domain_id, educational_level_id, integration_level, practical_hours_per_week, theory_hours_per_week, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5965 (class 0 OID 99809)
-- Dependencies: 273
-- Data for Name: student_competency_assessments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_competency_assessments (id, student_id, competency_id, assessment_date, proficiency_level, score, evidence, teacher_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6019 (class 0 OID 100722)
-- Dependencies: 327
-- Data for Name: student_competency_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_competency_profiles (id, student_id, academic_year, communication_collaboration_score, critical_thinking_score, creativity_innovation_score, cultural_identity_score, personal_development_score, digital_literacy_score, overall_competency_level, overall_score, strengths, areas_for_improvement, recommended_activities, teacher_comments, parent_feedback, last_updated, updated_by) FROM stdin;
\.


--
-- TOC entry 6039 (class 0 OID 100895)
-- Dependencies: 347
-- Data for Name: student_progressions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_progressions (id, student_id, academic_year, current_level_id, next_level_id, overall_academic_average, attendance_percentage, core_competencies_average, character_development_score, english_score, mathematics_score, science_score, meets_academic_threshold, meets_attendance_threshold, meets_competency_threshold, meets_age_requirement, promotion_status, promotion_decision_date, decision_rationale, requires_remedial_support, remedial_subjects, intervention_plan, recommended_by, approved_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5922 (class 0 OID 82391)
-- Dependencies: 230
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.students (id, user_id, admission_number, date_of_birth, gender, address, class_id, parent_id, created_at, updated_at, profile_picture, surname, place_of_birth, religious_denomination, telephone, whatsapp, postal_address, digital_address, city, country, residential_address, local_landmark, special_circumstance, allergies, medication, physician_name, physician_phone, previous_school, previous_class, previous_team, previous_year, father_name, father_contact, father_address, father_email, father_profession, father_workplace, mother_name, mother_contact, mother_address, mother_profession, mother_workplace, mother_email, name, email, phone, first_name, last_name, middle_name, status, nationality, blood_group, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, enrollment_date, graduation_date, extracurricular_activities, achievements, student_id_number, preferred_name, birth_certificate_number, passport_number, passport_expiry, primary_language, secondary_language, height, weight, blood_pressure, vision, hearing, immunization_status, learning_style, special_needs, academic_strengths, academic_weaknesses, career_aspirations, guardian_name, guardian_relationship, guardian_contact, guardian_email, guardian_address, fee_category, scholarship_details, payment_method, medical_conditions, awards_achievements, standardized_test_scores, secondary_contact_name, secondary_contact_phone, secondary_contact_relationship, individualized_education_plan, iep_details, student_email, library_card_number) FROM stdin;
304	426	ADM-2025-00001	2004-06-21	male	\N	\N	\N	2025-06-21 00:36:16.899991	2025-07-13 19:27:05.566447	\N	Atsu	\N	\N	+233598335521	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	Komla	Atsu 	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N
305	427	ADM-2025-00002	1994-03-20	female	\N	\N	\N	2025-06-21 01:33:52.277474	2025-07-19 03:18:05.100576	\N	Abenya	\N	\N	+233598335521	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	abenya.ba@gmail.com	+233598335521	Barbara	Abenya	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N
\.


--
-- TOC entry 5924 (class 0 OID 82415)
-- Dependencies: 232
-- Data for Name: subjects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subjects (id, name, code, description, credit_hours, is_active, created_at, updated_at, department_id) FROM stdin;
1	Mathematics	MATH101	Basic mathematics including algebra and geometry	4	t	2025-06-06 00:39:19.480221	2025-06-06 00:39:19.480221	\N
2	English Literature	ENG101	Study of classic and modern literature	3	t	2025-06-06 00:39:19.480221	2025-06-06 00:39:19.480221	\N
3	Physics	PHY101	Introduction to physics concepts	4	t	2025-06-06 00:39:19.480221	2025-06-06 00:39:19.480221	\N
4	Chemistry	CHEM101	Basic chemistry principles	4	t	2025-06-06 00:39:19.480221	2025-06-06 00:39:19.480221	\N
5	Biology	BIO101	Study of living organisms	3	t	2025-06-06 00:39:19.480221	2025-06-06 00:39:19.480221	\N
6	History	HIST101	World history overview	3	t	2025-06-06 00:39:19.480221	2025-06-06 00:39:19.480221	\N
7	Geography	GEO101	Study of Earth and human geography	3	t	2025-06-06 00:39:19.480221	2025-06-06 00:39:19.480221	\N
8	Computer Science	CS101	Introduction to programming	4	t	2025-06-06 00:39:19.480221	2025-06-06 00:39:19.480221	\N
9	Physical Education	PE101	Sports and physical fitness	2	t	2025-06-06 00:39:19.480221	2025-06-06 00:39:19.480221	\N
11	Music	MUS101	Music theory and practice	2	t	2025-06-06 00:39:19.480221	2025-06-06 00:39:19.480221	\N
\.


--
-- TOC entry 5940 (class 0 OID 90799)
-- Dependencies: 248
-- Data for Name: teacher_attendances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.teacher_attendances (id, teacher_id, date, status, note, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5925 (class 0 OID 82425)
-- Dependencies: 233
-- Data for Name: teacher_subjects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.teacher_subjects (teacher_id, subject_id, assigned_date, is_primary) FROM stdin;
5	4	2025-06-06 00:39:22.785839	f
5	8	2025-06-06 00:39:22.785839	f
6	9	2025-06-06 00:39:22.785839	t
6	7	2025-06-06 00:39:22.786839	t
6	4	2025-06-06 00:39:22.786839	f
\.


--
-- TOC entry 5918 (class 0 OID 82361)
-- Dependencies: 226
-- Data for Name: teachers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.teachers (id, user_id, employee_id, first_name, last_name, date_of_birth, gender, address, phone_number, qualification, specialization, joining_date, status, created_at, updated_at) FROM stdin;
5	11	EMP1002	Stephen 	EPOU	1995-12-01	Male	8418 Elm Boulevard, Springfield	+233598335521	B.Ed	Languages	2021-05-15	active	2025-06-06 00:39:19.902303	2025-07-08 11:19:34.758888
6	12	EMP1003	Gava	Dental	1979-05-29	Female	8038 Oak Avenue, Meadowbrook	+233275951470	M.Sc	Mathematics	2019-12-04	active	2025-06-06 00:39:20.12591	2025-07-09 19:00:20.603118
\.


--
-- TOC entry 6067 (class 0 OID 101180)
-- Dependencies: 375
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.transactions (id, transaction_type, category, description, amount, transaction_date, reference_number, payment_method, vendor_supplier, receipt_number, budget_id, created_by, approved_by, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5938 (class 0 OID 90778)
-- Dependencies: 246
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_roles (user_id, role_id) FROM stdin;
426	7
427	7
\.


--
-- TOC entry 5912 (class 0 OID 82324)
-- Dependencies: 220
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, email, password_hash, role, status, created_at, updated_at, last_login) FROM stdin;
42	parent18	parent18@example.com	$2b$12$I8edoRjGDp.iJiaynKl0ReOjOm9Y4t7ZLpWQ2htvKC3XDih34H2LK	parent	active	2025-06-06 00:39:26.714913	2025-06-06 00:39:26.714913	2025-05-18 00:39:26.714913
43	parent19	parent19@example.com	$2b$12$Htpto7loDkQdjkBIv/Ea2.DQV/KjDiJPlLM9ZB006JZrv0lMGja3W	parent	active	2025-06-06 00:39:26.924468	2025-06-06 00:39:26.924468	2025-05-25 00:39:26.923468
10	teacher1	teacher1@admipaedia.com	$2b$12$iEUy86VPvcnOfRQVR4ebyekNSDrlv..SxTcmRQVGHhsZly9jB.DhC	teacher	active	2025-06-06 00:39:19.488194	2025-06-06 00:39:19.488194	2025-05-30 00:39:19.477217
11	teacher2	teacher2@admipaedia.com	$2b$12$Ykt7DlwWSaKH/pkgqcZKf.XQSGcZdpIvrFK2IhaoCLr..z0R4Le0a	teacher	active	2025-06-06 00:39:19.677643	2025-06-06 00:39:19.677643	2025-05-11 00:39:19.676655
12	teacher3	teacher3@admipaedia.com	$2b$12$mcXQ2dnuXuXrv6i2l79EkOh0zQ07J/ef7KHhpREZJ9Lfp7dbqg.hS	teacher	active	2025-06-06 00:39:19.900797	2025-06-06 00:39:19.900797	2025-06-05 00:39:19.899797
13	teacher4	teacher4@admipaedia.com	$2b$12$yFW9oaC/X05TwNGwtIx4o.mGw.q.21zvzkMO9d5anVUlENNOkVozS	teacher	active	2025-06-06 00:39:20.12591	2025-06-06 00:39:20.12591	2025-05-25 00:39:20.124911
14	teacher5	teacher5@admipaedia.com	$2b$12$B7KdDt3sXJ8eeKWVOg.v1ua/nEpzT5yPhq.k/SIp5F23/f2.y7mJO	teacher	active	2025-06-06 00:39:20.347279	2025-06-06 00:39:20.347279	2025-05-15 00:39:20.346279
15	teacher6	teacher6@admipaedia.com	$2b$12$okO4VOg7cjWcp.XqZLtBdOjY7sH0IPZRZjFJLXyCMqw1dGYDTXXmG	teacher	active	2025-06-06 00:39:20.584383	2025-06-06 00:39:20.584383	2025-05-22 00:39:20.583378
16	teacher7	teacher7@admipaedia.com	$2b$12$buvv8wA9FUgOpc0ccFZlHOwjWD1ecqYsGFX6TdN9oSgEF9gII/dMu	teacher	active	2025-06-06 00:39:20.807549	2025-06-06 00:39:20.807549	2025-05-15 00:39:20.806549
17	teacher8	teacher8@admipaedia.com	$2b$12$vsEYVl864hjtm3gcTR.23ua3M9l2WBwB3tuG71U9DpVQkINKN60ry	teacher	active	2025-06-06 00:39:21.051935	2025-06-06 00:39:21.051935	2025-05-31 00:39:21.05043
18	teacher9	teacher9@admipaedia.com	$2b$12$5ShWo6tPPOjmmqY0jjFxW.HyTSfw3PHRBlRpfN.98r3kgLyFZVHSS	teacher	active	2025-06-06 00:39:21.303524	2025-06-06 00:39:21.303524	2025-05-11 00:39:21.302482
19	teacher10	teacher10@admipaedia.com	$2b$12$gxHCRaF.mHSiPOh2MEQ33ec/fkNIdZkMoTFpUZQ08PiWJuKYbR9L6	teacher	active	2025-06-06 00:39:21.540412	2025-06-06 00:39:21.540412	2025-05-24 00:39:21.539404
20	teacher11	teacher11@admipaedia.com	$2b$12$YhdPyzmiSqn0ERPaLrNbNelYQgiWcl4tfqLt2aHlqnTsNrw/yTrrO	teacher	active	2025-06-06 00:39:21.803715	2025-06-06 00:39:21.803715	2025-05-26 00:39:21.802439
21	teacher12	teacher12@admipaedia.com	$2b$12$TxHyLFpuVJT.tXpfCtZ8G.ggmRw6y16OXXz2AtPk8TDm.ty4MnzM2	teacher	active	2025-06-06 00:39:22.051759	2025-06-06 00:39:22.051759	2025-05-29 00:39:22.051759
22	teacher13	teacher13@admipaedia.com	$2b$12$LGIEmbZaXJvHv53k6VkATelhFMgtXdTqza9RunZXfl6bdjtfXjx1a	teacher	active	2025-06-06 00:39:22.293922	2025-06-06 00:39:22.293922	2025-05-09 00:39:22.291416
23	teacher14	teacher14@admipaedia.com	$2b$12$PtpcJd5IYIBtZviLl9E.fuiRGx2sjlROMh6BKH.lV72W0LJkb2q4.	teacher	active	2025-06-06 00:39:22.52726	2025-06-06 00:39:22.52726	2025-05-27 00:39:22.52496
24	teacher15	teacher15@admipaedia.com	$2b$12$.J6Lpwn6.CLIGnSgj/q15OD11om8hW/FfAw.cfR8Kfm4/85h7IEHS	teacher	active	2025-06-06 00:39:22.768636	2025-06-06 00:39:22.768636	2025-05-18 00:39:22.767532
25	parent1	parent1@example.com	$2b$12$R86xk5NRcSPS5Jde4Xa6sOJgzcGk1lMqFFaIZwlab6CrmUg/Paaf2	parent	active	2025-06-06 00:39:23.079902	2025-06-06 00:39:23.079902	2025-05-08 00:39:23.0789
26	parent2	parent2@example.com	$2b$12$B3i3wUdtoPXGz9.X16Z2/OGZbdVoSg.ZZoeJFdjRTDaXYzbt2ZpUq	parent	active	2025-06-06 00:39:23.28656	2025-06-06 00:39:23.28656	2025-05-22 00:39:23.285548
27	parent3	parent3@example.com	$2b$12$buBOlWu9XdnAHB0LpkxxDuFkZr3rysHm01dtWCTOE3bO0cWbTwsPG	parent	active	2025-06-06 00:39:23.49853	2025-06-06 00:39:23.49853	2025-05-23 00:39:23.497228
28	parent4	parent4@example.com	$2b$12$9g/b69s/alhIblmFR/fwOuI0Uq7eMdCiVoW5SoS1Ob.nOCQrNZdLm	parent	active	2025-06-06 00:39:23.688553	2025-06-06 00:39:23.688553	2025-05-18 00:39:23.688553
29	parent5	parent5@example.com	$2b$12$TjNc2xQ85CgYK.E184Z9hO9e9/36ELsSAgnJwL8K01Moz.4fsEp2O	parent	active	2025-06-06 00:39:23.875288	2025-06-06 00:39:23.875288	2025-05-18 00:39:23.875288
30	parent6	parent6@example.com	$2b$12$bDJ.9G/L3xh0yroH6jBjueBkROI.zfOpg/SYwSwh3nhwKf/vhlQJi	parent	active	2025-06-06 00:39:24.061075	2025-06-06 00:39:24.061075	2025-06-02 00:39:24.061075
31	parent7	parent7@example.com	$2b$12$4VFs/6hkRwmCg0XqDFuv0.eaikhVcpTpacPa1lC6LZlluuZlmKdvy	parent	active	2025-06-06 00:39:24.26497	2025-06-06 00:39:24.26497	2025-05-27 00:39:24.264135
32	parent8	parent8@example.com	$2b$12$LJRBabk/qvf60WCRVHNN4.m.QvaAMWwYEjKMjYYa.FIme/prCufsa	parent	active	2025-06-06 00:39:24.498594	2025-06-06 00:39:24.498594	2025-05-21 00:39:24.498594
33	parent9	parent9@example.com	$2b$12$9TihnKa1edUe.lHhS2ct6ur/eTnl5OPYjlQ/4pFLlYnwjwMtSNVZa	parent	active	2025-06-06 00:39:24.721295	2025-06-06 00:39:24.721295	2025-05-31 00:39:24.721295
34	parent10	parent10@example.com	$2b$12$qUh771lzmIPV0WSaxAsDButL1pj.8/gUaKNEy1DJjqJxcX93j1ay2	parent	active	2025-06-06 00:39:24.955719	2025-06-06 00:39:24.955719	2025-06-03 00:39:24.954717
35	parent11	parent11@example.com	$2b$12$HRXtmYl.qLwfwUN21JsK2uTqYZH3kx4HDvu59RzvKFRHKaiWQOzYC	parent	active	2025-06-06 00:39:25.174876	2025-06-06 00:39:25.174876	2025-05-21 00:39:25.173874
36	parent12	parent12@example.com	$2b$12$MegchWuO7sEa60/qup8p2.8rp59x0BWIYBAtPcKV0zHKyy39sHAcW	parent	active	2025-06-06 00:39:25.394718	2025-06-06 00:39:25.394718	2025-05-18 00:39:25.394718
37	parent13	parent13@example.com	$2b$12$Ee.2WlW/vouTns5oHg7DJevkO5Sk8iWN1MIdk7g.ystns4NT1oZC6	parent	active	2025-06-06 00:39:25.640056	2025-06-06 00:39:25.640056	2025-05-26 00:39:25.639055
38	parent14	parent14@example.com	$2b$12$fbAcm.z4wFCUFtVQijLzweF.rI40Smwi1Ex5kfwD4M4uelFp0yg2.	parent	active	2025-06-06 00:39:25.853979	2025-06-06 00:39:25.853979	2025-05-20 00:39:25.852466
39	parent15	parent15@example.com	$2b$12$/Q1e1QVSBo.VKlhYY5n9Q.XhfwOfbeJQw4SqIeTqx3sq/P6YSfhy.	parent	active	2025-06-06 00:39:26.074087	2025-06-06 00:39:26.074087	2025-05-16 00:39:26.074087
40	parent16	parent16@example.com	$2b$12$x9SjMhLy2L.bA2dRrey.3.yYtexli9cN3aygQrzvmqYoqC7IEN8BS	parent	active	2025-06-06 00:39:26.292904	2025-06-06 00:39:26.292904	2025-05-11 00:39:26.291388
41	parent17	parent17@example.com	$2b$12$Mf51xIj.FlMoJkjlWevtmuo2G1zn7bCuOE60W4up67/Kx3JtzKTPW	parent	active	2025-06-06 00:39:26.498131	2025-06-06 00:39:26.498131	2025-05-12 00:39:26.497129
44	parent20	parent20@example.com	$2b$12$/ALKwCGM46OeYVOBRRnryO8VSfNiyebRhKKkFHh90BJz6TmHVhGoi	parent	active	2025-06-06 00:39:27.132793	2025-06-06 00:39:27.132793	2025-05-30 00:39:27.131793
45	parent21	parent21@example.com	$2b$12$X6ulykPyRvvH5DS7A8okHuIVkyROAa3i2c2YpNjHHdeXzYJzvweXK	parent	active	2025-06-06 00:39:27.33139	2025-06-06 00:39:27.33139	2025-06-01 00:39:27.33139
46	parent22	parent22@example.com	$2b$12$jvuHRVre026Ixxj.V6Oz3erBWQ4cHCbjtHLo7pAIzUEve6nuucUIm	parent	active	2025-06-06 00:39:27.518994	2025-06-06 00:39:27.518994	2025-06-05 00:39:27.517993
47	parent23	parent23@example.com	$2b$12$tc/xEySYq9zGPFMtRxhy0u58DiOrR7rUMehNFzxHIQyeKBqoaZylG	parent	active	2025-06-06 00:39:27.705662	2025-06-06 00:39:27.705662	2025-05-28 00:39:27.704657
48	parent24	parent24@example.com	$2b$12$U7HEevlxdO3QjO5VJpCUy.vfeWUf/Hdb02o8nvWKBJ1mWMIGruHqq	parent	active	2025-06-06 00:39:27.902036	2025-06-06 00:39:27.902036	2025-05-19 00:39:27.902036
9	admin	admin@admipaedia.com	$2b$12$SsK3x9YF/of.ATcQCh/W.OhzuAEzmfteZm/0LSs2aaCsmS.tswfE.	admin	active	2025-06-06 00:39:19.488194	2025-08-30 15:34:13.282227	2025-08-30 15:34:13.276725
49	parent25	parent25@example.com	$2b$12$VuAJlYhITPp/Kh0kozQcEO8VGsWVNWoJ79fYDUJOhFGtMzPLh/QSe	parent	active	2025-06-06 00:39:28.095205	2025-06-06 00:39:28.095205	2025-05-08 00:39:28.095205
50	parent26	parent26@example.com	$2b$12$5sumXPclLSSxvlljYzQWXud8YumaUlhWyWPqMxtPHZQ8lNR7aJKVK	parent	active	2025-06-06 00:39:28.284666	2025-06-06 00:39:28.284666	2025-05-19 00:39:28.284666
51	parent27	parent27@example.com	$2b$12$dagjiTMFy7jDVUM7ZdSOO.eFsjeo76p8oytI2OTO3Q5KubvanjoT2	parent	active	2025-06-06 00:39:28.51957	2025-06-06 00:39:28.51957	2025-05-15 00:39:28.518568
52	parent28	parent28@example.com	$2b$12$kqZ2q17/Cw4Xg2fXo8BMz.up16pVLNFrxP2EBONfF6J0DaTl4twy2	parent	active	2025-06-06 00:39:28.738434	2025-06-06 00:39:28.738434	2025-05-27 00:39:28.738434
53	parent29	parent29@example.com	$2b$12$nP4Tcw0q9ASaOBXTElI.Ruj5yyQBO4FUcr36SI1FSrZmw6L3YGZra	parent	active	2025-06-06 00:39:28.967828	2025-06-06 00:39:28.967828	2025-05-12 00:39:28.967828
54	parent30	parent30@example.com	$2b$12$S20Oyi1byBRE3vF5Awh3r.RcFj0SF1x2Phx8FiDy2eX0U/YxTfCPy	parent	active	2025-06-06 00:39:29.191567	2025-06-06 00:39:29.191567	2025-05-28 00:39:29.191567
55	parent31	parent31@example.com	$2b$12$H5tgN8o2.5dbJQnFyVfVn.cX4L.Rl.e0O62GtN.7enVgmw4R8GLxS	parent	active	2025-06-06 00:39:29.412304	2025-06-06 00:39:29.412304	2025-06-05 00:39:29.411304
56	parent32	parent32@example.com	$2b$12$9/SFUipmYdaOlmXZN1qWzuZ6imiFC6wRh0xcvAYucm655CEdS3yrS	parent	active	2025-06-06 00:39:29.657223	2025-06-06 00:39:29.657223	2025-05-25 00:39:29.657223
57	parent33	parent33@example.com	$2b$12$iXX2BnJsL/YEJDvSuoykR.6V1Ra9TRwRCnWJRyH7Agx23NElGoC8u	parent	active	2025-06-06 00:39:29.858983	2025-06-06 00:39:29.858983	2025-05-18 00:39:29.857978
58	parent34	parent34@example.com	$2b$12$F6djcPXBz4JFvNVcmenAR.E0ikeKX1XiJ32WOB0Tk7F/z93qh/w4q	parent	active	2025-06-06 00:39:30.080885	2025-06-06 00:39:30.080885	2025-06-02 00:39:30.079889
59	parent35	parent35@example.com	$2b$12$SHRbZjRgYUV8OJ5gDDORQuvu8DbR1adm5nJiKqKnEkDhLjoQIEOom	parent	active	2025-06-06 00:39:30.307638	2025-06-06 00:39:30.307638	2025-05-14 00:39:30.306638
60	parent36	parent36@example.com	$2b$12$jfmzvP5U6j771QK5xGXIZuZV8D/eiqMNy2yEjtocSUTYN7GUsmU3O	parent	active	2025-06-06 00:39:30.603774	2025-06-06 00:39:30.603774	2025-05-29 00:39:30.603774
61	parent37	parent37@example.com	$2b$12$Cl8JRETChvmMfawOPkesNOv2OLv/WTtlSJ5TzD1RSQucXMdf29lH6	parent	active	2025-06-06 00:39:30.825178	2025-06-06 00:39:30.825178	2025-05-19 00:39:30.824195
62	parent38	parent38@example.com	$2b$12$NvOT21YxOIRO8q5fIz9Y2u7lPZDiWa2W9kFVc/hoaglT6dO9v5gjS	parent	active	2025-06-06 00:39:31.03638	2025-06-06 00:39:31.03638	2025-05-31 00:39:31.035389
63	parent39	parent39@example.com	$2b$12$EgKJjGMVdPT/0WwaEtDF/.WLeJqhvMZy2E2BUr4Wyp8GLED4PD3VC	parent	active	2025-06-06 00:39:31.245693	2025-06-06 00:39:31.245693	2025-05-15 00:39:31.245693
64	parent40	parent40@example.com	$2b$12$D1feZuLj14/GPjnEOkE3guSP/5FvTYTSZabnAhYAP50a8.wcj1J1G	parent	active	2025-06-06 00:39:31.455455	2025-06-06 00:39:31.455455	2025-05-23 00:39:31.454456
65	parent41	parent41@example.com	$2b$12$lEaHDn99BsiQbhf4T7nl4u52cJzqQZl8KrLwY80nmnvMY3txGY3aK	parent	active	2025-06-06 00:39:31.640003	2025-06-06 00:39:31.640003	2025-06-05 00:39:31.640003
66	parent42	parent42@example.com	$2b$12$GHlnC5LsmEfvZqO4L4rZmOZGM2hsW1/cYRkSlI3HOT7WaKvIdNKg2	parent	active	2025-06-06 00:39:31.830638	2025-06-06 00:39:31.830638	2025-05-26 00:39:31.829637
67	parent43	parent43@example.com	$2b$12$p1XwDIM8bAVZeguF14g5k.9ATRh6MmP5cmYKKF.yLOtN8WyT3fcMu	parent	active	2025-06-06 00:39:32.019146	2025-06-06 00:39:32.019146	2025-05-16 00:39:32.018146
68	parent44	parent44@example.com	$2b$12$7puvY9lL4/kvTilqTXjAOuXZB22FOK0GKLQBOG9w4n2/RHiQfWxIq	parent	active	2025-06-06 00:39:32.210265	2025-06-06 00:39:32.210265	2025-05-23 00:39:32.210265
69	parent45	parent45@example.com	$2b$12$OFaAyuWHf4k89SbyXQ/gZumQ58M1Cx8eq80xbg76Rf3kIU6NW77li	parent	active	2025-06-06 00:39:32.422606	2025-06-06 00:39:32.422606	2025-05-25 00:39:32.421224
70	parent46	parent46@example.com	$2b$12$8LxEVAIiz0Im3lnB5dJV4ebp8EdGpiwwh83jo0njq3M5TNsVUB91m	parent	active	2025-06-06 00:39:32.680483	2025-06-06 00:39:32.680483	2025-06-03 00:39:32.679471
71	parent47	parent47@example.com	$2b$12$CLaIoa0xVY53cqe72P2JeehSIlCmUcGtent7zZ/fJnXco5FxeP8x.	parent	active	2025-06-06 00:39:32.914511	2025-06-06 00:39:32.914511	2025-05-26 00:39:32.913505
72	parent48	parent48@example.com	$2b$12$YTYd79a7TNqRa/CcwdahVubmO8QuzmbNG9rSE/SxrP/3qrgj68Hm2	parent	active	2025-06-06 00:39:33.160385	2025-06-06 00:39:33.160385	2025-05-16 00:39:33.159385
73	parent49	parent49@example.com	$2b$12$uKkCpKmwwLswAddXesCBk.boTDyQ6XCgeXGlk5gqrby4TOymcgdpK	parent	active	2025-06-06 00:39:33.387783	2025-06-06 00:39:33.387783	2025-05-11 00:39:33.387783
74	parent50	parent50@example.com	$2b$12$zH/c8zZX8TRda1OJLiYBG.eQfFb08d2I2iDRsjdyzRjPj7MYIqA4G	parent	active	2025-06-06 00:39:33.61108	2025-06-06 00:39:33.61108	2025-06-03 00:39:33.610064
75	parent51	parent51@example.com	$2b$12$gitEe/2rX/g/WKnix3boLu.lETN8LBiBOkVYpchIsqUzDOHFRMMaG	parent	active	2025-06-06 00:39:33.861287	2025-06-06 00:39:33.861287	2025-05-16 00:39:33.860285
76	parent52	parent52@example.com	$2b$12$97Ad.J4VKu2p/OxO5FbUOu6F9d2Mlqk/KRJ.ngzC1Ffwi.nwJ93JO	parent	active	2025-06-06 00:39:34.067239	2025-06-06 00:39:34.067239	2025-05-09 00:39:34.067239
77	parent53	parent53@example.com	$2b$12$8B3D2FM4O1AFS7zAp0Ogd.aCnphBXHE1Gjb4RUli2IBGA.oGBJ8hq	parent	active	2025-06-06 00:39:34.291296	2025-06-06 00:39:34.291296	2025-05-20 00:39:34.291296
78	parent54	parent54@example.com	$2b$12$4ibXdJoH1oZNTN0TsJ8hWur1/VaeNBEk0gdWIt9/cuu2Vj.kgcj/m	parent	active	2025-06-06 00:39:34.520108	2025-06-06 00:39:34.520108	2025-05-30 00:39:34.520108
79	parent55	parent55@example.com	$2b$12$/5.RrVq9.n4KaQEAklXQzeFMTzVtod0Ptfh1FQ9EcKxNgyoKGkZDy	parent	active	2025-06-06 00:39:34.72163	2025-06-06 00:39:34.72163	2025-05-18 00:39:34.720515
80	parent56	parent56@example.com	$2b$12$tei1ZnFqWPhcd.t7z9itPO6w6CNnnxbf7B9iajloZLms7j6fw8dyu	parent	active	2025-06-06 00:39:34.936098	2025-06-06 00:39:34.936098	2025-05-08 00:39:34.934895
81	parent57	parent57@example.com	$2b$12$A/ZVldWgUddJAaIvtWGgpeucyW0KQRUjgaAHjcM70OTrTz3XJaAdm	parent	active	2025-06-06 00:39:35.153724	2025-06-06 00:39:35.153724	2025-05-17 00:39:35.152717
82	parent58	parent58@example.com	$2b$12$gEb6FK2Z0mwcGKRBpmSrPuDubsX8/zJJ6gGCAgTSSmOIsQgj20iYa	parent	active	2025-06-06 00:39:35.3592	2025-06-06 00:39:35.3592	2025-05-21 00:39:35.3592
83	parent59	parent59@example.com	$2b$12$R97cdY9qBP/YB1eMZtuGw.j66m4XB1ahM/v63CsR03kf.iOYgfxz2	parent	active	2025-06-06 00:39:35.558721	2025-06-06 00:39:35.558721	2025-06-03 00:39:35.558721
84	parent60	parent60@example.com	$2b$12$MXj30xrYERz2GVOH0YOgHewS.NNcWHbsMQRp2oawlMAGdi3kfIA9C	parent	active	2025-06-06 00:39:35.745918	2025-06-06 00:39:35.745918	2025-05-14 00:39:35.744921
85	parent61	parent61@example.com	$2b$12$EOdPpc4G3P/nTyIoWq3xNe8Cc2zByPTIvQsHIzBHJ4CXpsk7x4ZLC	parent	active	2025-06-06 00:39:35.930681	2025-06-06 00:39:35.930681	2025-05-29 00:39:35.929985
86	parent62	parent62@example.com	$2b$12$GMSEAG.Oz1VvZWR8hqaTc.oAtg85ErGhZVAfUnbUJAdYQb4L0ZZ7W	parent	active	2025-06-06 00:39:36.124578	2025-06-06 00:39:36.124578	2025-05-21 00:39:36.123576
87	parent63	parent63@example.com	$2b$12$ydzTbal6arAOfEDbi.Pkh.oj33z7xYICBrRCwDPgTVtEhckXaIKxO	parent	active	2025-06-06 00:39:36.322285	2025-06-06 00:39:36.322285	2025-06-01 00:39:36.322285
88	parent64	parent64@example.com	$2b$12$v8Gaq26BbTgcN0Gtixo3XOFPN7JezWXf4esAtSh/YfZ.XSGFNc7Fu	parent	active	2025-06-06 00:39:36.527648	2025-06-06 00:39:36.527648	2025-05-29 00:39:36.526252
89	parent65	parent65@example.com	$2b$12$kVMWhQHxuXdehDh0M3yWD.YMnfU4v/RgDtLw9KcSiKSvDscDGVbh6	parent	active	2025-06-06 00:39:36.756305	2025-06-06 00:39:36.756305	2025-05-20 00:39:36.756305
90	parent66	parent66@example.com	$2b$12$DedVACqCtzOZ4ilVegSmaeFKMWqxPgBcniVsEo4HJ/v07W1EmonMq	parent	active	2025-06-06 00:39:36.970605	2025-06-06 00:39:36.970605	2025-05-17 00:39:36.969598
91	parent67	parent67@example.com	$2b$12$/WS/hxfIvTFYQulay6hnf.wWV0oNjrPm4dMg2hNUeyixFsRrx8mXO	parent	active	2025-06-06 00:39:37.20365	2025-06-06 00:39:37.20365	2025-05-09 00:39:37.201679
92	parent68	parent68@example.com	$2b$12$jJvSJPQW5F6rQAwBort8IOBL/zFXp.5v3M26fR6Z5R0qi.tMz/6gK	parent	active	2025-06-06 00:39:37.442495	2025-06-06 00:39:37.442495	2025-05-12 00:39:37.441491
93	parent69	parent69@example.com	$2b$12$mb5kRg1zk3.ni142dUgPJO8xxsIUjJuDedJhpWZ.0sTVUd15WRICm	parent	active	2025-06-06 00:39:37.675794	2025-06-06 00:39:37.675794	2025-05-14 00:39:37.674753
94	parent70	parent70@example.com	$2b$12$4wYLxw7ir1qr9ZqEpR113eUFLz5WgJ1QE6A85.VCEoJAHfU03n/JC	parent	active	2025-06-06 00:39:37.917934	2025-06-06 00:39:37.917934	2025-05-26 00:39:37.916914
95	parent71	parent71@example.com	$2b$12$cLD/yi45DspwiYHEjsk3o.MY4COh3ZNgU0YQE7.tTHVmMtlMYX1hS	parent	active	2025-06-06 00:39:38.129082	2025-06-06 00:39:38.129082	2025-06-01 00:39:38.127593
96	parent72	parent72@example.com	$2b$12$jA4KIgpdgrE6WDtmb2g30OoCyxC54QmzRVLkxtdfIr3316Efvh3CK	parent	active	2025-06-06 00:39:38.352628	2025-06-06 00:39:38.352628	2025-05-17 00:39:38.351403
97	parent73	parent73@example.com	$2b$12$QRGPm2ge6w8t0IYgA8ksv.teA9wvos..zunnAgMjGvWwTMZgYoCoS	parent	active	2025-06-06 00:39:38.596196	2025-06-06 00:39:38.596196	2025-05-19 00:39:38.595115
98	parent74	parent74@example.com	$2b$12$TQLOreBjcLCQWCrfabaTEeU.u7CgfRjxQMZkbzpqH1VWZ262fu5S.	parent	active	2025-06-06 00:39:38.805431	2025-06-06 00:39:38.805431	2025-05-24 00:39:38.804256
99	parent75	parent75@example.com	$2b$12$7UR8T1ZRHXtBdUVaCqsl/uJ98exHZNnZuvGjJwbzmo6uv.FRnx7vO	parent	active	2025-06-06 00:39:39.020668	2025-06-06 00:39:39.020668	2025-05-15 00:39:39.019665
100	parent76	parent76@example.com	$2b$12$Crq/6Pz7.ehbb1bigIGC1O7t5R1bRB3zcF0aEHaLNH7WamO/aPmH6	parent	active	2025-06-06 00:39:39.234676	2025-06-06 00:39:39.234676	2025-05-08 00:39:39.234676
101	parent77	parent77@example.com	$2b$12$.y1K9NjG6RfLOnFvYCQ7K.v3UIn/of/XDCC3oVTuZSCzfMNj..H4G	parent	active	2025-06-06 00:39:39.438253	2025-06-06 00:39:39.438253	2025-06-01 00:39:39.436765
102	parent78	parent78@example.com	$2b$12$fFfVwGtscmcsJu4imYva7ufGRMIND.7qjKyrCdt5BvAmw11TO7z0y	parent	active	2025-06-06 00:39:39.640885	2025-06-06 00:39:39.640885	2025-05-16 00:39:39.640885
103	parent79	parent79@example.com	$2b$12$Ml8IAh8cUhXX55k/nNxpJ.yvrEFxGdnyQ7FT9HbiXnb0lEmej6b16	parent	active	2025-06-06 00:39:39.838942	2025-06-06 00:39:39.838942	2025-05-09 00:39:39.837941
104	parent80	parent80@example.com	$2b$12$b9YJQ2G4aedO4xqkW0q4ou6WPMp5THyDhhcSAsEb4/1uHgU0PdvH2	parent	active	2025-06-06 00:39:40.026504	2025-06-06 00:39:40.026504	2025-05-17 00:39:40.025534
105	parent81	parent81@example.com	$2b$12$XkbPfpaoZJbnbsRd41hM0e4WbUKYE97AN/lsZJvRSfG5.2TGrkgp2	parent	active	2025-06-06 00:39:40.210644	2025-06-06 00:39:40.210644	2025-05-21 00:39:40.209644
106	parent82	parent82@example.com	$2b$12$F6aeh0z65.2cYmmS/E4px.sw1BQSOJz08zYOwNWgkp5V2C8hwjjGm	parent	active	2025-06-06 00:39:40.396177	2025-06-06 00:39:40.396177	2025-05-08 00:39:40.396177
107	parent83	parent83@example.com	$2b$12$qi3tVIWNdr6wZ..7fYEeeeQTRh7G50L3vXbYpid4D3/xlBArNgiPy	parent	active	2025-06-06 00:39:40.585586	2025-06-06 00:39:40.585586	2025-06-05 00:39:40.583069
108	parent84	parent84@example.com	$2b$12$JdykBcCIC3xarhg9lUBGVOqRLGWK.9//e7.tLyGr9GeX3JWYaKw8q	parent	active	2025-06-06 00:39:40.83264	2025-06-06 00:39:40.83264	2025-06-02 00:39:40.83264
109	parent85	parent85@example.com	$2b$12$ZB0uDKKf1GPzvask3Fyx6Ood80s/ZGoFEkYFv2t0yEcp1HiezdjI2	parent	active	2025-06-06 00:39:41.056462	2025-06-06 00:39:41.056462	2025-05-21 00:39:41.05514
110	parent86	parent86@example.com	$2b$12$Pfl8jJNJI5Gr3cDBAawu0O9HN.KdojRO1AC3mEAdw2TmvVNWHnxcW	parent	active	2025-06-06 00:39:41.29263	2025-06-06 00:39:41.29263	2025-05-16 00:39:41.291335
111	parent87	parent87@example.com	$2b$12$3k0asRCP6OB/jI1Rb592nO0ijVaXi.gf/LA0V/TxdNGcxycMELnBy	parent	active	2025-06-06 00:39:41.516028	2025-06-06 00:39:41.516028	2025-05-08 00:39:41.515025
112	parent88	parent88@example.com	$2b$12$/M4IDcmZa8oBDAUSXinqauxtUgmDq/7hnwvRct21oKCO3Situp9/6	parent	active	2025-06-06 00:39:41.735734	2025-06-06 00:39:41.735734	2025-05-28 00:39:41.735734
113	parent89	parent89@example.com	$2b$12$xfLr7bV1HTtFhpylgZZ0HOMfJ0b/76UrTT2YeOqs20s6nFVPmgyHS	parent	active	2025-06-06 00:39:41.98571	2025-06-06 00:39:41.98571	2025-05-13 00:39:41.98571
114	parent90	parent90@example.com	$2b$12$lA/4/PrqL4JZV1LuFNfm0ONZIzCC4Xjl4TQw/BpU9BeK9xszoDPFG	parent	active	2025-06-06 00:39:42.210984	2025-06-06 00:39:42.210984	2025-06-05 00:39:42.209985
115	parent91	parent91@example.com	$2b$12$3QyDTw4O1h6xAYlMmZDsfu5cZL.tEWisJkk2ZEwUBPJjVbBeIVfaq	parent	active	2025-06-06 00:39:42.437864	2025-06-06 00:39:42.437864	2025-05-24 00:39:42.436863
116	parent92	parent92@example.com	$2b$12$pHjnJeR0dcUgf73JYTAojeb.p1W.PvFEyKrxpG1DLBjyLPwCevqd.	parent	active	2025-06-06 00:39:42.666512	2025-06-06 00:39:42.666512	2025-05-29 00:39:42.665512
117	parent93	parent93@example.com	$2b$12$m.GrIEj.2taGEJYfKhAoT.9DvX0HUtp/zSsmJ5b0stKiWUPY8ASQy	parent	active	2025-06-06 00:39:42.870753	2025-06-06 00:39:42.870753	2025-06-02 00:39:42.86939
118	parent94	parent94@example.com	$2b$12$gLnYyFm/WQRNCIVJiO8zkOT/ItkQLYbrFABGWg.s9no/V1TZyPHQe	parent	active	2025-06-06 00:39:43.087114	2025-06-06 00:39:43.087114	2025-06-02 00:39:43.086115
119	parent95	parent95@example.com	$2b$12$HRN/MHVJ5r/2/xSo0M1x9On9WlMBT4a502xUIG2eF7d.HIF1/MI4.	parent	active	2025-06-06 00:39:43.329674	2025-06-06 00:39:43.329674	2025-05-31 00:39:43.328672
120	parent96	parent96@example.com	$2b$12$ETA1DZg91lUpQ0Jj0fJCDe8qz4QnK.o5efNDtzNMGiy9VofVJnZdu	parent	active	2025-06-06 00:39:43.533878	2025-06-06 00:39:43.533878	2025-05-11 00:39:43.533878
121	parent97	parent97@example.com	$2b$12$kSIcy0zC.JpB9.kCmwzjxufG2P1vwVMIY2Gl40XzMM7zjuLCtuh06	parent	active	2025-06-06 00:39:43.750809	2025-06-06 00:39:43.750809	2025-05-13 00:39:43.750809
122	parent98	parent98@example.com	$2b$12$hCHtW3wllcf9HORHFW7RE.WIx0TGJKgpMIuhyDj7Q0b/IO5396YWC	parent	active	2025-06-06 00:39:43.938759	2025-06-06 00:39:43.938759	2025-05-09 00:39:43.938178
123	parent99	parent99@example.com	$2b$12$FvP/SGQVxmyhcnfGil53E.0F1fM3tl40whtGuDu7orzeF/l4l36Zu	parent	active	2025-06-06 00:39:44.127546	2025-06-06 00:39:44.127546	2025-05-17 00:39:44.126544
124	parent100	parent100@example.com	$2b$12$m6iJC1uGoV.6DWchszYAq.cwyQ3erP0sydGnOjVPLX.1YInqItneO	parent	active	2025-06-06 00:39:44.312974	2025-06-06 00:39:44.312974	2025-06-03 00:39:44.3119
125	student1	student1@admipaedia.com	$2b$12$BLZzRbM42jt0wf2Ycydmt.NmasfxZRpS6aUel2HZR.w6nvLB/iSry	student	active	2025-06-06 00:39:44.510957	2025-06-06 00:39:44.510957	2025-05-22 00:39:44.510957
126	student2	student2@admipaedia.com	$2b$12$5nWt.ixj3.hT8W6hIKdi8OPxTXmNsaYP6unJCTcIoicAxKuipYn5K	student	active	2025-06-06 00:39:44.703797	2025-06-06 00:39:44.703797	2025-05-11 00:39:44.702796
127	student3	student3@admipaedia.com	$2b$12$JHGg9b5i2oiJyg6ad5mdtOZMRQqLQthLHgF2QSc1JkFXBHbbWuTE6	student	active	2025-06-06 00:39:44.936538	2025-06-06 00:39:44.936538	2025-05-24 00:39:44.936017
128	student4	student4@admipaedia.com	$2b$12$SUEaczGYoy/MfGYhUZc74u8dsQiHeLaL//NSGa.QTcf1/xGTYyA9u	student	active	2025-06-06 00:39:45.14366	2025-06-06 00:39:45.14366	2025-05-30 00:39:45.14366
129	student5	student5@admipaedia.com	$2b$12$DMMg1/JMOcezK78J9zf1i.W1QxJIHbIGZuNUrxJqsa/o7FANAJtFO	student	active	2025-06-06 00:39:45.367676	2025-06-06 00:39:45.367676	2025-05-29 00:39:45.366395
130	student6	student6@admipaedia.com	$2b$12$rtKK/bnpOcJF9jN0D.x32u/Q86JvznfJgdlBiiE0wWtJ2earo0xLe	student	active	2025-06-06 00:39:45.619267	2025-06-06 00:39:45.619267	2025-05-28 00:39:45.618268
131	student7	student7@admipaedia.com	$2b$12$VWQgeOz6KL2/6zHPciuo..Fsud0jfd9jYCPsssj8Wke9P68ivG4ke	student	active	2025-06-06 00:39:45.836737	2025-06-06 00:39:45.836737	2025-05-15 00:39:45.835731
132	student8	student8@admipaedia.com	$2b$12$QCS.CRXfpoH/Tjmxt84kG.cuVleCKJQ/00hbtm9GkdX7rjtNOw002	student	active	2025-06-06 00:39:46.075524	2025-06-06 00:39:46.075524	2025-05-20 00:39:46.074522
133	student9	student9@admipaedia.com	$2b$12$HPLsNtekeeRC4fR5vDMrMeVMkGHEI.mHcsn3o9T3UtcSTaQPPbN9.	student	active	2025-06-06 00:39:46.296613	2025-06-06 00:39:46.296613	2025-05-30 00:39:46.295603
134	student10	student10@admipaedia.com	$2b$12$3Irv0FfLo49mfAjPuKHCoOHJj6tSrfQn5lbBamwzhQu3i5UrsPR26	student	active	2025-06-06 00:39:46.524914	2025-06-06 00:39:46.524914	2025-06-03 00:39:46.523913
135	student11	student11@admipaedia.com	$2b$12$H/3j.M6rzDudld/Gf8brnuBpHHy6XQ4cIMTNSrR83Qqx395zhhADu	student	active	2025-06-06 00:39:46.766989	2025-06-06 00:39:46.766989	2025-05-26 00:39:46.765982
136	student12	student12@admipaedia.com	$2b$12$uiPjguiMAV1nxYlsT5OZRu.EjiMnpH/W7954WdLsRYACeR7v3Ws9i	student	active	2025-06-06 00:39:46.983821	2025-06-06 00:39:46.983821	2025-05-07 00:39:46.983821
137	student13	student13@admipaedia.com	$2b$12$Se4F8LybudP0SuGOXiGDhe4MYlQN1nS01Aagg9cNcP45sa/q2QVvO	student	active	2025-06-06 00:39:47.197831	2025-06-06 00:39:47.197831	2025-05-20 00:39:47.196831
138	student14	student14@admipaedia.com	$2b$12$eTifuzarXJK.pFDfzvBoeOk6aOKxXvXjhYEEzdpHLaQt7JINB2ugy	student	active	2025-06-06 00:39:47.426091	2025-06-06 00:39:47.426091	2025-05-12 00:39:47.425089
139	student15	student15@admipaedia.com	$2b$12$aR2cohS6hOx/v5iUieKq5.a4Ih82AGG8s3LwcmzNUn8lmsIXbs/6K	student	active	2025-06-06 00:39:47.631323	2025-06-06 00:39:47.631323	2025-05-12 00:39:47.631323
140	student16	student16@admipaedia.com	$2b$12$g2t6/z0ip9/H3wBO7EdQp.YyQi3czpM/n//KgwAm1Pj5UGrPDJ26K	student	active	2025-06-06 00:39:47.844511	2025-06-06 00:39:47.844511	2025-06-05 00:39:47.844511
141	student17	student17@admipaedia.com	$2b$12$vycSDXWblqsfAepPcn5w6utVHGqvZ72pI5aLH4s6eJrlCUT3R11h.	student	active	2025-06-06 00:39:48.060765	2025-06-06 00:39:48.060765	2025-05-29 00:39:48.060765
142	student18	student18@admipaedia.com	$2b$12$xDIc4awUZ5cGeYg8scdZduirfG5.WZepQAPc.HQEiD4KlEO29.9nG	student	active	2025-06-06 00:39:48.253581	2025-06-06 00:39:48.253581	2025-05-21 00:39:48.252565
143	student19	student19@admipaedia.com	$2b$12$7IcYsnB1LN60my2REma00.eppGPMrTY7ars62NirZcd4LO3GetKuG	student	active	2025-06-06 00:39:48.463032	2025-06-06 00:39:48.463032	2025-05-17 00:39:48.461018
144	student20	student20@admipaedia.com	$2b$12$Tg0gGynsjjOiK2o.RvS.JO6vwEwEJZU1NGNwMlfjy9.9kROVMIoFy	student	active	2025-06-06 00:39:48.683829	2025-06-06 00:39:48.683829	2025-05-23 00:39:48.683829
145	student21	student21@admipaedia.com	$2b$12$vnmvtirsz1esg.pzBkpiZOw7LeFjE3qnWmEhdPWrLT9YB.uWypS/O	student	active	2025-06-06 00:39:48.890407	2025-06-06 00:39:48.890407	2025-05-22 00:39:48.889408
146	student22	student22@admipaedia.com	$2b$12$RuN4hdOCKXEQt8ohfou9TeJ4sMYFJAzeCXGrlXI7Qa0K2ZFuVozmW	student	active	2025-06-06 00:39:49.138058	2025-06-06 00:39:49.138058	2025-05-30 00:39:49.137058
147	student23	student23@admipaedia.com	$2b$12$wSKhoGcviXU0SOOegQCnP.EvyvewXw/yuTM6k6G5ZbcGLjIrYbN4y	student	active	2025-06-06 00:39:49.390761	2025-06-06 00:39:49.390761	2025-05-10 00:39:49.389759
148	student24	student24@admipaedia.com	$2b$12$jix1XEBjzFdnr8PiLwjmdO7fq.It9agakn57GISPXs9gJMfvRwXJW	student	active	2025-06-06 00:39:49.606451	2025-06-06 00:39:49.606451	2025-06-04 00:39:49.605444
149	student25	student25@admipaedia.com	$2b$12$ARM4BY6j4IrWh/z6Sf5JU.TWKcevnE9svK3gjNQPKJx5ezTOaEOfq	student	active	2025-06-06 00:39:49.839612	2025-06-06 00:39:49.839612	2025-06-02 00:39:49.838643
150	student26	student26@admipaedia.com	$2b$12$IciOOnTxAA2Rbi.JPflBLejNldUGaZBQAH/xGtfjgS3exKHwMucq2	student	active	2025-06-06 00:39:50.092402	2025-06-06 00:39:50.092402	2025-05-11 00:39:50.091401
151	student27	student27@admipaedia.com	$2b$12$qwqiUKoFzHWvrfxRbQZRZ.tJIoegJC9gYzY.iDBS7hQuV3f8d1nDC	student	active	2025-06-06 00:39:50.321746	2025-06-06 00:39:50.321746	2025-05-13 00:39:50.320746
152	student28	student28@admipaedia.com	$2b$12$ccmfIM1Yu0yFYfnNboduFuVwK0iawunFDQ2Ba7G1.fXFwGLdogADC	student	active	2025-06-06 00:39:50.571879	2025-06-06 00:39:50.571879	2025-05-09 00:39:50.571879
153	student29	student29@admipaedia.com	$2b$12$YQqTig3KXmY2mE2b0DWUxehylOK8lWrucTFde8.ljdBxZgUfoSmTy	student	active	2025-06-06 00:39:50.792679	2025-06-06 00:39:50.792679	2025-05-30 00:39:50.792679
154	student30	student30@admipaedia.com	$2b$12$HCWm5sPhSauLokSb1Lk6FeLFQtNwOMZ4NKsJGfu5ppkGDuVqRBqSi	student	active	2025-06-06 00:39:51.020504	2025-06-06 00:39:51.020504	2025-05-30 00:39:51.019503
155	student31	student31@admipaedia.com	$2b$12$6omda.bwXhJeQ4rkcMGytuJ89n2mJBTj9n9K/KY3A6Pz.zy/rr9Hm	student	active	2025-06-06 00:39:51.253255	2025-06-06 00:39:51.253255	2025-06-04 00:39:51.252255
156	student32	student32@admipaedia.com	$2b$12$MNs0/hICNL.gqMRp6MxMeORfZ1iQBrstt0ICTezo1DijzdiXJswQ2	student	active	2025-06-06 00:39:51.453147	2025-06-06 00:39:51.453147	2025-05-23 00:39:51.452148
157	student33	student33@admipaedia.com	$2b$12$w7j6ayfSY9AYh0NrFvV4Me1TKTG9vzk1aahvufouzhkjfwhHFFOMy	student	active	2025-06-06 00:39:51.680867	2025-06-06 00:39:51.680867	2025-05-22 00:39:51.679867
158	student34	student34@admipaedia.com	$2b$12$/665hFOy2PlZqG7piVlvCee4DLmhuhKvt0YgpLNzN1KYZbXAtD0bK	student	active	2025-06-06 00:39:51.911889	2025-06-06 00:39:51.911889	2025-05-28 00:39:51.910885
159	student35	student35@admipaedia.com	$2b$12$3twf9jgtO7mvcDhU0Nh0p.zv86TPPmP5yLa4.ZbuGwFgJWMmQf0RC	student	active	2025-06-06 00:39:52.117149	2025-06-06 00:39:52.117149	2025-05-11 00:39:52.116629
160	student36	student36@admipaedia.com	$2b$12$HqbjPmNpO8Of5VAKPaABAOPn5owctngt5X6QA1Dh284Re9Y9IyBnO	student	active	2025-06-06 00:39:52.329772	2025-06-06 00:39:52.329772	2025-06-04 00:39:52.329772
161	student37	student37@admipaedia.com	$2b$12$6WSsTF/CcSLvPfLFtz9OneeGJnCUtfGGgAt5woP8Rkgqi.oHp8fme	student	active	2025-06-06 00:39:52.518159	2025-06-06 00:39:52.518159	2025-06-01 00:39:52.518159
162	student38	student38@admipaedia.com	$2b$12$fmaYAv7smP0RovvO1FJb2Oih8LleIPdhZpRwOE65fbDT4hqtJYIN.	student	active	2025-06-06 00:39:52.704907	2025-06-06 00:39:52.704907	2025-05-09 00:39:52.703905
163	student39	student39@admipaedia.com	$2b$12$Q4sINmrLEDSY4jbVYee.WefEyBsS.Q7RdZQKmzmbpF92lVxgB/CUS	student	active	2025-06-06 00:39:52.902593	2025-06-06 00:39:52.902593	2025-05-13 00:39:52.901592
164	student40	student40@admipaedia.com	$2b$12$fGPLQ6GTVSTaJmfKBaRLquXSjF92iwgWSBRY78JD3nTjwJWjj5NEK	student	active	2025-06-06 00:39:53.091942	2025-06-06 00:39:53.091942	2025-05-16 00:39:53.090935
165	student41	student41@admipaedia.com	$2b$12$Hq7iOhqM9DLSrcEBSNO8eO5JRKiFTlGkt89jImhdA5cBJT2oV69Yq	student	active	2025-06-06 00:39:53.280187	2025-06-06 00:39:53.280187	2025-05-15 00:39:53.279179
166	student42	student42@admipaedia.com	$2b$12$aSvSFgrE8q/LiLe625uDD.ezMhZIk.STHYwDKx62LlnPl1nNYPR6a	student	active	2025-06-06 00:39:53.552115	2025-06-06 00:39:53.552115	2025-05-18 00:39:53.552115
167	student43	student43@admipaedia.com	$2b$12$Q2V.8X4.GHV120unrPTGm.50SFQAx2iqcJl1UtQfHB5HwBPznUyj6	student	active	2025-06-06 00:39:53.85347	2025-06-06 00:39:53.85347	2025-06-04 00:39:53.852416
168	student44	student44@admipaedia.com	$2b$12$eoyqL3lCxfeuMWyY1VtRC.XEMa5BdAz2f/mz5VDE9INndhpzlb6wq	student	active	2025-06-06 00:39:54.115992	2025-06-06 00:39:54.115992	2025-05-16 00:39:54.114992
169	student45	student45@admipaedia.com	$2b$12$jrGQphLt2BP1eRruVwvgRONovKauFAW0IiqcDH84dUYn.YG8.77di	student	active	2025-06-06 00:39:54.385111	2025-06-06 00:39:54.385111	2025-05-15 00:39:54.384105
170	student46	student46@admipaedia.com	$2b$12$JsmdbcPAO1zlh1WDkHYRdOf5rRNxNmRPZoegpKJMXTXC.pDuwqcGq	student	active	2025-06-06 00:39:54.627397	2025-06-06 00:39:54.627397	2025-06-05 00:39:54.626391
171	student47	student47@admipaedia.com	$2b$12$eAM0p26yuH3Ah3NC31mGYerLupsYlSQ4p4nmruLYj/4Ao/fqzbpwe	student	active	2025-06-06 00:39:54.909614	2025-06-06 00:39:54.909614	2025-05-19 00:39:54.907601
172	student48	student48@admipaedia.com	$2b$12$akKFpP3U6DXamkmhSrfKW.iQeDJWoKvla9YYrYmzTb3T2rXsdOfYG	student	active	2025-06-06 00:39:55.18812	2025-06-06 00:39:55.18812	2025-05-22 00:39:55.187119
173	student49	student49@admipaedia.com	$2b$12$eUijDiPMbJSKNUAHqa0RF.SYTPQKS59vBceeKC2456mwzu0vQJpmG	student	active	2025-06-06 00:39:55.441527	2025-06-06 00:39:55.441527	2025-06-05 00:39:55.440515
174	student50	student50@admipaedia.com	$2b$12$naUAHijwRwEMHFttKJ63auQ0xHWkk86w0rkanJVQ.sXmyFdF4YDvq	student	active	2025-06-06 00:39:55.746529	2025-06-06 00:39:55.746529	2025-05-23 00:39:55.746529
175	student51	student51@admipaedia.com	$2b$12$YNPxT4v0hj70EwtHJgu2XOy90CbbKvXRpjRNqU6EFOvV6Y42DMbdO	student	active	2025-06-06 00:39:56.053355	2025-06-06 00:39:56.053355	2025-05-29 00:39:56.052353
176	student52	student52@admipaedia.com	$2b$12$T1cQZMc3cIf3Gd1YlNhklep5IXU1XM8EWAO.A4pi0iIfeOvelnBpm	student	active	2025-06-06 00:39:56.320578	2025-06-06 00:39:56.320578	2025-05-23 00:39:56.320073
177	student53	student53@admipaedia.com	$2b$12$H0zW5Nrob66PHFFL99nSpOnLLxWIifMEtH9BDi7.FLYtVUvX4UuZK	student	active	2025-06-06 00:39:56.700004	2025-06-06 00:39:56.700004	2025-05-23 00:39:56.698997
178	student54	student54@admipaedia.com	$2b$12$a2H6.36p3IZn5IpFQqWvUOrwUVZsxS0ze/zsOWKSYtEuoilaTufZS	student	active	2025-06-06 00:39:57.130008	2025-06-06 00:39:57.130008	2025-06-01 00:39:57.129009
179	student55	student55@admipaedia.com	$2b$12$KXyp7e62DslGosM3hxsOg.8VUrEp3PHni/Kw6H68SPm0QUOHyK2h.	student	active	2025-06-06 00:39:57.496404	2025-06-06 00:39:57.496404	2025-05-23 00:39:57.495401
180	student56	student56@admipaedia.com	$2b$12$tHm2T5X7ZlDQcYq5OuEcsuHr4Obn3DzLXdEcN5LIih/czuPpfC9xy	student	active	2025-06-06 00:39:57.786017	2025-06-06 00:39:57.786017	2025-05-28 00:39:57.786017
181	student57	student57@admipaedia.com	$2b$12$mLgmJhFESzu5Zo1Lig9TpOUL/3XZwTjMuqV33IR1GCd6AV6KCsW8G	student	active	2025-06-06 00:39:58.02426	2025-06-06 00:39:58.02426	2025-05-23 00:39:58.023757
182	student58	student58@admipaedia.com	$2b$12$gHifiyMor0O5VKa9Xpi8berH3PlUEiJNsob1CZzP0DSIYJmT8VcHW	student	active	2025-06-06 00:39:58.310558	2025-06-06 00:39:58.310558	2025-05-25 00:39:58.309553
183	student59	student59@admipaedia.com	$2b$12$mTzZwY7wT3DPe9/dDVIyZ.GINOADE0CPIF36e66Ya4JZbZxyeOVCu	student	active	2025-06-06 00:39:58.563444	2025-06-06 00:39:58.563444	2025-05-30 00:39:58.563444
184	student60	student60@admipaedia.com	$2b$12$N6dHDFGHmwF4hmc9zlPhOub23Ui3iKXS8dHck3VbH9O8kUwKchfNq	student	active	2025-06-06 00:39:58.84125	2025-06-06 00:39:58.84125	2025-05-24 00:39:58.840249
185	student61	student61@admipaedia.com	$2b$12$.ZP5TjHZULfeyu3OjqRJJeYpHKuaaVKNUiCusJrxuR5gGy4/W6RAi	student	active	2025-06-06 00:39:59.112323	2025-06-06 00:39:59.112323	2025-05-09 00:39:59.111046
186	student62	student62@admipaedia.com	$2b$12$LzQq76Y8Z4fz.SK7FJz/fu76PyXqX6qYWIcKDEtHj6gC6nqE4i1oO	student	active	2025-06-06 00:39:59.354197	2025-06-06 00:39:59.354197	2025-05-07 00:39:59.353197
187	student63	student63@admipaedia.com	$2b$12$P5ea/ulMA0FAqS6SQGghdekqlZaSRc.BH2ow2xjZsCOm9RDEuTgDC	student	active	2025-06-06 00:39:59.676039	2025-06-06 00:39:59.676039	2025-05-15 00:39:59.676039
188	student64	student64@admipaedia.com	$2b$12$BPrvuV7N3U.h7g3Gw0NwYu55pvhd0DmLAsiVZol/aE2.HKJICKrSa	student	active	2025-06-06 00:39:59.921158	2025-06-06 00:39:59.921158	2025-05-17 00:39:59.920157
189	student65	student65@admipaedia.com	$2b$12$AF4QOtIV1yDHjjhra9MN9.B813JvWhXvmD6UhUc.YbmX2vlUh9BsO	student	active	2025-06-06 00:40:00.200908	2025-06-06 00:40:00.200908	2025-05-20 00:40:00.199582
190	student66	student66@admipaedia.com	$2b$12$VgUTTH1iRRLR48arwW7ASORvXZyp6.jhG7x2H0nOvVnZOlQ3HzFNm	student	active	2025-06-06 00:40:00.512679	2025-06-06 00:40:00.512679	2025-05-20 00:40:00.511679
191	student67	student67@admipaedia.com	$2b$12$GOlLRsW7QAZSkGDBNU5vHeHODLwc.fq9Bh/Ba8fHYcuCfvJUitsDm	student	active	2025-06-06 00:40:00.946781	2025-06-06 00:40:00.946781	2025-05-16 00:40:00.945782
192	student68	student68@admipaedia.com	$2b$12$mudD.HG6Spj6BfBvhFjbJuNJlrPmFaG8UN1K42HiLij1GPly3US1G	student	active	2025-06-06 00:40:01.318872	2025-06-06 00:40:01.318872	2025-05-25 00:40:01.317702
193	student69	student69@admipaedia.com	$2b$12$6Q4AL6lErkeeTegJJ0jvTezZ6.icoCDk8/Rk6tW80dEre5U7zxmjC	student	active	2025-06-06 00:40:01.594825	2025-06-06 00:40:01.594825	2025-05-30 00:40:01.594825
194	student70	student70@admipaedia.com	$2b$12$4yFl2sH/BUwpMJ6hla0hnezzuPpE0CeDp.E3ocjXcz3RQkqtXkN..	student	active	2025-06-06 00:40:01.868587	2025-06-06 00:40:01.868587	2025-05-09 00:40:01.867467
195	student71	student71@admipaedia.com	$2b$12$UlUwF4zsRr0IjtE.3rcZuOfOWtGS2J9fgLLPykgNviGHKlmNMRrwe	student	active	2025-06-06 00:40:02.122514	2025-06-06 00:40:02.122514	2025-05-13 00:40:02.121515
196	student72	student72@admipaedia.com	$2b$12$EzDJ7HnsPDdR.791IhEOYOC7Qqak8H19H43/v7pJ1VMkZ4/gKYmTS	student	active	2025-06-06 00:40:02.394122	2025-06-06 00:40:02.394122	2025-05-09 00:40:02.394122
197	student73	student73@admipaedia.com	$2b$12$wTUJOej.qBGfSvkBfkEmseD9ZlS4Tx5Uhex7HHLZWlXVP55UnJSa.	student	active	2025-06-06 00:40:02.661089	2025-06-06 00:40:02.661089	2025-05-19 00:40:02.661089
198	student74	student74@admipaedia.com	$2b$12$zABW8InBHTjXjv2Kkfc5C.ox/vcAsPsfRUaEf2rtbMBeEdcXSKnr2	student	active	2025-06-06 00:40:02.914773	2025-06-06 00:40:02.914773	2025-06-01 00:40:02.913772
199	student75	student75@admipaedia.com	$2b$12$Y5mUtQDarxcK0OanboPpseMZK75hEzeA8G2Syqf9K6FAoWddci0K6	student	active	2025-06-06 00:40:03.190568	2025-06-06 00:40:03.190568	2025-05-31 00:40:03.190568
200	student76	student76@admipaedia.com	$2b$12$gXJssHpx6H4RfCH22Dz/KuNBeHR8FMWR4aJ/Ul246kSG4qSBXXniq	student	active	2025-06-06 00:40:03.428182	2025-06-06 00:40:03.428182	2025-06-05 00:40:03.426679
201	student77	student77@admipaedia.com	$2b$12$8ueKuIZjj1E963i.xCm0Ye6r8MGLYOVqTODgeD4wVdy9f/fM6UAO.	student	active	2025-06-06 00:40:03.740128	2025-06-06 00:40:03.740128	2025-05-28 00:40:03.738634
202	student78	student78@admipaedia.com	$2b$12$vkhJM3o9yqMB1hvDrV31A.u2Hn2rxF/hMO46b8Irrh6Pzt45mWX1u	student	active	2025-06-06 00:40:03.984226	2025-06-06 00:40:03.984226	2025-05-15 00:40:03.984226
203	student79	student79@admipaedia.com	$2b$12$tnMj4JrYQL.INJV2mQ1HDOyEwp2fyFYnrfqp1.vXN6bSneYNbBOM2	student	active	2025-06-06 00:40:04.313941	2025-06-06 00:40:04.313941	2025-06-02 00:40:04.3125
204	student80	student80@admipaedia.com	$2b$12$3mJosE9TSE6JhXiU0lW.2OYthOk/h9Dwrw4NkLcz4lIQ.oJ7TBUbK	student	active	2025-06-06 00:40:04.578922	2025-06-06 00:40:04.578922	2025-05-13 00:40:04.577916
205	student81	student81@admipaedia.com	$2b$12$6E54Xt/WIbPB8cJAOGtv8.GkKJPw1GCXQ3/zZY9d8zp.cwhz2LQ5S	student	active	2025-06-06 00:40:05.05022	2025-06-06 00:40:05.05022	2025-05-12 00:40:05.049209
206	student82	student82@admipaedia.com	$2b$12$ta8eHhRe7KF4zDpraKsHue.9LGlhBSfQxPCqN4bSEvVeX9LiB3IDK	student	active	2025-06-06 00:40:05.446808	2025-06-06 00:40:05.446808	2025-05-22 00:40:05.444902
207	student83	student83@admipaedia.com	$2b$12$LXvJkXtubyPyoJYIwzKUSOuCpOXtA8.GD0p1eGi0QfrB9a7vHmJSe	student	active	2025-06-06 00:40:05.725097	2025-06-06 00:40:05.725097	2025-05-26 00:40:05.724092
208	student84	student84@admipaedia.com	$2b$12$JE5pPG7baXfRWRPht2lkYuIVnFtcMIGGNQrqf0bNRR/5NDFIwemma	student	active	2025-06-06 00:40:06.01195	2025-06-06 00:40:06.01195	2025-05-31 00:40:06.010944
209	student85	student85@admipaedia.com	$2b$12$fzfDFE9XgvH7THoPU31hyu5p0u2j.J8TlDcJeX69jqS7EE5QtIKWe	student	active	2025-06-06 00:40:06.268921	2025-06-06 00:40:06.268921	2025-05-23 00:40:06.26792
210	student86	student86@admipaedia.com	$2b$12$4fM3p0B5MrKcBR4zsv6kZ.Gf8TVlrOAF6asE7WQN4fbHpTR1JTnTi	student	active	2025-06-06 00:40:06.5415	2025-06-06 00:40:06.5415	2025-05-07 00:40:06.540126
211	student87	student87@admipaedia.com	$2b$12$oL3lENTW9nlzTSxj5OIhoOMcB5ozBTgupIzKpgrbeG4zb9I/CQc5m	student	active	2025-06-06 00:40:06.785368	2025-06-06 00:40:06.785368	2025-05-09 00:40:06.784
212	student88	student88@admipaedia.com	$2b$12$KXDXKmlAhw2bOG5REjzEVeQ8/4StG2vpTx66xZtracYCXdzxTjxwq	student	active	2025-06-06 00:40:07.043578	2025-06-06 00:40:07.043578	2025-05-31 00:40:07.042577
213	student89	student89@admipaedia.com	$2b$12$SQxQm/xjTTdOkwxCqpnA3.Hphotd3F1vwS6mSO5Nuds7.taY.ZpWy	student	active	2025-06-06 00:40:07.311293	2025-06-06 00:40:07.311293	2025-06-03 00:40:07.310287
214	student90	student90@admipaedia.com	$2b$12$3zNjSBUcUzNtbytsLglf0Oc8kSNChO5b/12xgSMRNmQQ6KgLfm5re	student	active	2025-06-06 00:40:07.582546	2025-06-06 00:40:07.582546	2025-05-27 00:40:07.581545
215	student91	student91@admipaedia.com	$2b$12$vQdFOAfvK3VCXB9mtoo2yObeONhlkv9EiH8wIBHRHyMpPLX3M.OLW	student	active	2025-06-06 00:40:07.881622	2025-06-06 00:40:07.881622	2025-06-05 00:40:07.880237
216	student92	student92@admipaedia.com	$2b$12$/TZtFSIzKvCsfpomDOGW/eLm/f7EefP8CU7SKnZUOZ3Y2zBilduzy	student	active	2025-06-06 00:40:08.122046	2025-06-06 00:40:08.122046	2025-05-16 00:40:08.121008
217	student93	student93@admipaedia.com	$2b$12$otjUZEEFg6zsg8dga18tq./AWphPDbNUyFpTbd.SLeu82XYVWabla	student	active	2025-06-06 00:40:08.407817	2025-06-06 00:40:08.407817	2025-05-07 00:40:08.406442
218	student94	student94@admipaedia.com	$2b$12$lceyPsB7.ojQch2ilXJnjeJsTBzsFh1jn4po2NSDGbIAjIHvMTWLq	student	active	2025-06-06 00:40:08.698484	2025-06-06 00:40:08.698484	2025-05-18 00:40:08.69755
219	student95	student95@admipaedia.com	$2b$12$GCM/jD.R/bbVX1BrmdKeRuJPGO2LcRbUHCyGDkUrE9YBRe3MVdTza	student	active	2025-06-06 00:40:09.152592	2025-06-06 00:40:09.152592	2025-05-19 00:40:09.151574
220	student96	student96@admipaedia.com	$2b$12$eYgCy5PJjL4YvSQJw/BstOWR5S4QXHEUyx6MuWzcqvRUD7vzSXbSm	student	active	2025-06-06 00:40:09.611662	2025-06-06 00:40:09.611662	2025-05-20 00:40:09.610155
221	student97	student97@admipaedia.com	$2b$12$dTyiQBDEi5sm/wOWShNOluVnQ4Y.wub/SRSzDVeSxW0gmf0Gztv7S	student	active	2025-06-06 00:40:09.875401	2025-06-06 00:40:09.875401	2025-05-31 00:40:09.874396
222	student98	student98@admipaedia.com	$2b$12$kOE/zOlaBQjJn.aNI.0i1OJn4XWeV6hwQjsqpxklTXNCfFzfuJnDu	student	active	2025-06-06 00:40:10.159538	2025-06-06 00:40:10.159538	2025-05-29 00:40:10.159538
223	student99	student99@admipaedia.com	$2b$12$zL4GetAsZoRV/yk5b9Kp5.RrPDL6hKsEzN0CbZGjfnhPTpq2jnWGy	student	active	2025-06-06 00:40:10.411391	2025-06-06 00:40:10.411391	2025-05-22 00:40:10.411391
224	student100	student100@admipaedia.com	$2b$12$1jXpGsuKzEWzLp18Thg/l.2SSf3iCISczdRF1oI23xiwt993/IS8m	student	active	2025-06-06 00:40:10.699402	2025-06-06 00:40:10.699402	2025-06-03 00:40:10.698241
225	student101	student101@admipaedia.com	$2b$12$wvQRZ6boYN.pdhTNK9dshu15VDD2EShxBIj2uzU8TpaoxFTQ7hGce	student	active	2025-06-06 00:40:10.943886	2025-06-06 00:40:10.943886	2025-05-25 00:40:10.942888
226	student102	student102@admipaedia.com	$2b$12$ZWJku6oupNLrpxE2TeWNV.WMjgHv7A.DrGTkvfS3YfL.FFXjQu1eG	student	active	2025-06-06 00:40:11.269148	2025-06-06 00:40:11.269148	2025-05-15 00:40:11.26783
227	student103	student103@admipaedia.com	$2b$12$LuIahD.xfz.p.f.JoWKQpOXadfuvSZYSbwsONCR0M6tIU9di2im6O	student	active	2025-06-06 00:40:11.518467	2025-06-06 00:40:11.518467	2025-05-24 00:40:11.517465
228	student104	student104@admipaedia.com	$2b$12$ljqVZEBbWaJUregMD1ZbjOrEfnML7gJpRZvEi1KLjuv/H5nA3LHj.	student	active	2025-06-06 00:40:11.796135	2025-06-06 00:40:11.796135	2025-05-16 00:40:11.795133
229	student105	student105@admipaedia.com	$2b$12$kwd2N25LFeQOAgDSjArHoujxXE2fi1U6ECs2.SjHiTyhk2JwXmyHi	student	active	2025-06-06 00:40:12.057456	2025-06-06 00:40:12.057456	2025-05-15 00:40:12.05599
230	student106	student106@admipaedia.com	$2b$12$I4JSHXjTPhYa1E7HtcpBouVw.ZNlQP7Rr5jOjh06ka74QSgQ.iJxi	student	active	2025-06-06 00:40:12.346155	2025-06-06 00:40:12.346155	2025-06-04 00:40:12.344152
231	student107	student107@admipaedia.com	$2b$12$lPqouRRyPTZmBCB8PLqi/Odbjqm1XJxWSYy/5fYV4w7xMq/OJAVEu	student	active	2025-06-06 00:40:12.631939	2025-06-06 00:40:12.631939	2025-05-28 00:40:12.630938
232	student108	student108@admipaedia.com	$2b$12$7LtHeEOOyEy86DDwIj8XluaWhKrL2GMrlzLYg1PtyYGPqexYo4rke	student	active	2025-06-06 00:40:13.072431	2025-06-06 00:40:13.072431	2025-06-02 00:40:13.071428
233	student109	student109@admipaedia.com	$2b$12$LaM5pR6VlXAKvX7XQXC5DOhsjytKs5zPTalIFsCSFUnaTgZKHoQOa	student	active	2025-06-06 00:40:13.518704	2025-06-06 00:40:13.518704	2025-06-04 00:40:13.517692
234	student110	student110@admipaedia.com	$2b$12$wGYc81Bf6v.EfVUny/9zzuBKdMuMuM0xM4ltZiNxRuzSi3Rn4MpoO	student	active	2025-06-06 00:40:13.863357	2025-06-06 00:40:13.863357	2025-05-29 00:40:13.861846
235	student111	student111@admipaedia.com	$2b$12$pI6V.DBX9BOt3PUNCDsZ0OeCDHpHdnx5gkbY2RBVUzGnQyxhz/y82	student	active	2025-06-06 00:40:14.168357	2025-06-06 00:40:14.168357	2025-05-21 00:40:14.168357
236	student112	student112@admipaedia.com	$2b$12$4wjsmj8tHxbYA5p2kxrureACIBXMyUh/zU18rIQb/dzY1MuqYATFm	student	active	2025-06-06 00:40:14.409447	2025-06-06 00:40:14.409447	2025-05-10 00:40:14.408255
237	student113	student113@admipaedia.com	$2b$12$dJgKtkY6898oQhCWJnB2VuKFsOYNseCU9F9vNye6xoWX7XK4rhMW6	student	active	2025-06-06 00:40:14.678488	2025-06-06 00:40:14.678488	2025-06-01 00:40:14.676491
238	student114	student114@admipaedia.com	$2b$12$ABjeY3iEsffMWuch0uDGgOkuJqOMfuB/s3NE.IVP91ck3CMSlkCwG	student	active	2025-06-06 00:40:14.9246	2025-06-06 00:40:14.9246	2025-05-17 00:40:14.922601
239	student115	student115@admipaedia.com	$2b$12$Q8G7mwpIvTaa3URTJU0K7OK4psFARCy/8LveDeplG08nx40bWg0Y6	student	active	2025-06-06 00:40:15.198465	2025-06-06 00:40:15.198465	2025-05-11 00:40:15.197463
240	student116	student116@admipaedia.com	$2b$12$cHXvPXveIpaWzdlEQHEMWuhG9xpWjYBgLUiGnrf.R1wxB2QSrY0FC	student	active	2025-06-06 00:40:15.48513	2025-06-06 00:40:15.48513	2025-05-31 00:40:15.484154
241	student117	student117@admipaedia.com	$2b$12$29fBaxBk64in4rHBJ1AMteTrLviQPUhTSFMhQMvL/Rlqfaa48l2HW	student	active	2025-06-06 00:40:15.745127	2025-06-06 00:40:15.745127	2025-05-26 00:40:15.743123
242	student118	student118@admipaedia.com	$2b$12$QNRDCybY8GKE2B2EfOfNBOjjdRi38rMXndoMYr7K1lZNzAvIsIi6G	student	active	2025-06-06 00:40:16.052973	2025-06-06 00:40:16.052973	2025-05-22 00:40:16.052973
243	student119	student119@admipaedia.com	$2b$12$OVYYS/K8L4ppZ4gwIJKQM.yHNlZDJh1fWbPyJshTSvoAR.dFJtxj2	student	active	2025-06-06 00:40:16.32433	2025-06-06 00:40:16.32433	2025-05-07 00:40:16.32333
244	student120	student120@admipaedia.com	$2b$12$/6N2lSI9J1Iy6b1bb9Sn6OW4KmBlOoNGDqZnW0vhDiZRGlmff0RVS	student	active	2025-06-06 00:40:16.57054	2025-06-06 00:40:16.57054	2025-05-19 00:40:16.569074
245	student121	student121@admipaedia.com	$2b$12$8bkU.8msj2DyS3jBBJW9Xe.3eNeDLBuzvmv35FqIOfi11B0R.x3aS	student	active	2025-06-06 00:40:17.011364	2025-06-06 00:40:17.011364	2025-05-09 00:40:17.010444
246	student122	student122@admipaedia.com	$2b$12$O/8vJCkN.VleSg3q4XPkBuqJ3a4l8ilX4ynkWpEZjN6xoESqsVj/W	student	active	2025-06-06 00:40:17.444472	2025-06-06 00:40:17.444472	2025-05-26 00:40:17.44347
247	student123	student123@admipaedia.com	$2b$12$FlC0oZJE8gXdt8QwGMeH8.hPWxiimGJXdj/IpGdGq8ViSDFtsOc7W	student	active	2025-06-06 00:40:17.762517	2025-06-06 00:40:17.762517	2025-06-04 00:40:17.761516
248	student124	student124@admipaedia.com	$2b$12$mxYAb8G5ov7YbIB3IsC3quTcYBZPQc10GLmq8EOmvH4PLe00k8ELW	student	active	2025-06-06 00:40:18.071661	2025-06-06 00:40:18.071661	2025-05-30 00:40:18.070594
249	student125	student125@admipaedia.com	$2b$12$OX1YLnyC8pVvbUXdGd3KquOXSRCpNwIeG070Y71dmJVO8C.byuGnW	student	active	2025-06-06 00:40:18.302953	2025-06-06 00:40:18.302953	2025-05-17 00:40:18.301952
250	student126	student126@admipaedia.com	$2b$12$8wRQ0unQSoqlJ5Fb6tVAg.ntzfjoFERGFywZHGmpqCTJzcZinYTf.	student	active	2025-06-06 00:40:18.576599	2025-06-06 00:40:18.576599	2025-05-15 00:40:18.575592
251	student127	student127@admipaedia.com	$2b$12$LBCGZMdNgHUEjbMtIZfUf.yAEhdUUqV24zzEPCt0HqXfuPXqCzpUm	student	active	2025-06-06 00:40:18.8491	2025-06-06 00:40:18.8491	2025-05-19 00:40:18.848099
252	student128	student128@admipaedia.com	$2b$12$ic7jdA2aFPr8IkK/OkYYUemzz5/9OFBYyF1iQ0gs7FOR61hWzgs7a	student	active	2025-06-06 00:40:19.114965	2025-06-06 00:40:19.114965	2025-06-03 00:40:19.113965
253	student129	student129@admipaedia.com	$2b$12$Hna//Y4LpBGnOIruXP54eO9T8G/DTceDAkwl9nSImBaXcS4HeDPfi	student	active	2025-06-06 00:40:19.4171	2025-06-06 00:40:19.4171	2025-05-24 00:40:19.4171
254	student130	student130@admipaedia.com	$2b$12$Swyz6yruLZ5KJDV6uoRX3.8l9uzRbYLj1HUHvosq7o6sbB6Upqsz.	student	active	2025-06-06 00:40:19.661325	2025-06-06 00:40:19.661325	2025-05-25 00:40:19.660323
255	student131	student131@admipaedia.com	$2b$12$4t0zh5bLQ5eQIbXjfaywyuq1c2tSzXA55/tVrbr.GM28A0znZx3QG	student	active	2025-06-06 00:40:19.963541	2025-06-06 00:40:19.963541	2025-05-14 00:40:19.962542
256	student132	student132@admipaedia.com	$2b$12$IBqqT4oIMJhMbwekMX.vYuTzmErpIaIEzohyz2Ri.TNw6HmtFPF/C	student	active	2025-06-06 00:40:20.216329	2025-06-06 00:40:20.216329	2025-05-21 00:40:20.215076
257	student133	student133@admipaedia.com	$2b$12$s1O4wEmCdfysQF.tr7Qt3epPg70z9HzrmugZ.ue2CgLtrpmsF4VXe	student	active	2025-06-06 00:40:20.510879	2025-06-06 00:40:20.510879	2025-05-30 00:40:20.510879
258	student134	student134@admipaedia.com	$2b$12$4nxkJ9rNc50u0yl74Z6XCeGynGAn3fFNlJ8Zni6hdQg/C7Ab94q5u	student	active	2025-06-06 00:40:20.850606	2025-06-06 00:40:20.850606	2025-05-23 00:40:20.849588
259	student135	student135@admipaedia.com	$2b$12$/YCL/FXuazt0HzN.vyox9uToM8aXxLLkGrI/1kAOnItcn0nXk9k/a	student	active	2025-06-06 00:40:21.283158	2025-06-06 00:40:21.283158	2025-05-21 00:40:21.282159
260	student136	student136@admipaedia.com	$2b$12$xa4c3wI7.k81uFR5N0jzc.rESOjiVUwFZeHZ8L.Bma6.rXl1QkaR.	student	active	2025-06-06 00:40:21.685118	2025-06-06 00:40:21.685118	2025-05-27 00:40:21.684112
261	student137	student137@admipaedia.com	$2b$12$WftBZhzTuH0RTYnECFuWlOLjZfkHc5.OPtpuc71xF/KuWlkpKTUiW	student	active	2025-06-06 00:40:21.95481	2025-06-06 00:40:21.95481	2025-05-07 00:40:21.952637
262	student138	student138@admipaedia.com	$2b$12$7WwVubnCsFbOiGpkfs9pb.3OhiP0UQzLqFiLL6b/6nR4CQ2zBvMh2	student	active	2025-06-06 00:40:22.204514	2025-06-06 00:40:22.204514	2025-06-04 00:40:22.203519
263	student139	student139@admipaedia.com	$2b$12$PhWTc8glQ0RPe8V5G3pg3.kQnW9ia0QJ/iD1W6BLmngIgTP.6IXkm	student	active	2025-06-06 00:40:22.466983	2025-06-06 00:40:22.466983	2025-05-28 00:40:22.465983
264	student140	student140@admipaedia.com	$2b$12$jgryyXktGy1XRYb07.VzOute2OUOVebzJWy7DYT75mkNwSCHhfF16	student	active	2025-06-06 00:40:22.723815	2025-06-06 00:40:22.723815	2025-05-08 00:40:22.72281
265	student141	student141@admipaedia.com	$2b$12$8j5fPq.Yd.iE2xKpn8x62uCkSyhl254G9WAOfmwdB20nCSEmtdeES	student	active	2025-06-06 00:40:22.980776	2025-06-06 00:40:22.980776	2025-05-24 00:40:22.980237
266	student142	student142@admipaedia.com	$2b$12$vNlf2LGo8vKRlgWWrAdv9.JKISepVz50GIXr.IsvG.nbEF/hwHshu	student	active	2025-06-06 00:40:23.274524	2025-06-06 00:40:23.274524	2025-05-21 00:40:23.273521
267	student143	student143@admipaedia.com	$2b$12$PV5CLQlrmWJEtE3S8kEXXeYtGJefguP9ZyfiiOKhqHOleWVe6xcja	student	active	2025-06-06 00:40:23.507427	2025-06-06 00:40:23.507427	2025-05-07 00:40:23.506426
268	student144	student144@admipaedia.com	$2b$12$DikXzR/EV7WL3An7gYL2auIOpT3R6kv7In2kmiQeqOzWYYZ8q8/g2	student	active	2025-06-06 00:40:23.783706	2025-06-06 00:40:23.783706	2025-05-29 00:40:23.782402
269	student145	student145@admipaedia.com	$2b$12$N9D6abb..mEBnYE8WG3GyuEOF9tcA9542syUk5xsb2pSXKh7l686a	student	active	2025-06-06 00:40:24.021406	2025-06-06 00:40:24.021406	2025-05-08 00:40:24.020061
270	student146	student146@admipaedia.com	$2b$12$5YTBoeHrnMJIB5mpwUEiW.XMrvx4X3pbRIJhiErbUqkPIgKEyzaNG	student	active	2025-06-06 00:40:24.323202	2025-06-06 00:40:24.323202	2025-06-04 00:40:24.323202
271	student147	student147@admipaedia.com	$2b$12$styKYDiuS71oStyadOyMu.L/q.tceOmZWvkAZItgsDdN619IGDc4e	student	active	2025-06-06 00:40:24.577193	2025-06-06 00:40:24.577193	2025-05-29 00:40:24.577193
272	student148	student148@admipaedia.com	$2b$12$as01Jb0y4lyY4RJ69CQJaeeP.OhrQKHMkm6FF.3yz5ij4FtpJN.ia	student	active	2025-06-06 00:40:24.966103	2025-06-06 00:40:24.966103	2025-05-08 00:40:24.9651
273	student149	student149@admipaedia.com	$2b$12$khxoqrVKF//3D0i9VilkfunU1vy2yKBmbHjBHqr8q0xQbI3deZXS2	student	active	2025-06-06 00:40:25.338494	2025-06-06 00:40:25.338494	2025-05-10 00:40:25.337506
274	student150	student150@admipaedia.com	$2b$12$wnCF4ncmagkK5.d5WRZP8.f0Z.kshQ6/.MnkDpTYw5pkqIol2eaR6	student	active	2025-06-06 00:40:25.681766	2025-06-06 00:40:25.681766	2025-05-15 00:40:25.681766
275	student151	student151@admipaedia.com	$2b$12$dIA28ns95vroMe1v8dt7OOcGf3atygyJn5rzKxfmH5gQyw0urw0pq	student	active	2025-06-06 00:40:25.994363	2025-06-06 00:40:25.994363	2025-05-15 00:40:25.994363
276	student152	student152@admipaedia.com	$2b$12$Qfl6yx45vMwEgnU5B15/tOeHgYGkV38DoR.4gR80C/042Wf0r03ly	student	active	2025-06-06 00:40:26.247464	2025-06-06 00:40:26.247464	2025-05-13 00:40:26.246278
277	student153	student153@admipaedia.com	$2b$12$OU5gQQO1An3M0JXmvXW0S.Dg67NHZZpuVcZJMZgcwm/iBaoAXhsZG	student	active	2025-06-06 00:40:26.546157	2025-06-06 00:40:26.546157	2025-05-21 00:40:26.545151
278	student154	student154@admipaedia.com	$2b$12$3hHfm5UHurm1kJRGXj/TNORWjfSRVTLH7v.nTLCJFPMzuGtTj77Lm	student	active	2025-06-06 00:40:26.780957	2025-06-06 00:40:26.780957	2025-05-16 00:40:26.779957
279	student155	student155@admipaedia.com	$2b$12$3efVLZx49xEKQM5um2k8uuu./H3EV5h7Xmbb.N1.hNAFKfC4d1T6q	student	active	2025-06-06 00:40:27.103118	2025-06-06 00:40:27.103118	2025-05-16 00:40:27.103118
280	student156	student156@admipaedia.com	$2b$12$DQX/LcBnRZBQpPvfk5fqcuThuG199oYSrH8piZS1CHTLs3HA/vg72	student	active	2025-06-06 00:40:27.352199	2025-06-06 00:40:27.352199	2025-05-14 00:40:27.351693
281	student157	student157@admipaedia.com	$2b$12$WichHtShuB8VslvE92P9y.vuDl5y.Lqd7bW9wVjG8Ujfn3qYixgW6	student	active	2025-06-06 00:40:27.629474	2025-06-06 00:40:27.629474	2025-05-07 00:40:27.628457
282	student158	student158@admipaedia.com	$2b$12$pIV4U/2lXSdsTkRbXl1APeNY/JAuCp7FFAb6abzaAYhZ08Upz8kLm	student	active	2025-06-06 00:40:27.915403	2025-06-06 00:40:27.915403	2025-05-27 00:40:27.914306
283	student159	student159@admipaedia.com	$2b$12$gWf9rD9c7378o4spiPDSxO9rjYJcBFCngtS5hIy8Pijr.2hbAzBpC	student	active	2025-06-06 00:40:28.156271	2025-06-06 00:40:28.156271	2025-06-03 00:40:28.155286
284	student160	student160@admipaedia.com	$2b$12$MEkSANiEvP6.sPRuz2nGmuA0bf7kF9SaxcfmkfcnGW6ZP0hL9.ioC	student	active	2025-06-06 00:40:28.45512	2025-06-06 00:40:28.45512	2025-05-27 00:40:28.45512
285	student161	student161@admipaedia.com	$2b$12$fgX7BamCcqucvUSydsadqOBrrPf9bmZoLbcC7bNoObD3lEjRqrBFC	student	active	2025-06-06 00:40:28.835148	2025-06-06 00:40:28.835148	2025-05-07 00:40:28.834148
286	student162	student162@admipaedia.com	$2b$12$d1Pibhh.7W9mNBawOUOq7.6RVNTfkTduXWdBiB3uuQ.Dywzw6Zbn6	student	active	2025-06-06 00:40:29.338817	2025-06-06 00:40:29.338817	2025-05-23 00:40:29.337719
287	student163	student163@admipaedia.com	$2b$12$RrBcPoZ2rDAGQN./6MAx0eqPbySVeSMuPG/WZlwvSK0g7yVbdNC22	student	active	2025-06-06 00:40:29.654868	2025-06-06 00:40:29.654868	2025-05-26 00:40:29.65386
288	student164	student164@admipaedia.com	$2b$12$Tx6PO5iu/Uyn8oSYtfe5TuuRYvu2ClEvJB5VPwJBkvS/z1CxyAU0S	student	active	2025-06-06 00:40:29.927899	2025-06-06 00:40:29.927899	2025-05-25 00:40:29.927396
289	student165	student165@admipaedia.com	$2b$12$nunDb4h5TMiM6Xz4CL2pF.Fu4YNqarzd3Z.2AULZYESCu0vgNLT0S	student	active	2025-06-06 00:40:30.173207	2025-06-06 00:40:30.173207	2025-05-16 00:40:30.172199
290	student166	student166@admipaedia.com	$2b$12$UJDl9KGldFZiyV9CHrNOmOsvnaOArfbRVLmJUmgLQDI/FH.oAAyW2	student	active	2025-06-06 00:40:30.437473	2025-06-06 00:40:30.437473	2025-05-16 00:40:30.436472
291	student167	student167@admipaedia.com	$2b$12$U6qrYDDJQRhm2dutWejRX.JLQQktuRMHkSST35VXvrastzZan6JCS	student	active	2025-06-06 00:40:30.700121	2025-06-06 00:40:30.700121	2025-05-14 00:40:30.699121
292	student168	student168@admipaedia.com	$2b$12$6nMJExepyzmvuy6MZ3wVPeYVR/DMEKB7aDOSG3AGhHzDORRTOcZC2	student	active	2025-06-06 00:40:30.963509	2025-06-06 00:40:30.963509	2025-05-30 00:40:30.961502
293	student169	student169@admipaedia.com	$2b$12$ctX.NoCQsNwnEnJdIaZlP.9qiNaimhGTLGCsSxubjp.f4UR.HOtNS	student	active	2025-06-06 00:40:31.229994	2025-06-06 00:40:31.229994	2025-05-13 00:40:31.229994
294	student170	student170@admipaedia.com	$2b$12$dPQWurZHpkakb21cfQc.EubWvqMNLN3VRuOvGwgSrY7a4WtSMY6RC	student	active	2025-06-06 00:40:31.46944	2025-06-06 00:40:31.46944	2025-05-22 00:40:31.46944
295	student171	student171@admipaedia.com	$2b$12$8iMqXqu26YR25nwQzGR1/Oegebh0cZhRozkmlu5lVoEYCpaAEHsTC	student	active	2025-06-06 00:40:31.77176	2025-06-06 00:40:31.77176	2025-05-28 00:40:31.770759
296	student172	student172@admipaedia.com	$2b$12$WXXddIHL2wTMZFyk9X7kb.HtlMdBbu1CeKCNq5STjDK0HdNQ.Bira	student	active	2025-06-06 00:40:32.012503	2025-06-06 00:40:32.012503	2025-05-23 00:40:32.011501
297	student173	student173@admipaedia.com	$2b$12$iFb8jif/vadsZ2Y6abGSZe3IkTZ68N2TQhIf78JhG2Ryx1zL7uZua	student	active	2025-06-06 00:40:32.32994	2025-06-06 00:40:32.32994	2025-05-18 00:40:32.32994
298	student174	student174@admipaedia.com	$2b$12$hy0Pr4QKhtk987qBKqtUiuPiqJCpsxuKOyc6N/z29hLt2Jr.hBtl6	student	active	2025-06-06 00:40:32.643319	2025-06-06 00:40:32.643319	2025-05-23 00:40:32.641706
299	student175	student175@admipaedia.com	$2b$12$gqB5vG7HCcgSHucctncMoOMprSHvHqDT4LqzwXZoXwOybwWzfX4ma	student	active	2025-06-06 00:40:33.134707	2025-06-06 00:40:33.135707	2025-05-10 00:40:33.134707
300	student176	student176@admipaedia.com	$2b$12$EoAs4zSMfvgm7InES1It9O6ZdUZ/Yfpc5ASYPwMVG4wukUl62gsPa	student	active	2025-06-06 00:40:33.536384	2025-06-06 00:40:33.536384	2025-05-25 00:40:33.535384
301	student177	student177@admipaedia.com	$2b$12$RDZYnx0sUE15.RpWb.MxeutDrN9CT7HJAeU3OHcBFdzFVC0yh31Ou	student	active	2025-06-06 00:40:33.829133	2025-06-06 00:40:33.829133	2025-05-17 00:40:33.829133
302	student178	student178@admipaedia.com	$2b$12$gFu3RsDKOiGN5r4mW66xw.ZLxsH32j49IrmMUt1fJ/ck8/NaXI5M6	student	active	2025-06-06 00:40:34.091251	2025-06-06 00:40:34.091251	2025-06-04 00:40:34.090251
303	student179	student179@admipaedia.com	$2b$12$3qi3vDpmRiOczyCHlfRaoegcpGsiqxBbBErXphJD.cd4LLjaRE3j.	student	active	2025-06-06 00:40:34.353589	2025-06-06 00:40:34.353589	2025-05-31 00:40:34.352318
304	student180	student180@admipaedia.com	$2b$12$pa1ef22/XRaXeSTzkP.Lh.c/c1qAN8TnPNGMN2w1LhxCvcUzyOLfa	student	active	2025-06-06 00:40:34.634167	2025-06-06 00:40:34.634167	2025-05-28 00:40:34.632681
305	student181	student181@admipaedia.com	$2b$12$zXKM2sjqcsP/kPSrxEepROrWN9EjdHeMtQBP65Zvj.3OA0ESe3Y0.	student	active	2025-06-06 00:40:34.89517	2025-06-06 00:40:34.89517	2025-06-03 00:40:34.89517
306	student182	student182@admipaedia.com	$2b$12$rsAEZFAAcIz/F3jmjJWSBO5UNMv2ytxvSQNQfbmuyZeSdUIJltMEm	student	active	2025-06-06 00:40:35.209176	2025-06-06 00:40:35.209176	2025-05-25 00:40:35.209176
307	student183	student183@admipaedia.com	$2b$12$WAnFiHVyYkuraTCh.YF3r..eY85BfMOBnbV9WzWrez/YMCpsAiUVq	student	active	2025-06-06 00:40:35.447871	2025-06-06 00:40:35.447871	2025-05-11 00:40:35.44687
308	student184	student184@admipaedia.com	$2b$12$k.e9jNxDh.r4ahTcZuk/7uyV4BpTlSnLCcF4e.vPELmkW6yHM6xGi	student	active	2025-06-06 00:40:35.775785	2025-06-06 00:40:35.775785	2025-05-27 00:40:35.775785
309	student185	student185@admipaedia.com	$2b$12$JG73wXI6xXjRqEax1yo1AuIdb.kBlLh8ZYMik9KM8Yu2WjDnhDpU2	student	active	2025-06-06 00:40:36.020218	2025-06-06 00:40:36.020218	2025-05-30 00:40:36.019218
310	student186	student186@admipaedia.com	$2b$12$jdF/7/YFZgw1C9XgInNIMOcjWM88RtWc4qpN7Ex1MX.B1y8h1KiuK	student	active	2025-06-06 00:40:36.326547	2025-06-06 00:40:36.326547	2025-05-31 00:40:36.325542
311	student187	student187@admipaedia.com	$2b$12$bwbT/gfBrQZHn4oFuCzjD.gp4IA/.VuwiXRrqgdouE7H4PFuUqg3C	student	active	2025-06-06 00:40:36.586299	2025-06-06 00:40:36.586299	2025-05-16 00:40:36.585308
312	student188	student188@admipaedia.com	$2b$12$dw2jFcdDJ.TTx5Yf5CdJKOrWx/pzydt1x54EJabM1PU0ImnxUprUe	student	active	2025-06-06 00:40:37.075214	2025-06-06 00:40:37.075214	2025-06-04 00:40:37.074709
313	student189	student189@admipaedia.com	$2b$12$5KXGwqmiRYmdJj02F02RSeJOvnDTMS3ZR8wRhA5rZ.EmaQ/b715DS	student	active	2025-06-06 00:40:37.4847	2025-06-06 00:40:37.4847	2025-05-29 00:40:37.483693
314	student190	student190@admipaedia.com	$2b$12$4r.PJefCt.jNoLokCs1wmei3O5yuxrXpmGjGbTXieGKYQtho0appC	student	active	2025-06-06 00:40:37.760476	2025-06-06 00:40:37.760476	2025-05-17 00:40:37.759476
315	student191	student191@admipaedia.com	$2b$12$jpPHUwM5siRSaXwwp9HTSu8KT3YMkAeRs/Ui05Z6VoGqdGsYiqwnm	student	active	2025-06-06 00:40:38.026723	2025-06-06 00:40:38.026723	2025-05-16 00:40:38.026723
316	student192	student192@admipaedia.com	$2b$12$yiwDWhKTaV84B9iuv1jQKeduFV5WyxvfogF04eN3IDdfbad9w1Ndq	student	active	2025-06-06 00:40:38.273269	2025-06-06 00:40:38.273269	2025-05-07 00:40:38.27034
317	student193	student193@admipaedia.com	$2b$12$LH/HB0GAtEarQZa3cQ7MV.4zVCwYTDYWst1VvpNnYDiThF9uLVmi.	student	active	2025-06-06 00:40:38.530342	2025-06-06 00:40:38.530342	2025-05-27 00:40:38.529337
318	student194	student194@admipaedia.com	$2b$12$44toKzz9rQyTgF/QrRpxUef/g/NJV1.K9RNi/XOeFKTmrGDfNw7RG	student	active	2025-06-06 00:40:38.781459	2025-06-06 00:40:38.781459	2025-05-08 00:40:38.780452
319	student195	student195@admipaedia.com	$2b$12$FNy5yM4i8QrXtHHbsZOc5.cMDtGgt36Mn.UUmKDdGVthiFfw8ZaK.	student	active	2025-06-06 00:40:39.050184	2025-06-06 00:40:39.050184	2025-05-31 00:40:39.049411
320	student196	student196@admipaedia.com	$2b$12$6hWgLG7vXXkrLllI0ljE7OXck7k3vW.FvRKzyVjPo4VPRAr.JTIVa	student	active	2025-06-06 00:40:39.32743	2025-06-06 00:40:39.32743	2025-05-20 00:40:39.326428
321	student197	student197@admipaedia.com	$2b$12$ii.dkOIxKAh7txAqb3dLRechCgNWhyruWhKEdY3lLimIK7bPcODVu	student	active	2025-06-06 00:40:39.614758	2025-06-06 00:40:39.614758	2025-05-11 00:40:39.613729
322	student198	student198@admipaedia.com	$2b$12$Ubx1K4N/QMirC1VxjvV/VeF4vUpOcwyjFLBLiVkbvHgvfduCKOmQu	student	active	2025-06-06 00:40:39.906389	2025-06-06 00:40:39.906389	2025-05-13 00:40:39.905712
323	student199	student199@admipaedia.com	$2b$12$ELQf7N0QLkssj12sBaCQb.3iwFHFmqNc2oOoL6IHl4Otz7sxfboye	student	active	2025-06-06 00:40:40.222905	2025-06-06 00:40:40.222905	2025-05-23 00:40:40.2209
324	student200	student200@admipaedia.com	$2b$12$wqOdfUZ7WEP1pHFOADCaAecMnh/mNCm.TLanlaE1dKcRF3MqB05om	student	active	2025-06-06 00:40:40.46555	2025-06-06 00:40:40.46555	2025-06-02 00:40:40.464529
325	student201	student201@admipaedia.com	$2b$12$hGT2tWtaNaT0qWsM2gIxu.w37vhg2xaU4kYd3EVU7grAVcLZj.Gz2	student	active	2025-06-06 00:40:40.919519	2025-06-06 00:40:40.919519	2025-05-14 00:40:40.918462
326	student202	student202@admipaedia.com	$2b$12$gcmQJx/fxfNKS.D5V1JgDOWdQUn4HSfZBOd.nffB.v/LDwgf9rsmq	student	active	2025-06-06 00:40:41.382153	2025-06-06 00:40:41.382153	2025-05-27 00:40:41.381176
327	student203	student203@admipaedia.com	$2b$12$adFNtFFgL3BDrzFv17C/jOsvXFZ2LV565tOVvG7IynPOvhETGRMhW	student	active	2025-06-06 00:40:41.692269	2025-06-06 00:40:41.692269	2025-05-17 00:40:41.692269
328	student204	student204@admipaedia.com	$2b$12$fvhYbg5cC6swU4bXWuxE9.X3PcU2zolHnvcd22KwOsW5Bqk7PubW.	student	active	2025-06-06 00:40:41.998982	2025-06-06 00:40:41.998982	2025-05-17 00:40:41.998982
329	student205	student205@admipaedia.com	$2b$12$vmzBexXPZNYhRSUHXsZ5QeiX0ciY.QlXBhdtfj/B4dkza5z.oAVeW	student	active	2025-06-06 00:40:42.254398	2025-06-06 00:40:42.254398	2025-05-28 00:40:42.253398
330	student206	student206@admipaedia.com	$2b$12$XIcpIyZQ5llU5fm9Kxvc4OpullTA5xJRAngNQGC.PnJJZ3nyUP2Ki	student	active	2025-06-06 00:40:42.523262	2025-06-06 00:40:42.523262	2025-05-07 00:40:42.522261
331	student207	student207@admipaedia.com	$2b$12$Uorkuk4F7.3Kd0f9A8mbwuBDiuiQzfhccGWd.zp5RKFHHFOy180vm	student	active	2025-06-06 00:40:42.771841	2025-06-06 00:40:42.771841	2025-06-03 00:40:42.771065
332	student208	student208@admipaedia.com	$2b$12$mu6BCnmngkIyynKbDTo7KOv1pdFXcTaMqw.H59HBNgyOtQLQFGYbO	student	active	2025-06-06 00:40:43.075045	2025-06-06 00:40:43.075045	2025-05-30 00:40:43.073744
333	student209	student209@admipaedia.com	$2b$12$gKPICF95Cf8838oOw5Uzj.RDJVrx0XntjnU53QqVCTFpqlNLlim2a	student	active	2025-06-06 00:40:43.30849	2025-06-06 00:40:43.30849	2025-05-27 00:40:43.30749
334	student210	student210@admipaedia.com	$2b$12$T1E64P8OM4qO97IPnqPPkuZzvWhTbAZAeyPblyym84ObfHP/4dTJu	student	active	2025-06-06 00:40:43.594569	2025-06-06 00:40:43.594569	2025-05-30 00:40:43.593569
335	student211	student211@admipaedia.com	$2b$12$mEf2PQR9381PaJNkc6ENA.joBeyU0m/wltcn1dNSmuERm3CZYrcN6	student	active	2025-06-06 00:40:43.831787	2025-06-06 00:40:43.831787	2025-06-03 00:40:43.830309
336	student212	student212@admipaedia.com	$2b$12$aa145CbH2DkuTxm9/h5OKuFULthPFSsaT0ccCS5ygGMPFzo6GcP2u	student	active	2025-06-06 00:40:44.138977	2025-06-06 00:40:44.138977	2025-05-08 00:40:44.138977
337	student213	student213@admipaedia.com	$2b$12$.qdG3/trg64CCC5EBdqLQu45JZjSJ0EkzIc/xrtfxE4hlUw/Drimq	student	active	2025-06-06 00:40:44.372319	2025-06-06 00:40:44.372319	2025-05-10 00:40:44.371317
338	student214	student214@admipaedia.com	$2b$12$N7KiICW1K/buij1mdtCDd.Na.DAH3TnEptkqKty9S2zCB56EOYH8i	student	active	2025-06-06 00:40:44.794059	2025-06-06 00:40:44.794059	2025-05-14 00:40:44.79305
339	student215	student215@admipaedia.com	$2b$12$s1Hwo68mLlxlJ/eIQDvrRejQomEWS7nkOVlI7mKd5KY/6dpqQXVLy	student	active	2025-06-06 00:40:45.066854	2025-06-06 00:40:45.066854	2025-05-29 00:40:45.066854
340	student216	student216@admipaedia.com	$2b$12$fQE.Nw5KHMvljxbL4KkJKuCQUEdRBEhHv7AQGnd1rD76OTSVYjyLS	student	active	2025-06-06 00:40:45.362325	2025-06-06 00:40:45.362325	2025-06-03 00:40:45.362325
341	student217	student217@admipaedia.com	$2b$12$nWqWYd5WtXLk6H6wekNSz.rMZxmW2Ptf7HoO.gpYBEijH7yvrazQK	student	active	2025-06-06 00:40:45.621051	2025-06-06 00:40:45.621051	2025-06-05 00:40:45.621051
342	student218	student218@admipaedia.com	$2b$12$Yrf9ECq8CgI/Qv/gCL1MdOcEsDHR9/9rA8J9jLSL/pqZFwuv/Qmce	student	active	2025-06-06 00:40:45.92145	2025-06-06 00:40:45.92145	2025-05-10 00:40:45.92145
343	student219	student219@admipaedia.com	$2b$12$jNhDWvrdrgD2VT1yRq6ASejOIs1GhyuVf7bf/yZDG6tfhn1/Cx/BK	student	active	2025-06-06 00:40:46.192854	2025-06-06 00:40:46.192854	2025-06-02 00:40:46.192854
344	student220	student220@admipaedia.com	$2b$12$lLuiphfm5HiXpmPxGbKJhOjqiVqUZ2VXIV3m3eSnKqgf3vT2slija	student	active	2025-06-06 00:40:46.476002	2025-06-06 00:40:46.476002	2025-05-22 00:40:46.476002
345	student221	student221@admipaedia.com	$2b$12$m2LaybN322SG5Sg/eSNSgOuE6REk.mTAvTKkEZGc6Y/km0UuROa2y	student	active	2025-06-06 00:40:46.721247	2025-06-06 00:40:46.721247	2025-05-21 00:40:46.720246
346	student222	student222@admipaedia.com	$2b$12$Ac2HBEk6fIub/6SFtL9mve6di..2F8/5cIG0VS8EiBt9RL9uclNuS	student	active	2025-06-06 00:40:47.018647	2025-06-06 00:40:47.018647	2025-05-07 00:40:47.017641
347	student223	student223@admipaedia.com	$2b$12$sOR95H1xBwU6GTXGeubrdequDkc3r4Vp8A2WMUFHjVB6XPpDshX9a	student	active	2025-06-06 00:40:47.261495	2025-06-06 00:40:47.261495	2025-05-29 00:40:47.260495
348	student224	student224@admipaedia.com	$2b$12$yLSZfO9JSCz/mDLDM6zUU.UrKkf3qgRUjWB5acOebkGOclO2Oa.oC	student	active	2025-06-06 00:40:47.533159	2025-06-06 00:40:47.533159	2025-06-05 00:40:47.530657
349	student225	student225@admipaedia.com	$2b$12$XCQ6oc3WIi.kxdniLAraBOkxa87gmuriJDvb0LZ4KPudMS2Hz2a5.	student	active	2025-06-06 00:40:47.788217	2025-06-06 00:40:47.788217	2025-05-16 00:40:47.787217
350	student226	student226@admipaedia.com	$2b$12$7q3IaKmvfSfsUqhwbG8pMOzz7gh.uWy6sk2i5gLHSj7ViU7zU5ER.	student	active	2025-06-06 00:40:48.073313	2025-06-06 00:40:48.073313	2025-05-11 00:40:48.071311
351	student227	student227@admipaedia.com	$2b$12$W7DKuHBvthdCjGyZEBR65edepurQpYMKtVTFnfwf3Gzc5.DxC/d1e	student	active	2025-06-06 00:40:48.338656	2025-06-06 00:40:48.338656	2025-05-23 00:40:48.337338
352	student228	student228@admipaedia.com	$2b$12$01GeMqYXhar3.0SG8I.0kuv9u6lecCygK2XzQcLQ7luI50Kr6vbri	student	active	2025-06-06 00:40:48.686025	2025-06-06 00:40:48.686025	2025-05-07 00:40:48.685028
353	student229	student229@admipaedia.com	$2b$12$ASaoGU/6ilFJspDRsdJEr.MOaVhtoU1c8chTvWvvl2W4SGTl2GLru	student	active	2025-06-06 00:40:48.978792	2025-06-06 00:40:48.978792	2025-05-30 00:40:48.977806
354	student230	student230@admipaedia.com	$2b$12$5DX.druOWUF7LIZSLs0YMOTI/rWsa63g.0OFgS/SbNBMIJmOVbeuK	student	active	2025-06-06 00:40:49.304499	2025-06-06 00:40:49.304499	2025-05-25 00:40:49.304499
355	student231	student231@admipaedia.com	$2b$12$4nla85p6DMXy.VzV293bnenovAzOw3VNLYrey1OPSnzX974Ycgdfm	student	active	2025-06-06 00:40:49.574956	2025-06-06 00:40:49.574956	2025-05-18 00:40:49.574956
356	student232	student232@admipaedia.com	$2b$12$J86VN6NVC5ntHTY9kfi4I.O8wwKxisrwAiPusGGJ/ARN2sYvMsV2S	student	active	2025-06-06 00:40:49.828549	2025-06-06 00:40:49.828549	2025-05-07 00:40:49.826413
357	student233	student233@admipaedia.com	$2b$12$qwVablZB9LH0iBfYapts7O2/TQaBBbnVM8Dq8OQ7vvVeCN1HigjJy	student	active	2025-06-06 00:40:50.065243	2025-06-06 00:40:50.065243	2025-05-09 00:40:50.063796
358	student234	student234@admipaedia.com	$2b$12$FxPQXUfNtiw7n2SCzNvifOW0nRPhr7BUMIKxHbfTiL58Wf4Nk6QUG	student	active	2025-06-06 00:40:50.357133	2025-06-06 00:40:50.357133	2025-05-26 00:40:50.356133
359	student235	student235@admipaedia.com	$2b$12$JpCZ062j5e.deWC8Ft421.Zua0dnVRr6QCGtKXG8qQgb.5EUhhsjS	student	active	2025-06-06 00:40:50.617877	2025-06-06 00:40:50.617877	2025-06-04 00:40:50.616875
360	student236	student236@admipaedia.com	$2b$12$2XobizPhtJPfgB4He2KKH.i3wxoF3IhQrlV8uEKRuqYSlwwP8cosu	student	active	2025-06-06 00:40:50.875854	2025-06-06 00:40:50.875854	2025-05-09 00:40:50.874852
361	student237	student237@admipaedia.com	$2b$12$GvbSC/WZaw31CaoXA5GDmOiPtm7jUZaL1E.l8DZ86amebK5r0rRsm	student	active	2025-06-06 00:40:51.151298	2025-06-06 00:40:51.151298	2025-05-31 00:40:51.150298
362	student238	student238@admipaedia.com	$2b$12$LfuzaCoVLsqRiMbxsx3KPOqq/3L6Lc1pWvKtXtnIkYbkTEKVQn9ai	student	active	2025-06-06 00:40:51.39031	2025-06-06 00:40:51.39031	2025-05-22 00:40:51.38931
363	student239	student239@admipaedia.com	$2b$12$bGGcC8FRsIW9aOxcqL8z..Lr9IAOJbfl5OZ2DYSsfQ6TcKGEYlun2	student	active	2025-06-06 00:40:51.657136	2025-06-06 00:40:51.657136	2025-05-11 00:40:51.656132
364	student240	student240@admipaedia.com	$2b$12$Dfzxx5e8S/pVvJScZWCv0OFaRnNnxuUlMATY4S0Re7mG2W.Az3tyO	student	active	2025-06-06 00:40:51.90873	2025-06-06 00:40:51.90873	2025-05-18 00:40:51.907736
365	student241	student241@admipaedia.com	$2b$12$BC0W0xUpVp/D44rW6xrgS.6nXpaSu46wPOE.GxoFKY3nMIsrgBs.q	student	active	2025-06-06 00:40:52.236723	2025-06-06 00:40:52.236723	2025-05-10 00:40:52.236723
366	student242	student242@admipaedia.com	$2b$12$vsYa0O0xWP4j9uqBMU9RDe7biub9/o27qVRp0Fd7Wq6IwHZaDRWfO	student	active	2025-06-06 00:40:52.612466	2025-06-06 00:40:52.612466	2025-06-01 00:40:52.611463
367	student243	student243@admipaedia.com	$2b$12$d7UjRGCnNUKFTvUHIjr4Tedme63pnMArbKaCpYHGK6mOIXEkItGf6	student	active	2025-06-06 00:40:53.006708	2025-06-06 00:40:53.006708	2025-05-30 00:40:53.005202
368	student244	student244@admipaedia.com	$2b$12$I9wQqneoVi0uqgox59Pc.uBqICkiva7bWA/GOBmlSLioxt2kMRjEG	student	active	2025-06-06 00:40:53.404843	2025-06-06 00:40:53.404843	2025-05-19 00:40:53.403842
369	student245	student245@admipaedia.com	$2b$12$TlLVXu.ihbRAzJERfD3qqevoqRR5Ta2aMurbOXf.Y5VXxBCDcIls.	student	active	2025-06-06 00:40:53.698569	2025-06-06 00:40:53.698569	2025-05-28 00:40:53.697205
370	student246	student246@admipaedia.com	$2b$12$gGRjwFUQMA8T56RIoP2WwO0zssRXLMvrWs5YbTmoR3gxMj.gHC/66	student	active	2025-06-06 00:40:53.943705	2025-06-06 00:40:53.943705	2025-05-23 00:40:53.942704
371	student247	student247@admipaedia.com	$2b$12$szOtxVqRvWLEwOuCGcmvFeXsCHlbNMJcRSw1gNtgOR65n3x5Kt7Ie	student	active	2025-06-06 00:40:54.208701	2025-06-06 00:40:54.208701	2025-06-02 00:40:54.207699
372	student248	student248@admipaedia.com	$2b$12$korS9ZbN34a83VwNQ.N.W.B583epwiSZGnJ7ARQu5djJl2ZmDpNRa	student	active	2025-06-06 00:40:54.490338	2025-06-06 00:40:54.490338	2025-05-30 00:40:54.48899
373	student249	student249@admipaedia.com	$2b$12$9XDVrxN1tFBZM19UvcNqVeztoGNYbKSE/lm1Yfi21IOztmTFS8wjq	student	active	2025-06-06 00:40:54.780088	2025-06-06 00:40:54.780088	2025-05-27 00:40:54.779091
374	student250	student250@admipaedia.com	$2b$12$H0w.xIoq5JoqaK9CrNBPC.aNQsaGq14EteaNkRCRkbqVKUsT9EFR.	student	active	2025-06-06 00:40:55.058769	2025-06-06 00:40:55.058769	2025-05-11 00:40:55.057753
375	student251	student251@admipaedia.com	$2b$12$D7E3VgUR7786gNp9EsEFPOihh0eU3DP8b6D6C9D4yf4hCOmn/1Kui	student	active	2025-06-06 00:40:55.287736	2025-06-06 00:40:55.287736	2025-05-18 00:40:55.287736
376	student252	student252@admipaedia.com	$2b$12$cpYppzqa86kfX7/JqHo04OHJ3fwekJByCncmf3w0f0QDtlPFJ8cVu	student	active	2025-06-06 00:40:55.566047	2025-06-06 00:40:55.566047	2025-05-26 00:40:55.565045
377	student253	student253@admipaedia.com	$2b$12$sjZGOhLJNQ79VIq1Kzs6huXYGSpH3y9o8/Is9iLEeHm4kDchM8Owq	student	active	2025-06-06 00:40:55.806492	2025-06-06 00:40:55.806492	2025-05-21 00:40:55.805491
378	student254	student254@admipaedia.com	$2b$12$3U3hOZpsPK/q7d134j70QeJ8.NNYY14E6qAm/JuRQDiNCmM5zwD.a	student	active	2025-06-06 00:40:56.076512	2025-06-06 00:40:56.076512	2025-05-10 00:40:56.075507
379	student255	student255@admipaedia.com	$2b$12$kINoY4XDygyMF2KQEFPAyOvTqU0XCS6Wc9g.L2ojmoexz/jR7HpZa	student	active	2025-06-06 00:40:56.331893	2025-06-06 00:40:56.331893	2025-06-02 00:40:56.330891
380	student256	student256@admipaedia.com	$2b$12$X7uOIuI.Pq7xIkc/l4rN3.qBUiD4yKv5YGwp0Sf8pRUoDBgd/y.J6	student	active	2025-06-06 00:40:56.686054	2025-06-06 00:40:56.686054	2025-06-01 00:40:56.685058
381	student257	student257@admipaedia.com	$2b$12$PAbQEr73bmBqzbhaTNvbGuq6r5N3altqFZlSHRs6TeYs1B8lnAad.	student	active	2025-06-06 00:40:57.170311	2025-06-06 00:40:57.170311	2025-05-14 00:40:57.169423
382	student258	student258@admipaedia.com	$2b$12$AgTfi3InWraH4HRCZl010u63nkYyXDlm/GHEz8jdixjkHhRu3/M0a	student	active	2025-06-06 00:40:57.505956	2025-06-06 00:40:57.505956	2025-06-03 00:40:57.504955
383	student259	student259@admipaedia.com	$2b$12$9Tl7X2N4IcxPGShikwBHeeZ.CFVp3fyGOQud/Sb8eE1/jPwxR3Qdy	student	active	2025-06-06 00:40:57.816627	2025-06-06 00:40:57.816627	2025-05-30 00:40:57.814626
384	student260	student260@admipaedia.com	$2b$12$qse9B7WnuCNiG/MH82hvIuy1q6aDjjo3S9V25nX3ybSSif97WGyEu	student	active	2025-06-06 00:40:58.073188	2025-06-06 00:40:58.073188	2025-05-31 00:40:58.071188
385	student261	student261@admipaedia.com	$2b$12$5gvO7aUMsLJaKUap0a/Bg.ru190.5OYxoQI3L5WM4pZbQ27NXxzY.	student	active	2025-06-06 00:40:58.365214	2025-06-06 00:40:58.365214	2025-05-11 00:40:58.365214
386	student262	student262@admipaedia.com	$2b$12$s.fa4x/I/d58982AO1qtIO0.qUREZ61RJuQeIPF2gQRlHikffYJlC	student	active	2025-06-06 00:40:58.62174	2025-06-06 00:40:58.62174	2025-05-22 00:40:58.620257
387	student263	student263@admipaedia.com	$2b$12$yZlLx32qwiQjalrzjJ3sE.9pnHHqfw/ZYDW40tZrda1WtGfAr1iLO	student	active	2025-06-06 00:40:58.869216	2025-06-06 00:40:58.869216	2025-06-05 00:40:58.868214
388	student264	student264@admipaedia.com	$2b$12$Ay726HpPt87ezVyndSjtuen4WXbV.mo6JSXbtZCwPybSNM2DRkGwO	student	active	2025-06-06 00:40:59.153222	2025-06-06 00:40:59.153222	2025-05-17 00:40:59.153222
389	student265	student265@admipaedia.com	$2b$12$AMe16oMYgPqoOyHMi0.H2.RvHp2h1d.yj7DcZ.B9SOKY5oAXvrPb2	student	active	2025-06-06 00:40:59.393194	2025-06-06 00:40:59.393194	2025-05-27 00:40:59.393194
390	student266	student266@admipaedia.com	$2b$12$jA6Q2q945QID6qbBDUwpGOvzuQpp15vX0pCiMQwnDtbhz8EggO/BS	student	active	2025-06-06 00:40:59.708581	2025-06-06 00:40:59.708581	2025-05-12 00:40:59.707556
391	student267	student267@admipaedia.com	$2b$12$RHBuTxE2fjz/LQqUrxSXAuTAdRkA2OZqb.D5r6AT8QuBhfPCULKZu	student	active	2025-06-06 00:40:59.95504	2025-06-06 00:40:59.95504	2025-05-09 00:40:59.95504
392	student268	student268@admipaedia.com	$2b$12$SeEkUFjmBRVjx2SeTSGRpeiztasQBLIYqLjGciQF6r7cDeXQQqANO	student	active	2025-06-06 00:41:00.27869	2025-06-06 00:41:00.27869	2025-05-26 00:41:00.278031
393	student269	student269@admipaedia.com	$2b$12$Z7T2gByi/w7Viz/CFUp9q.Ae5tupMr2f8odyh6qO/qzl8bpfz861u	student	active	2025-06-06 00:41:00.576616	2025-06-06 00:41:00.576616	2025-05-23 00:41:00.574623
394	student270	student270@admipaedia.com	$2b$12$rykjbJjbGEZQGCKSuZNn8efMO4Vbov4behMpW8tswUl51xaKpN6zi	student	active	2025-06-06 00:41:01.072071	2025-06-06 00:41:01.072071	2025-05-08 00:41:01.070069
395	student271	student271@admipaedia.com	$2b$12$2d2XxzRS9khto2dNuMTXQuvIeGqMABV5cr0rZNydlvlI5SerJLLZO	student	active	2025-06-06 00:41:01.471549	2025-06-06 00:41:01.471549	2025-05-29 00:41:01.470145
396	student272	student272@admipaedia.com	$2b$12$jCIYWbUFXBnky/h.1uMMDe1xL6YW2wZEM8b.VoKFARAtL1qiz15gC	student	active	2025-06-06 00:41:01.746797	2025-06-06 00:41:01.746797	2025-06-05 00:41:01.745797
397	student273	student273@admipaedia.com	$2b$12$kpqVPP0TRDr5DhMg2Db1wO3264jX2.OyR3tEkoXDw6CcahZ4lvdn.	student	active	2025-06-06 00:41:02.006134	2025-06-06 00:41:02.006134	2025-06-03 00:41:02.005616
398	student274	student274@admipaedia.com	$2b$12$YhVKbd0xBNdq2cbfltoNOOXZ/eImveQcqEWC8bUwHORxFy6vbXmRu	student	active	2025-06-06 00:41:02.267974	2025-06-06 00:41:02.267974	2025-05-27 00:41:02.266613
399	student275	student275@admipaedia.com	$2b$12$kDSGhf0BxHsVZDsKYiWqNOzSUSpCdYe0o8tX/I1okP23H2uWPElz2	student	active	2025-06-06 00:41:02.547748	2025-06-06 00:41:02.547748	2025-05-31 00:41:02.546747
400	student276	student276@admipaedia.com	$2b$12$IqTDvNROTrPX1Ohju9q9d.NSCeHMfmgcdIiJzkXnsSnv13eR5nwtq	student	active	2025-06-06 00:41:02.800606	2025-06-06 00:41:02.800606	2025-05-15 00:41:02.799599
401	student277	student277@admipaedia.com	$2b$12$t0qlV0b5Nz2ByikymXAZweqytKCJFzNDaqHIaP4HfAsuTOotQtaqS	student	active	2025-06-06 00:41:03.095242	2025-06-06 00:41:03.095242	2025-05-25 00:41:03.094237
402	student278	student278@admipaedia.com	$2b$12$l0KCJYh2EEUpS2wIQW8njuXAcjnSofD/CFmHbBV9bIhzj20F/1PTG	student	active	2025-06-06 00:41:03.325952	2025-06-06 00:41:03.325952	2025-05-31 00:41:03.324631
403	student279	student279@admipaedia.com	$2b$12$bayl1SL38MpMjVu77HgZCe8MrdOQashqgwy/c9SiBKmLWA4/EbX.O	student	active	2025-06-06 00:41:03.603841	2025-06-06 00:41:03.603841	2025-05-24 00:41:03.603841
404	student280	student280@admipaedia.com	$2b$12$Eitfw4OKgkaTzVzTrDK5vu4qtXXA3APdewVsNH3TjQQtEgh1l/Goa	student	active	2025-06-06 00:41:03.842315	2025-06-06 00:41:03.842315	2025-05-18 00:41:03.841308
405	student281	student281@admipaedia.com	$2b$12$EtFHaBgLzw1iz4csD9JzEuFKl25HN83D1JwCR1DQLR9UR4rSukFp2	student	active	2025-06-06 00:41:04.160928	2025-06-06 00:41:04.160928	2025-05-19 00:41:04.160928
406	student282	student282@admipaedia.com	$2b$12$ohS5lWjT0xEpvz4cz3CHGO/v7st57odNt2ziqUNn8suL2AWBt0sZG	student	active	2025-06-06 00:41:04.413674	2025-06-06 00:41:04.413674	2025-05-20 00:41:04.412673
407	student283	student283@admipaedia.com	$2b$12$8giUBY7uaXkKzbix5TftU.HcDTAImkHwuvS/uHX2c1VfnnfWkIIxq	student	active	2025-06-06 00:41:04.777164	2025-06-06 00:41:04.777164	2025-06-03 00:41:04.776632
408	student284	student284@admipaedia.com	$2b$12$9ZYgdCh1DSpxbuYM.fvqjOoFV.rV4pAld0z1Fz5R/qFrBc7ybWE3a	student	active	2025-06-06 00:41:05.145785	2025-06-06 00:41:05.145785	2025-05-28 00:41:05.144782
409	student285	student285@admipaedia.com	$2b$12$zko9Qh.haHEIGEIGYP/1nOZ7MSCLhES9dp8KktWy9wOXBB.a1mnnC	student	active	2025-06-06 00:41:05.498076	2025-06-06 00:41:05.498076	2025-05-24 00:41:05.496691
410	student286	student286@admipaedia.com	$2b$12$PjopaeCAi1f82ZLP7dAc4embmYQXURp2oHD2FUn.bGjXdsHYVYDa6	student	active	2025-06-06 00:41:05.797136	2025-06-06 00:41:05.797136	2025-05-21 00:41:05.794983
411	student287	student287@admipaedia.com	$2b$12$VuwsTrfZnofwrTWQ7y3.mu0cTuCi9sHykd15pDeNBmxB/Q35kq.Oy	student	active	2025-06-06 00:41:06.04473	2025-06-06 00:41:06.04473	2025-05-25 00:41:06.043729
412	student288	student288@admipaedia.com	$2b$12$WG4ZdAcekXbNYxjJaummt.HVQ.XQthrGHhO9a3jBxTZnSrW9t/QR2	student	active	2025-06-06 00:41:06.309174	2025-06-06 00:41:06.309174	2025-05-15 00:41:06.308173
426	elzakari1_6650	elzakari1@gmail.com	defaultPassword123	user	active	2025-06-21 00:36:16.878701	2025-06-21 00:36:16.878701	\N
427	abenya.ba_2226	abenya.ba@gmail.com	defaultPassword123	student	active	2025-06-21 01:33:52.260857	2025-06-21 01:33:52.260857	\N
\.


--
-- TOC entry 6033 (class 0 OID 100858)
-- Dependencies: 341
-- Data for Name: values_education_resources; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.values_education_resources (id, title, description, resource_type, format, language, educational_level_id, character_domains, content_url, duration_minutes, difficulty_level, cultural_background, moral_lessons, discussion_questions, usage_count, average_rating, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6165 (class 0 OID 0)
-- Dependencies: 362
-- Name: activity_implementations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.activity_implementations_id_seq', 1, false);


--
-- TOC entry 6166 (class 0 OID 0)
-- Dependencies: 249
-- Name: announcements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.announcements_id_seq', 1, false);


--
-- TOC entry 6167 (class 0 OID 0)
-- Dependencies: 344
-- Name: assessment_analytics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.assessment_analytics_id_seq', 1, false);


--
-- TOC entry 6168 (class 0 OID 0)
-- Dependencies: 308
-- Name: assessment_frameworks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.assessment_frameworks_id_seq', 1, false);


--
-- TOC entry 6169 (class 0 OID 0)
-- Dependencies: 300
-- Name: assessment_frequencies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.assessment_frequencies_id_seq', 1, false);


--
-- TOC entry 6170 (class 0 OID 0)
-- Dependencies: 304
-- Name: assessment_modes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.assessment_modes_id_seq', 1, false);


--
-- TOC entry 6171 (class 0 OID 0)
-- Dependencies: 364
-- Name: assessment_rubrics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.assessment_rubrics_id_seq', 1, false);


--
-- TOC entry 6172 (class 0 OID 0)
-- Dependencies: 382
-- Name: assessment_scores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.assessment_scores_id_seq', 1, false);


--
-- TOC entry 6173 (class 0 OID 0)
-- Dependencies: 366
-- Name: assessment_submissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.assessment_submissions_id_seq', 1, false);


--
-- TOC entry 6174 (class 0 OID 0)
-- Dependencies: 342
-- Name: assessment_tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.assessment_tasks_id_seq', 1, false);


--
-- TOC entry 6175 (class 0 OID 0)
-- Dependencies: 276
-- Name: assessment_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.assessment_types_id_seq', 1, false);


--
-- TOC entry 6176 (class 0 OID 0)
-- Dependencies: 380
-- Name: assets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.assets_id_seq', 1, false);


--
-- TOC entry 6177 (class 0 OID 0)
-- Dependencies: 262
-- Name: assignment_submissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.assignment_submissions_id_seq', 1, false);


--
-- TOC entry 6178 (class 0 OID 0)
-- Dependencies: 258
-- Name: assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.assignments_id_seq', 1, false);


--
-- TOC entry 6179 (class 0 OID 0)
-- Dependencies: 235
-- Name: attendances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.attendances_id_seq', 6606, true);


--
-- TOC entry 6180 (class 0 OID 0)
-- Dependencies: 353
-- Name: budgets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.budgets_id_seq', 1, false);


--
-- TOC entry 6181 (class 0 OID 0)
-- Dependencies: 336
-- Name: character_activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.character_activities_id_seq', 1, false);


--
-- TOC entry 6182 (class 0 OID 0)
-- Dependencies: 334
-- Name: character_assessments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.character_assessments_id_seq', 1, false);


--
-- TOC entry 6183 (class 0 OID 0)
-- Dependencies: 338
-- Name: character_development_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.character_development_plans_id_seq', 1, false);


--
-- TOC entry 6184 (class 0 OID 0)
-- Dependencies: 298
-- Name: character_domains_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.character_domains_id_seq', 1, false);


--
-- TOC entry 6185 (class 0 OID 0)
-- Dependencies: 302
-- Name: character_traits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.character_traits_id_seq', 1, false);


--
-- TOC entry 6186 (class 0 OID 0)
-- Dependencies: 227
-- Name: classes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.classes_id_seq', 40, true);


--
-- TOC entry 6187 (class 0 OID 0)
-- Dependencies: 286
-- Name: competency_domains_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.competency_domains_id_seq', 1, false);


--
-- TOC entry 6188 (class 0 OID 0)
-- Dependencies: 328
-- Name: competency_evidence_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.competency_evidence_id_seq', 1, false);


--
-- TOC entry 6189 (class 0 OID 0)
-- Dependencies: 290
-- Name: competency_indicators_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.competency_indicators_id_seq', 1, false);


--
-- TOC entry 6190 (class 0 OID 0)
-- Dependencies: 330
-- Name: competency_learning_activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.competency_learning_activities_id_seq', 1, false);


--
-- TOC entry 6191 (class 0 OID 0)
-- Dependencies: 322
-- Name: continuous_assessment_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.continuous_assessment_records_id_seq', 1, false);


--
-- TOC entry 6192 (class 0 OID 0)
-- Dependencies: 270
-- Name: core_competencies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.core_competencies_id_seq', 1, false);


--
-- TOC entry 6193 (class 0 OID 0)
-- Dependencies: 260
-- Name: curricula_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.curricula_id_seq', 1, false);


--
-- TOC entry 6194 (class 0 OID 0)
-- Dependencies: 264
-- Name: curriculum_units_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.curriculum_units_id_seq', 1, false);


--
-- TOC entry 6195 (class 0 OID 0)
-- Dependencies: 255
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.departments_id_seq', 10, true);


--
-- TOC entry 6196 (class 0 OID 0)
-- Dependencies: 368
-- Name: differentiated_assessments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.differentiated_assessments_id_seq', 1, false);


--
-- TOC entry 6197 (class 0 OID 0)
-- Dependencies: 306
-- Name: differentiation_strategies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.differentiation_strategies_id_seq', 1, false);


--
-- TOC entry 6198 (class 0 OID 0)
-- Dependencies: 268
-- Name: educational_levels_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.educational_levels_id_seq', 1, false);


--
-- TOC entry 6199 (class 0 OID 0)
-- Dependencies: 282
-- Name: enhanced_grades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.enhanced_grades_id_seq', 1, false);


--
-- TOC entry 6200 (class 0 OID 0)
-- Dependencies: 359
-- Name: enhanced_sba_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.enhanced_sba_id_seq', 1, false);


--
-- TOC entry 6201 (class 0 OID 0)
-- Dependencies: 239
-- Name: exams_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.exams_id_seq', 1004, true);


--
-- TOC entry 6202 (class 0 OID 0)
-- Dependencies: 372
-- Name: external_exam_import_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.external_exam_import_logs_id_seq', 1, false);


--
-- TOC entry 6203 (class 0 OID 0)
-- Dependencies: 370
-- Name: external_exam_registrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.external_exam_registrations_id_seq', 1, false);


--
-- TOC entry 6204 (class 0 OID 0)
-- Dependencies: 384
-- Name: external_exam_results_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.external_exam_results_id_seq', 1, false);


--
-- TOC entry 6205 (class 0 OID 0)
-- Dependencies: 348
-- Name: external_examinations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.external_examinations_id_seq', 1, false);


--
-- TOC entry 6206 (class 0 OID 0)
-- Dependencies: 357
-- Name: facilities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.facilities_id_seq', 1, false);


--
-- TOC entry 6207 (class 0 OID 0)
-- Dependencies: 386
-- Name: fee_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fee_payments_id_seq', 1, false);


--
-- TOC entry 6208 (class 0 OID 0)
-- Dependencies: 376
-- Name: fee_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fee_records_id_seq', 1, false);


--
-- TOC entry 6209 (class 0 OID 0)
-- Dependencies: 355
-- Name: fee_structures_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fee_structures_id_seq', 1, false);


--
-- TOC entry 6210 (class 0 OID 0)
-- Dependencies: 284
-- Name: final_grades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.final_grades_id_seq', 1, false);


--
-- TOC entry 6211 (class 0 OID 0)
-- Dependencies: 280
-- Name: grade_boundaries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.grade_boundaries_id_seq', 1, false);


--
-- TOC entry 6212 (class 0 OID 0)
-- Dependencies: 241
-- Name: grades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.grades_id_seq', 8416, true);


--
-- TOC entry 6213 (class 0 OID 0)
-- Dependencies: 278
-- Name: grading_schemes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.grading_schemes_id_seq', 1, false);


--
-- TOC entry 6214 (class 0 OID 0)
-- Dependencies: 274
-- Name: grading_standards_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.grading_standards_id_seq', 1, false);


--
-- TOC entry 6215 (class 0 OID 0)
-- Dependencies: 294
-- Name: learning_approaches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.learning_approaches_id_seq', 1, false);


--
-- TOC entry 6216 (class 0 OID 0)
-- Dependencies: 350
-- Name: learning_objectives_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.learning_objectives_id_seq', 1, false);


--
-- TOC entry 6217 (class 0 OID 0)
-- Dependencies: 251
-- Name: lessons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lessons_id_seq', 1, false);


--
-- TOC entry 6218 (class 0 OID 0)
-- Dependencies: 221
-- Name: login_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.login_history_id_seq', 1, false);


--
-- TOC entry 6219 (class 0 OID 0)
-- Dependencies: 378
-- Name: maintenance_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.maintenance_requests_id_seq', 1, false);


--
-- TOC entry 6220 (class 0 OID 0)
-- Dependencies: 237
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- TOC entry 6221 (class 0 OID 0)
-- Dependencies: 223
-- Name: parents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.parents_id_seq', 100, true);


--
-- TOC entry 6222 (class 0 OID 0)
-- Dependencies: 288
-- Name: proficiency_levels_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.proficiency_levels_id_seq', 1, false);


--
-- TOC entry 6223 (class 0 OID 0)
-- Dependencies: 253
-- Name: resources_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.resources_id_seq', 1, false);


--
-- TOC entry 6224 (class 0 OID 0)
-- Dependencies: 217
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roles_id_seq', 8, true);


--
-- TOC entry 6225 (class 0 OID 0)
-- Dependencies: 324
-- Name: school_based_assessments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.school_based_assessments_id_seq', 1, false);


--
-- TOC entry 6226 (class 0 OID 0)
-- Dependencies: 316
-- Name: stem_assessment_results_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stem_assessment_results_id_seq', 1, false);


--
-- TOC entry 6227 (class 0 OID 0)
-- Dependencies: 314
-- Name: stem_assessments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stem_assessments_id_seq', 1, false);


--
-- TOC entry 6228 (class 0 OID 0)
-- Dependencies: 292
-- Name: stem_domains_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stem_domains_id_seq', 1, false);


--
-- TOC entry 6229 (class 0 OID 0)
-- Dependencies: 310
-- Name: stem_learning_modules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stem_learning_modules_id_seq', 1, false);


--
-- TOC entry 6230 (class 0 OID 0)
-- Dependencies: 332
-- Name: stem_project_submissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stem_project_submissions_id_seq', 1, false);


--
-- TOC entry 6231 (class 0 OID 0)
-- Dependencies: 312
-- Name: stem_projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stem_projects_id_seq', 1, false);


--
-- TOC entry 6232 (class 0 OID 0)
-- Dependencies: 320
-- Name: stem_resource_bookings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stem_resource_bookings_id_seq', 1, false);


--
-- TOC entry 6233 (class 0 OID 0)
-- Dependencies: 318
-- Name: stem_resource_center_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stem_resource_center_id_seq', 1, false);


--
-- TOC entry 6234 (class 0 OID 0)
-- Dependencies: 296
-- Name: stem_subjects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stem_subjects_id_seq', 1, false);


--
-- TOC entry 6235 (class 0 OID 0)
-- Dependencies: 272
-- Name: student_competency_assessments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.student_competency_assessments_id_seq', 1, false);


--
-- TOC entry 6236 (class 0 OID 0)
-- Dependencies: 326
-- Name: student_competency_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.student_competency_profiles_id_seq', 1, false);


--
-- TOC entry 6237 (class 0 OID 0)
-- Dependencies: 346
-- Name: student_progressions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.student_progressions_id_seq', 1, false);


--
-- TOC entry 6238 (class 0 OID 0)
-- Dependencies: 229
-- Name: students_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.students_id_seq', 305, true);


--
-- TOC entry 6239 (class 0 OID 0)
-- Dependencies: 231
-- Name: subjects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.subjects_id_seq', 11, true);


--
-- TOC entry 6240 (class 0 OID 0)
-- Dependencies: 247
-- Name: teacher_attendances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.teacher_attendances_id_seq', 1, false);


--
-- TOC entry 6241 (class 0 OID 0)
-- Dependencies: 225
-- Name: teachers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.teachers_id_seq', 18, true);


--
-- TOC entry 6242 (class 0 OID 0)
-- Dependencies: 374
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.transactions_id_seq', 1, false);


--
-- TOC entry 6243 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 427, true);


--
-- TOC entry 6244 (class 0 OID 0)
-- Dependencies: 340
-- Name: values_education_resources_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.values_education_resources_id_seq', 1, false);


--
-- TOC entry 5560 (class 2606 OID 101071)
-- Name: activity_implementations activity_implementations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_implementations
    ADD CONSTRAINT activity_implementations_pkey PRIMARY KEY (id);


--
-- TOC entry 5558 (class 2606 OID 101052)
-- Name: activity_traits activity_traits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_traits
    ADD CONSTRAINT activity_traits_pkey PRIMARY KEY (activity_id, trait_id);


--
-- TOC entry 5400 (class 2606 OID 99633)
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- TOC entry 5372 (class 2606 OID 90746)
-- Name: analytics analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics
    ADD CONSTRAINT analytics_pkey PRIMARY KEY (id);


--
-- TOC entry 5378 (class 2606 OID 90832)
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- TOC entry 5540 (class 2606 OID 100893)
-- Name: assessment_analytics assessment_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_analytics
    ADD CONSTRAINT assessment_analytics_pkey PRIMARY KEY (id);


--
-- TOC entry 5486 (class 2606 OID 100120)
-- Name: assessment_frameworks assessment_frameworks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_frameworks
    ADD CONSTRAINT assessment_frameworks_pkey PRIMARY KEY (id);


--
-- TOC entry 5469 (class 2606 OID 100068)
-- Name: assessment_frequencies assessment_frequencies_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_frequencies
    ADD CONSTRAINT assessment_frequencies_name_key UNIQUE (name);


--
-- TOC entry 5471 (class 2606 OID 100066)
-- Name: assessment_frequencies assessment_frequencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_frequencies
    ADD CONSTRAINT assessment_frequencies_pkey PRIMARY KEY (id);


--
-- TOC entry 5476 (class 2606 OID 100098)
-- Name: assessment_modes assessment_modes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_modes
    ADD CONSTRAINT assessment_modes_code_key UNIQUE (code);


--
-- TOC entry 5478 (class 2606 OID 100100)
-- Name: assessment_modes assessment_modes_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_modes
    ADD CONSTRAINT assessment_modes_name_key UNIQUE (name);


--
-- TOC entry 5480 (class 2606 OID 100096)
-- Name: assessment_modes assessment_modes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_modes
    ADD CONSTRAINT assessment_modes_pkey PRIMARY KEY (id);


--
-- TOC entry 5562 (class 2606 OID 101095)
-- Name: assessment_rubrics assessment_rubrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_rubrics
    ADD CONSTRAINT assessment_rubrics_pkey PRIMARY KEY (id);


--
-- TOC entry 5586 (class 2606 OID 101280)
-- Name: assessment_scores assessment_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_scores
    ADD CONSTRAINT assessment_scores_pkey PRIMARY KEY (id);


--
-- TOC entry 5564 (class 2606 OID 101109)
-- Name: assessment_submissions assessment_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_submissions
    ADD CONSTRAINT assessment_submissions_pkey PRIMARY KEY (id);


--
-- TOC entry 5538 (class 2606 OID 100879)
-- Name: assessment_tasks assessment_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_tasks
    ADD CONSTRAINT assessment_tasks_pkey PRIMARY KEY (id);


--
-- TOC entry 5423 (class 2606 OID 99860)
-- Name: assessment_types assessment_types_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_types
    ADD CONSTRAINT assessment_types_code_key UNIQUE (code);


--
-- TOC entry 5425 (class 2606 OID 99862)
-- Name: assessment_types assessment_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_types
    ADD CONSTRAINT assessment_types_name_key UNIQUE (name);


--
-- TOC entry 5427 (class 2606 OID 99858)
-- Name: assessment_types assessment_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_types
    ADD CONSTRAINT assessment_types_pkey PRIMARY KEY (id);


--
-- TOC entry 5582 (class 2606 OID 101261)
-- Name: assets assets_asset_tag_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_asset_tag_key UNIQUE (asset_tag);


--
-- TOC entry 5584 (class 2606 OID 101259)
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- TOC entry 5396 (class 2606 OID 90965)
-- Name: assignment_submissions assignment_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_pkey PRIMARY KEY (id);


--
-- TOC entry 5392 (class 2606 OID 90922)
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- TOC entry 5360 (class 2606 OID 82463)
-- Name: attendances attendances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT attendances_pkey PRIMARY KEY (id);


--
-- TOC entry 5550 (class 2606 OID 100979)
-- Name: budgets budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);


--
-- TOC entry 5370 (class 2606 OID 82616)
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- TOC entry 5532 (class 2606 OID 100837)
-- Name: character_activities character_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_activities
    ADD CONSTRAINT character_activities_pkey PRIMARY KEY (id);


--
-- TOC entry 5530 (class 2606 OID 100813)
-- Name: character_assessments character_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_assessments
    ADD CONSTRAINT character_assessments_pkey PRIMARY KEY (id);


--
-- TOC entry 5534 (class 2606 OID 100851)
-- Name: character_development_plans character_development_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_development_plans
    ADD CONSTRAINT character_development_plans_pkey PRIMARY KEY (id);


--
-- TOC entry 5465 (class 2606 OID 100057)
-- Name: character_domains character_domains_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_domains
    ADD CONSTRAINT character_domains_name_key UNIQUE (name);


--
-- TOC entry 5467 (class 2606 OID 100055)
-- Name: character_domains character_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_domains
    ADD CONSTRAINT character_domains_pkey PRIMARY KEY (id);


--
-- TOC entry 5473 (class 2606 OID 100077)
-- Name: character_traits character_traits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_traits
    ADD CONSTRAINT character_traits_pkey PRIMARY KEY (id);


--
-- TOC entry 5358 (class 2606 OID 82444)
-- Name: class_subjects class_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_subjects
    ADD CONSTRAINT class_subjects_pkey PRIMARY KEY (class_id, subject_id);


--
-- TOC entry 5344 (class 2606 OID 82384)
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);


--
-- TOC entry 5439 (class 2606 OID 99961)
-- Name: competency_domains competency_domains_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competency_domains
    ADD CONSTRAINT competency_domains_name_key UNIQUE (name);


--
-- TOC entry 5441 (class 2606 OID 99959)
-- Name: competency_domains competency_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competency_domains
    ADD CONSTRAINT competency_domains_pkey PRIMARY KEY (id);


--
-- TOC entry 5524 (class 2606 OID 100751)
-- Name: competency_evidence competency_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competency_evidence
    ADD CONSTRAINT competency_evidence_pkey PRIMARY KEY (id);


--
-- TOC entry 5449 (class 2606 OID 99985)
-- Name: competency_indicators competency_indicators_indicator_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competency_indicators
    ADD CONSTRAINT competency_indicators_indicator_code_key UNIQUE (indicator_code);


--
-- TOC entry 5451 (class 2606 OID 99983)
-- Name: competency_indicators competency_indicators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competency_indicators
    ADD CONSTRAINT competency_indicators_pkey PRIMARY KEY (id);


--
-- TOC entry 5526 (class 2606 OID 100775)
-- Name: competency_learning_activities competency_learning_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competency_learning_activities
    ADD CONSTRAINT competency_learning_activities_pkey PRIMARY KEY (id);


--
-- TOC entry 5507 (class 2606 OID 100330)
-- Name: continuous_assessment_records continuous_assessment_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.continuous_assessment_records
    ADD CONSTRAINT continuous_assessment_records_pkey PRIMARY KEY (id);


--
-- TOC entry 5410 (class 2606 OID 99807)
-- Name: core_competencies core_competencies_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_competencies
    ADD CONSTRAINT core_competencies_name_key UNIQUE (name);


--
-- TOC entry 5412 (class 2606 OID 99805)
-- Name: core_competencies core_competencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_competencies
    ADD CONSTRAINT core_competencies_pkey PRIMARY KEY (id);


--
-- TOC entry 5394 (class 2606 OID 90946)
-- Name: curricula curricula_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curricula
    ADD CONSTRAINT curricula_pkey PRIMARY KEY (id);


--
-- TOC entry 5548 (class 2606 OID 100962)
-- Name: curriculum_competencies curriculum_competencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curriculum_competencies
    ADD CONSTRAINT curriculum_competencies_pkey PRIMARY KEY (curriculum_id, competency_id);


--
-- TOC entry 5398 (class 2606 OID 90989)
-- Name: curriculum_units curriculum_units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curriculum_units
    ADD CONSTRAINT curriculum_units_pkey PRIMARY KEY (id);


--
-- TOC entry 5368 (class 2606 OID 82609)
-- Name: dashboard_statistics dashboard_statistics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_statistics
    ADD CONSTRAINT dashboard_statistics_pkey PRIMARY KEY (id);


--
-- TOC entry 5390 (class 2606 OID 90903)
-- Name: department_staff department_staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_staff
    ADD CONSTRAINT department_staff_pkey PRIMARY KEY (department_id, user_id);


--
-- TOC entry 5384 (class 2606 OID 90891)
-- Name: departments departments_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_code_key UNIQUE (code);


--
-- TOC entry 5386 (class 2606 OID 90893)
-- Name: departments departments_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key UNIQUE (name);


--
-- TOC entry 5388 (class 2606 OID 90889)
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- TOC entry 5566 (class 2606 OID 101128)
-- Name: differentiated_assessments differentiated_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.differentiated_assessments
    ADD CONSTRAINT differentiated_assessments_pkey PRIMARY KEY (id);


--
-- TOC entry 5482 (class 2606 OID 100111)
-- Name: differentiation_strategies differentiation_strategies_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.differentiation_strategies
    ADD CONSTRAINT differentiation_strategies_name_key UNIQUE (name);


--
-- TOC entry 5484 (class 2606 OID 100109)
-- Name: differentiation_strategies differentiation_strategies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.differentiation_strategies
    ADD CONSTRAINT differentiation_strategies_pkey PRIMARY KEY (id);


--
-- TOC entry 5404 (class 2606 OID 99794)
-- Name: educational_levels educational_levels_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.educational_levels
    ADD CONSTRAINT educational_levels_code_key UNIQUE (code);


--
-- TOC entry 5406 (class 2606 OID 99796)
-- Name: educational_levels educational_levels_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.educational_levels
    ADD CONSTRAINT educational_levels_name_key UNIQUE (name);


--
-- TOC entry 5408 (class 2606 OID 99792)
-- Name: educational_levels educational_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.educational_levels
    ADD CONSTRAINT educational_levels_pkey PRIMARY KEY (id);


--
-- TOC entry 5433 (class 2606 OID 99903)
-- Name: enhanced_grades enhanced_grades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enhanced_grades
    ADD CONSTRAINT enhanced_grades_pkey PRIMARY KEY (id);


--
-- TOC entry 5556 (class 2606 OID 101027)
-- Name: enhanced_sba enhanced_sba_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enhanced_sba
    ADD CONSTRAINT enhanced_sba_pkey PRIMARY KEY (id);


--
-- TOC entry 5402 (class 2606 OID 99773)
-- Name: event_role_association event_role_association_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_role_association
    ADD CONSTRAINT event_role_association_pkey PRIMARY KEY (event_id, role_id);


--
-- TOC entry 5364 (class 2606 OID 82506)
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_pkey PRIMARY KEY (id);


--
-- TOC entry 5572 (class 2606 OID 101168)
-- Name: external_exam_import_logs external_exam_import_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_exam_import_logs
    ADD CONSTRAINT external_exam_import_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 5568 (class 2606 OID 101149)
-- Name: external_exam_registrations external_exam_registrations_index_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_exam_registrations
    ADD CONSTRAINT external_exam_registrations_index_number_key UNIQUE (index_number);


--
-- TOC entry 5570 (class 2606 OID 101147)
-- Name: external_exam_registrations external_exam_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_exam_registrations
    ADD CONSTRAINT external_exam_registrations_pkey PRIMARY KEY (id);


--
-- TOC entry 5588 (class 2606 OID 101304)
-- Name: external_exam_results external_exam_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_exam_results
    ADD CONSTRAINT external_exam_results_pkey PRIMARY KEY (id);


--
-- TOC entry 5544 (class 2606 OID 100938)
-- Name: external_examinations external_examinations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_examinations
    ADD CONSTRAINT external_examinations_pkey PRIMARY KEY (id);


--
-- TOC entry 5554 (class 2606 OID 101005)
-- Name: facilities facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT facilities_pkey PRIMARY KEY (id);


--
-- TOC entry 5590 (class 2606 OID 101338)
-- Name: fee_payments fee_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_payments
    ADD CONSTRAINT fee_payments_pkey PRIMARY KEY (id);


--
-- TOC entry 5592 (class 2606 OID 101342)
-- Name: fee_payments fee_payments_receipt_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_payments
    ADD CONSTRAINT fee_payments_receipt_number_key UNIQUE (receipt_number);


--
-- TOC entry 5594 (class 2606 OID 101340)
-- Name: fee_payments fee_payments_reference_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_payments
    ADD CONSTRAINT fee_payments_reference_number_key UNIQUE (reference_number);


--
-- TOC entry 5578 (class 2606 OID 101211)
-- Name: fee_records fee_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_records
    ADD CONSTRAINT fee_records_pkey PRIMARY KEY (id);


--
-- TOC entry 5552 (class 2606 OID 100991)
-- Name: fee_structures fee_structures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_structures
    ADD CONSTRAINT fee_structures_pkey PRIMARY KEY (id);


--
-- TOC entry 5436 (class 2606 OID 99935)
-- Name: final_grades final_grades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_grades
    ADD CONSTRAINT final_grades_pkey PRIMARY KEY (id);


--
-- TOC entry 5431 (class 2606 OID 99891)
-- Name: grade_boundaries grade_boundaries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grade_boundaries
    ADD CONSTRAINT grade_boundaries_pkey PRIMARY KEY (id);


--
-- TOC entry 5366 (class 2606 OID 82530)
-- Name: grades grades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_pkey PRIMARY KEY (id);


--
-- TOC entry 5429 (class 2606 OID 99869)
-- Name: grading_schemes grading_schemes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grading_schemes
    ADD CONSTRAINT grading_schemes_pkey PRIMARY KEY (id);


--
-- TOC entry 5417 (class 2606 OID 99847)
-- Name: grading_standards grading_standards_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grading_standards
    ADD CONSTRAINT grading_standards_code_key UNIQUE (code);


--
-- TOC entry 5419 (class 2606 OID 99849)
-- Name: grading_standards grading_standards_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grading_standards
    ADD CONSTRAINT grading_standards_name_key UNIQUE (name);


--
-- TOC entry 5421 (class 2606 OID 99845)
-- Name: grading_standards grading_standards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grading_standards
    ADD CONSTRAINT grading_standards_pkey PRIMARY KEY (id);


--
-- TOC entry 5459 (class 2606 OID 100024)
-- Name: learning_approaches learning_approaches_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_approaches
    ADD CONSTRAINT learning_approaches_name_key UNIQUE (name);


--
-- TOC entry 5461 (class 2606 OID 100022)
-- Name: learning_approaches learning_approaches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_approaches
    ADD CONSTRAINT learning_approaches_pkey PRIMARY KEY (id);


--
-- TOC entry 5546 (class 2606 OID 100952)
-- Name: learning_objectives learning_objectives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_objectives
    ADD CONSTRAINT learning_objectives_pkey PRIMARY KEY (id);


--
-- TOC entry 5380 (class 2606 OID 90851)
-- Name: lessons lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);


--
-- TOC entry 5332 (class 2606 OID 82340)
-- Name: login_history login_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_pkey PRIMARY KEY (id);


--
-- TOC entry 5580 (class 2606 OID 101235)
-- Name: maintenance_requests maintenance_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_requests
    ADD CONSTRAINT maintenance_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 5362 (class 2606 OID 90749)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 5334 (class 2606 OID 82352)
-- Name: parents parents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parents
    ADD CONSTRAINT parents_pkey PRIMARY KEY (id);


--
-- TOC entry 5336 (class 2606 OID 82354)
-- Name: parents parents_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parents
    ADD CONSTRAINT parents_user_id_key UNIQUE (user_id);


--
-- TOC entry 5443 (class 2606 OID 99972)
-- Name: proficiency_levels proficiency_levels_level_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proficiency_levels
    ADD CONSTRAINT proficiency_levels_level_number_key UNIQUE (level_number);


--
-- TOC entry 5445 (class 2606 OID 99974)
-- Name: proficiency_levels proficiency_levels_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proficiency_levels
    ADD CONSTRAINT proficiency_levels_name_key UNIQUE (name);


--
-- TOC entry 5447 (class 2606 OID 99970)
-- Name: proficiency_levels proficiency_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proficiency_levels
    ADD CONSTRAINT proficiency_levels_pkey PRIMARY KEY (id);


--
-- TOC entry 5382 (class 2606 OID 90870)
-- Name: resources resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);


--
-- TOC entry 5322 (class 2606 OID 82322)
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- TOC entry 5324 (class 2606 OID 82320)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 5518 (class 2606 OID 100373)
-- Name: school_based_assessments school_based_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_based_assessments
    ADD CONSTRAINT school_based_assessments_pkey PRIMARY KEY (id);


--
-- TOC entry 5499 (class 2606 OID 100249)
-- Name: stem_assessment_results stem_assessment_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_assessment_results
    ADD CONSTRAINT stem_assessment_results_pkey PRIMARY KEY (id);


--
-- TOC entry 5496 (class 2606 OID 100230)
-- Name: stem_assessments stem_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_assessments
    ADD CONSTRAINT stem_assessments_pkey PRIMARY KEY (id);


--
-- TOC entry 5453 (class 2606 OID 100011)
-- Name: stem_domains stem_domains_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_domains
    ADD CONSTRAINT stem_domains_code_key UNIQUE (code);


--
-- TOC entry 5455 (class 2606 OID 100013)
-- Name: stem_domains stem_domains_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_domains
    ADD CONSTRAINT stem_domains_name_key UNIQUE (name);


--
-- TOC entry 5457 (class 2606 OID 100009)
-- Name: stem_domains stem_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_domains
    ADD CONSTRAINT stem_domains_pkey PRIMARY KEY (id);


--
-- TOC entry 5490 (class 2606 OID 100187)
-- Name: stem_learning_modules stem_learning_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_learning_modules
    ADD CONSTRAINT stem_learning_modules_pkey PRIMARY KEY (id);


--
-- TOC entry 5528 (class 2606 OID 100789)
-- Name: stem_project_submissions stem_project_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_project_submissions
    ADD CONSTRAINT stem_project_submissions_pkey PRIMARY KEY (id);


--
-- TOC entry 5493 (class 2606 OID 100211)
-- Name: stem_projects stem_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_projects
    ADD CONSTRAINT stem_projects_pkey PRIMARY KEY (id);


--
-- TOC entry 5505 (class 2606 OID 100287)
-- Name: stem_resource_bookings stem_resource_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_resource_bookings
    ADD CONSTRAINT stem_resource_bookings_pkey PRIMARY KEY (id);


--
-- TOC entry 5501 (class 2606 OID 100273)
-- Name: stem_resource_center stem_resource_center_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_resource_center
    ADD CONSTRAINT stem_resource_center_pkey PRIMARY KEY (id);


--
-- TOC entry 5463 (class 2606 OID 100031)
-- Name: stem_subjects stem_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_subjects
    ADD CONSTRAINT stem_subjects_pkey PRIMARY KEY (id);


--
-- TOC entry 5415 (class 2606 OID 99816)
-- Name: student_competency_assessments student_competency_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_competency_assessments
    ADD CONSTRAINT student_competency_assessments_pkey PRIMARY KEY (id);


--
-- TOC entry 5520 (class 2606 OID 100730)
-- Name: student_competency_profiles student_competency_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_competency_profiles
    ADD CONSTRAINT student_competency_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 5542 (class 2606 OID 100906)
-- Name: student_progressions student_progressions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_progressions
    ADD CONSTRAINT student_progressions_pkey PRIMARY KEY (id);


--
-- TOC entry 5346 (class 2606 OID 82398)
-- Name: students students_admission_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_admission_number_key UNIQUE (admission_number);


--
-- TOC entry 5348 (class 2606 OID 82396)
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- TOC entry 5350 (class 2606 OID 90797)
-- Name: students students_student_id_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_student_id_number_key UNIQUE (student_id_number);


--
-- TOC entry 5352 (class 2606 OID 82424)
-- Name: subjects subjects_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_code_key UNIQUE (code);


--
-- TOC entry 5354 (class 2606 OID 82422)
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- TOC entry 5376 (class 2606 OID 90806)
-- Name: teacher_attendances teacher_attendances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_attendances
    ADD CONSTRAINT teacher_attendances_pkey PRIMARY KEY (id);


--
-- TOC entry 5356 (class 2606 OID 82429)
-- Name: teacher_subjects teacher_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_subjects
    ADD CONSTRAINT teacher_subjects_pkey PRIMARY KEY (teacher_id, subject_id);


--
-- TOC entry 5338 (class 2606 OID 82370)
-- Name: teachers teachers_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_employee_id_key UNIQUE (employee_id);


--
-- TOC entry 5340 (class 2606 OID 82368)
-- Name: teachers teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_pkey PRIMARY KEY (id);


--
-- TOC entry 5342 (class 2606 OID 82372)
-- Name: teachers teachers_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_user_id_key UNIQUE (user_id);


--
-- TOC entry 5574 (class 2606 OID 101187)
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5576 (class 2606 OID 101189)
-- Name: transactions transactions_reference_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_reference_number_key UNIQUE (reference_number);


--
-- TOC entry 5522 (class 2606 OID 100732)
-- Name: student_competency_profiles unique_student_year_profile; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_competency_profiles
    ADD CONSTRAINT unique_student_year_profile UNIQUE (student_id, academic_year);


--
-- TOC entry 5374 (class 2606 OID 90782)
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- TOC entry 5326 (class 2606 OID 82331)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 5328 (class 2606 OID 82329)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5330 (class 2606 OID 82333)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 5536 (class 2606 OID 100865)
-- Name: values_education_resources values_education_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.values_education_resources
    ADD CONSTRAINT values_education_resources_pkey PRIMARY KEY (id);


--
-- TOC entry 5487 (class 1259 OID 100135)
-- Name: idx_assessment_frameworks_level_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessment_frameworks_level_subject ON public.assessment_frameworks USING btree (educational_level_id, subject_id);


--
-- TOC entry 5474 (class 1259 OID 100134)
-- Name: idx_character_traits_level_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_traits_level_domain ON public.character_traits USING btree (educational_level_id, domain_id);


--
-- TOC entry 5508 (class 1259 OID 100354)
-- Name: idx_continuous_assessment_academic_year_term; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_continuous_assessment_academic_year_term ON public.continuous_assessment_records USING btree (academic_year, term);


--
-- TOC entry 5509 (class 1259 OID 100352)
-- Name: idx_continuous_assessment_class_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_continuous_assessment_class_id ON public.continuous_assessment_records USING btree (class_id);


--
-- TOC entry 5510 (class 1259 OID 100351)
-- Name: idx_continuous_assessment_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_continuous_assessment_student_id ON public.continuous_assessment_records USING btree (student_id);


--
-- TOC entry 5511 (class 1259 OID 100353)
-- Name: idx_continuous_assessment_subject_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_continuous_assessment_subject_id ON public.continuous_assessment_records USING btree (subject_id);


--
-- TOC entry 5434 (class 1259 OID 100132)
-- Name: idx_enhanced_grades_student_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enhanced_grades_student_subject ON public.enhanced_grades USING btree (student_id, subject_id);


--
-- TOC entry 5437 (class 1259 OID 100133)
-- Name: idx_final_grades_student_term; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_final_grades_student_term ON public.final_grades USING btree (student_id, term, academic_year);


--
-- TOC entry 5512 (class 1259 OID 100403)
-- Name: idx_sba_academic_year_term; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sba_academic_year_term ON public.school_based_assessments USING btree (academic_year, term);


--
-- TOC entry 5513 (class 1259 OID 100400)
-- Name: idx_sba_class_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sba_class_id ON public.school_based_assessments USING btree (class_id);


--
-- TOC entry 5514 (class 1259 OID 100399)
-- Name: idx_sba_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sba_student_id ON public.school_based_assessments USING btree (student_id);


--
-- TOC entry 5515 (class 1259 OID 100401)
-- Name: idx_sba_subject_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sba_subject_id ON public.school_based_assessments USING btree (subject_id);


--
-- TOC entry 5516 (class 1259 OID 100402)
-- Name: idx_sba_teacher_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sba_teacher_id ON public.school_based_assessments USING btree (teacher_id);


--
-- TOC entry 5497 (class 1259 OID 100311)
-- Name: idx_stem_assessment_results_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stem_assessment_results_student ON public.stem_assessment_results USING btree (student_id, assessment_id);


--
-- TOC entry 5494 (class 1259 OID 100310)
-- Name: idx_stem_assessments_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stem_assessments_module ON public.stem_assessments USING btree (learning_module_id);


--
-- TOC entry 5488 (class 1259 OID 100308)
-- Name: idx_stem_learning_modules_subject_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stem_learning_modules_subject_level ON public.stem_learning_modules USING btree (stem_subject_id, educational_level_id);


--
-- TOC entry 5491 (class 1259 OID 100309)
-- Name: idx_stem_projects_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stem_projects_module ON public.stem_projects USING btree (learning_module_id);


--
-- TOC entry 5502 (class 1259 OID 100313)
-- Name: idx_stem_resource_bookings_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stem_resource_bookings_class ON public.stem_resource_bookings USING btree (class_id);


--
-- TOC entry 5503 (class 1259 OID 100312)
-- Name: idx_stem_resource_bookings_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stem_resource_bookings_date ON public.stem_resource_bookings USING btree (booking_date, resource_id);


--
-- TOC entry 5413 (class 1259 OID 100131)
-- Name: idx_student_competency_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_competency_student_id ON public.student_competency_assessments USING btree (student_id);


--
-- TOC entry 5731 (class 2606 OID 101072)
-- Name: activity_implementations activity_implementations_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_implementations
    ADD CONSTRAINT activity_implementations_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.character_activities(id);


--
-- TOC entry 5732 (class 2606 OID 101077)
-- Name: activity_implementations activity_implementations_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_implementations
    ADD CONSTRAINT activity_implementations_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- TOC entry 5733 (class 2606 OID 101082)
-- Name: activity_implementations activity_implementations_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_implementations
    ADD CONSTRAINT activity_implementations_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id);


--
-- TOC entry 5729 (class 2606 OID 101053)
-- Name: activity_traits activity_traits_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_traits
    ADD CONSTRAINT activity_traits_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.character_activities(id);


--
-- TOC entry 5730 (class 2606 OID 101058)
-- Name: activity_traits activity_traits_trait_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_traits
    ADD CONSTRAINT activity_traits_trait_id_fkey FOREIGN KEY (trait_id) REFERENCES public.character_traits(id);


--
-- TOC entry 5625 (class 2606 OID 90833)
-- Name: announcements announcements_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- TOC entry 5626 (class 2606 OID 90838)
-- Name: announcements announcements_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id);


--
-- TOC entry 5671 (class 2606 OID 100121)
-- Name: assessment_frameworks assessment_frameworks_educational_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_frameworks
    ADD CONSTRAINT assessment_frameworks_educational_level_id_fkey FOREIGN KEY (educational_level_id) REFERENCES public.educational_levels(id);


--
-- TOC entry 5672 (class 2606 OID 100126)
-- Name: assessment_frameworks assessment_frameworks_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_frameworks
    ADD CONSTRAINT assessment_frameworks_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- TOC entry 5734 (class 2606 OID 101096)
-- Name: assessment_rubrics assessment_rubrics_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_rubrics
    ADD CONSTRAINT assessment_rubrics_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.assessment_tasks(id);


--
-- TOC entry 5754 (class 2606 OID 101286)
-- Name: assessment_scores assessment_scores_rubric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_scores
    ADD CONSTRAINT assessment_scores_rubric_id_fkey FOREIGN KEY (rubric_id) REFERENCES public.assessment_rubrics(id);


--
-- TOC entry 5755 (class 2606 OID 101281)
-- Name: assessment_scores assessment_scores_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_scores
    ADD CONSTRAINT assessment_scores_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.assessment_submissions(id);


--
-- TOC entry 5756 (class 2606 OID 101291)
-- Name: assessment_scores assessment_scores_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_scores
    ADD CONSTRAINT assessment_scores_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id);


--
-- TOC entry 5735 (class 2606 OID 101115)
-- Name: assessment_submissions assessment_submissions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_submissions
    ADD CONSTRAINT assessment_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- TOC entry 5736 (class 2606 OID 101110)
-- Name: assessment_submissions assessment_submissions_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_submissions
    ADD CONSTRAINT assessment_submissions_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.assessment_tasks(id);


--
-- TOC entry 5712 (class 2606 OID 100880)
-- Name: assessment_tasks assessment_tasks_framework_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_tasks
    ADD CONSTRAINT assessment_tasks_framework_id_fkey FOREIGN KEY (framework_id) REFERENCES public.assessment_frameworks(id);


--
-- TOC entry 5752 (class 2606 OID 101267)
-- Name: assets assets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5753 (class 2606 OID 101262)
-- Name: assets assets_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id);


--
-- TOC entry 5639 (class 2606 OID 90966)
-- Name: assignment_submissions assignment_submissions_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;


--
-- TOC entry 5640 (class 2606 OID 90971)
-- Name: assignment_submissions assignment_submissions_graded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.users(id);


--
-- TOC entry 5641 (class 2606 OID 90976)
-- Name: assignment_submissions assignment_submissions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- TOC entry 5634 (class 2606 OID 100163)
-- Name: assignments assignments_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- TOC entry 5635 (class 2606 OID 90928)
-- Name: assignments assignments_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- TOC entry 5636 (class 2606 OID 90933)
-- Name: assignments assignments_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id);


--
-- TOC entry 5608 (class 2606 OID 100404)
-- Name: attendances attendances_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT attendances_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- TOC entry 5609 (class 2606 OID 82469)
-- Name: attendances attendances_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT attendances_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id);


--
-- TOC entry 5610 (class 2606 OID 90768)
-- Name: attendances attendances_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT attendances_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- TOC entry 5611 (class 2606 OID 82479)
-- Name: attendances attendances_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT attendances_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- TOC entry 5722 (class 2606 OID 100980)
-- Name: budgets budgets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5621 (class 2606 OID 99764)
-- Name: calendar_events calendar_events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5709 (class 2606 OID 100838)
-- Name: character_activities character_activities_educational_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_activities
    ADD CONSTRAINT character_activities_educational_level_id_fkey FOREIGN KEY (educational_level_id) REFERENCES public.educational_levels(id);


--
-- TOC entry 5706 (class 2606 OID 100814)
-- Name: character_assessments character_assessments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_assessments
    ADD CONSTRAINT character_assessments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- TOC entry 5707 (class 2606 OID 100824)
-- Name: character_assessments character_assessments_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_assessments
    ADD CONSTRAINT character_assessments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id);


--
-- TOC entry 5708 (class 2606 OID 100819)
-- Name: character_assessments character_assessments_trait_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_assessments
    ADD CONSTRAINT character_assessments_trait_id_fkey FOREIGN KEY (trait_id) REFERENCES public.character_traits(id);


--
-- TOC entry 5710 (class 2606 OID 100852)
-- Name: character_development_plans character_development_plans_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_development_plans
    ADD CONSTRAINT character_development_plans_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- TOC entry 5669 (class 2606 OID 100078)
-- Name: character_traits character_traits_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_traits
    ADD CONSTRAINT character_traits_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.character_domains(id);


--
-- TOC entry 5670 (class 2606 OID 100083)
-- Name: character_traits character_traits_educational_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_traits
    ADD CONSTRAINT character_traits_educational_level_id_fkey FOREIGN KEY (educational_level_id) REFERENCES public.educational_levels(id);


--
-- TOC entry 5606 (class 2606 OID 100168)
-- Name: class_subjects class_subjects_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_subjects
    ADD CONSTRAINT class_subjects_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- TOC entry 5607 (class 2606 OID 82450)
-- Name: class_subjects class_subjects_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_subjects
    ADD CONSTRAINT class_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- TOC entry 5598 (class 2606 OID 99832)
-- Name: classes classes_educational_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_educational_level_id_fkey FOREIGN KEY (educational_level_id) REFERENCES public.educational_levels(id);


--
-- TOC entry 5599 (class 2606 OID 82385)
-- Name: classes classes_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id);


--
-- TOC entry 5699 (class 2606 OID 100752)
-- Name: competency_evidence competency_evidence_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competency_evidence
    ADD CONSTRAINT competency_evidence_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.student_competency_assessments(id);


--
-- TOC entry 5700 (class 2606 OID 100762)
-- Name: competency_evidence competency_evidence_collected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competency_evidence
    ADD CONSTRAINT competency_evidence_collected_by_fkey FOREIGN KEY (collected_by) REFERENCES public.users(id);


--
-- TOC entry 5701 (class 2606 OID 100757)
-- Name: competency_evidence competency_evidence_indicator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competency_evidence
    ADD CONSTRAINT competency_evidence_indicator_id_fkey FOREIGN KEY (indicator_id) REFERENCES public.competency_indicators(id);


--
-- TOC entry 5663 (class 2606 OID 99986)
-- Name: competency_indicators competency_indicators_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competency_indicators
    ADD CONSTRAINT competency_indicators_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.competency_domains(id);


--
-- TOC entry 5664 (class 2606 OID 99991)
-- Name: competency_indicators competency_indicators_educational_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competency_indicators
    ADD CONSTRAINT competency_indicators_educational_level_id_fkey FOREIGN KEY (educational_level_id) REFERENCES public.educational_levels(id);


--
-- TOC entry 5665 (class 2606 OID 99996)
-- Name: competency_indicators competency_indicators_proficiency_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competency_indicators
    ADD CONSTRAINT competency_indicators_proficiency_level_id_fkey FOREIGN KEY (proficiency_level_id) REFERENCES public.proficiency_levels(id);


--
-- TOC entry 5702 (class 2606 OID 100776)
-- Name: competency_learning_activities competency_learning_activities_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competency_learning_activities
    ADD CONSTRAINT competency_learning_activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5688 (class 2606 OID 100341)
-- Name: continuous_assessment_records continuous_assessment_records_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.continuous_assessment_records
    ADD CONSTRAINT continuous_assessment_records_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- TOC entry 5689 (class 2606 OID 100331)
-- Name: continuous_assessment_records continuous_assessment_records_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.continuous_assessment_records
    ADD CONSTRAINT continuous_assessment_records_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- TOC entry 5690 (class 2606 OID 100336)
-- Name: continuous_assessment_records continuous_assessment_records_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.continuous_assessment_records
    ADD CONSTRAINT continuous_assessment_records_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- TOC entry 5691 (class 2606 OID 100346)
-- Name: continuous_assessment_records continuous_assessment_records_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.continuous_assessment_records
    ADD CONSTRAINT continuous_assessment_records_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id);


--
-- TOC entry 5637 (class 2606 OID 90947)
-- Name: curricula curricula_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curricula
    ADD CONSTRAINT curricula_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5638 (class 2606 OID 90952)
-- Name: curricula curricula_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curricula
    ADD CONSTRAINT curricula_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- TOC entry 5720 (class 2606 OID 100968)
-- Name: curriculum_competencies curriculum_competencies_competency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curriculum_competencies
    ADD CONSTRAINT curriculum_competencies_competency_id_fkey FOREIGN KEY (competency_id) REFERENCES public.core_competencies(id);


--
-- TOC entry 5721 (class 2606 OID 100963)
-- Name: curriculum_competencies curriculum_competencies_curriculum_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curriculum_competencies
    ADD CONSTRAINT curriculum_competencies_curriculum_id_fkey FOREIGN KEY (curriculum_id) REFERENCES public.curricula(id);


--
-- TOC entry 5642 (class 2606 OID 90990)
-- Name: curriculum_units curriculum_units_curriculum_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curriculum_units
    ADD CONSTRAINT curriculum_units_curriculum_id_fkey FOREIGN KEY (curriculum_id) REFERENCES public.curricula(id) ON DELETE CASCADE;


--
-- TOC entry 5632 (class 2606 OID 90904)
-- Name: department_staff department_staff_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_staff
    ADD CONSTRAINT department_staff_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- TOC entry 5633 (class 2606 OID 90909)
-- Name: department_staff department_staff_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_staff
    ADD CONSTRAINT department_staff_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5631 (class 2606 OID 90894)
-- Name: departments departments_head_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_head_id_fkey FOREIGN KEY (head_id) REFERENCES public.users(id);


--
-- TOC entry 5737 (class 2606 OID 101134)
-- Name: differentiated_assessments differentiated_assessments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.differentiated_assessments
    ADD CONSTRAINT differentiated_assessments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- TOC entry 5738 (class 2606 OID 101129)
-- Name: differentiated_assessments differentiated_assessments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.differentiated_assessments
    ADD CONSTRAINT differentiated_assessments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.assessment_tasks(id);


--
-- TOC entry 5652 (class 2606 OID 99904)
-- Name: enhanced_grades enhanced_grades_assessment_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enhanced_grades
    ADD CONSTRAINT enhanced_grades_assessment_type_id_fkey FOREIGN KEY (assessment_type_id) REFERENCES public.assessment_types(id);


--
-- TOC entry 5653 (class 2606 OID 99909)
-- Name: enhanced_grades enhanced_grades_grading_scheme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enhanced_grades
    ADD CONSTRAINT enhanced_grades_grading_scheme_id_fkey FOREIGN KEY (grading_scheme_id) REFERENCES public.grading_schemes(id);


--
-- TOC entry 5654 (class 2606 OID 99914)
-- Name: enhanced_grades enhanced_grades_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enhanced_grades
    ADD CONSTRAINT enhanced_grades_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- TOC entry 5655 (class 2606 OID 99919)
-- Name: enhanced_grades enhanced_grades_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enhanced_grades
    ADD CONSTRAINT enhanced_grades_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- TOC entry 5656 (class 2606 OID 99924)
-- Name: enhanced_grades enhanced_grades_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enhanced_grades
    ADD CONSTRAINT enhanced_grades_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id);


--
-- TOC entry 5725 (class 2606 OID 101043)
-- Name: enhanced_sba enhanced_sba_assessed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enhanced_sba
    ADD CONSTRAINT enhanced_sba_assessed_by_fkey FOREIGN KEY (assessed_by) REFERENCES public.users(id);


--
-- TOC entry 5726 (class 2606 OID 101038)
-- Name: enhanced_sba enhanced_sba_curriculum_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enhanced_sba
    ADD CONSTRAINT enhanced_sba_curriculum_id_fkey FOREIGN KEY (curriculum_id) REFERENCES public.curricula(id);


--
-- TOC entry 5727 (class 2606 OID 101028)
-- Name: enhanced_sba enhanced_sba_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enhanced_sba
    ADD CONSTRAINT enhanced_sba_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- TOC entry 5728 (class 2606 OID 101033)
-- Name: enhanced_sba enhanced_sba_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enhanced_sba
    ADD CONSTRAINT enhanced_sba_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- TOC entry 5643 (class 2606 OID 99774)
-- Name: event_role_association event_role_association_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_role_association
    ADD CONSTRAINT event_role_association_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.calendar_events(id);


--
-- TOC entry 5644 (class 2606 OID 99779)
-- Name: event_role_association event_role_association_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_role_association
    ADD CONSTRAINT event_role_association_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- TOC entry 5613 (class 2606 OID 100153)
-- Name: exams exams_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- TOC entry 5614 (class 2606 OID 82512)
-- Name: exams exams_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5615 (class 2606 OID 82517)
-- Name: exams exams_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- TOC entry 5741 (class 2606 OID 101174)
-- Name: external_exam_import_logs external_exam_import_logs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_exam_import_logs
    ADD CONSTRAINT external_exam_import_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5742 (class 2606 OID 101169)
-- Name: external_exam_import_logs external_exam_import_logs_examination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_exam_import_logs
    ADD CONSTRAINT external_exam_import_logs_examination_id_fkey FOREIGN KEY (examination_id) REFERENCES public.external_examinations(id);


--
-- TOC entry 5739 (class 2606 OID 101150)
-- Name: external_exam_registrations external_exam_registrations_examination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_exam_registrations
    ADD CONSTRAINT external_exam_registrations_examination_id_fkey FOREIGN KEY (examination_id) REFERENCES public.external_examinations(id);


--
-- TOC entry 5740 (class 2606 OID 101155)
-- Name: external_exam_registrations external_exam_registrations_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_exam_registrations
    ADD CONSTRAINT external_exam_registrations_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- TOC entry 5757 (class 2606 OID 101305)
-- Name: external_exam_results external_exam_results_examination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_exam_results
    ADD CONSTRAINT external_exam_results_examination_id_fkey FOREIGN KEY (examination_id) REFERENCES public.external_examinations(id);


--
-- TOC entry 5758 (class 2606 OID 101325)
-- Name: external_exam_results external_exam_results_internal_grade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_exam_results
    ADD CONSTRAINT external_exam_results_internal_grade_id_fkey FOREIGN KEY (internal_grade_id) REFERENCES public.enhanced_grades(id);


--
-- TOC entry 5759 (class 2606 OID 101310)
-- Name: external_exam_results external_exam_results_registration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_exam_results
    ADD CONSTRAINT external_exam_results_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.external_exam_registrations(id);


--
-- TOC entry 5760 (class 2606 OID 101315)
-- Name: external_exam_results external_exam_results_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_exam_results
    ADD CONSTRAINT external_exam_results_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- TOC entry 5761 (class 2606 OID 101320)
-- Name: external_exam_results external_exam_results_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_exam_results
    ADD CONSTRAINT external_exam_results_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- TOC entry 5718 (class 2606 OID 100939)
-- Name: external_examinations external_examinations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_examinations
    ADD CONSTRAINT external_examinations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5724 (class 2606 OID 101006)
-- Name: facilities facilities_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facilities
    ADD CONSTRAINT facilities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5762 (class 2606 OID 101343)
-- Name: fee_payments fee_payments_fee_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_payments
    ADD CONSTRAINT fee_payments_fee_record_id_fkey FOREIGN KEY (fee_record_id) REFERENCES public.fee_records(id);


--
-- TOC entry 5763 (class 2606 OID 101348)
-- Name: fee_payments fee_payments_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_payments
    ADD CONSTRAINT fee_payments_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id);


--
-- TOC entry 5746 (class 2606 OID 101222)
-- Name: fee_records fee_records_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_records
    ADD CONSTRAINT fee_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5747 (class 2606 OID 101217)
-- Name: fee_records fee_records_fee_structure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_records
    ADD CONSTRAINT fee_records_fee_structure_id_fkey FOREIGN KEY (fee_structure_id) REFERENCES public.fee_structures(id);


--
-- TOC entry 5748 (class 2606 OID 101212)
-- Name: fee_records fee_records_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_records
    ADD CONSTRAINT fee_records_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- TOC entry 5723 (class 2606 OID 100992)
-- Name: fee_structures fee_structures_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_structures
    ADD CONSTRAINT fee_structures_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5658 (class 2606 OID 99936)
-- Name: final_grades final_grades_grading_scheme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_grades
    ADD CONSTRAINT final_grades_grading_scheme_id_fkey FOREIGN KEY (grading_scheme_id) REFERENCES public.grading_schemes(id);


--
-- TOC entry 5659 (class 2606 OID 99941)
-- Name: final_grades final_grades_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_grades
    ADD CONSTRAINT final_grades_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- TOC entry 5660 (class 2606 OID 99946)
-- Name: final_grades final_grades_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_grades
    ADD CONSTRAINT final_grades_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- TOC entry 5657 (class 2606 OID 100173)
-- Name: enhanced_grades fk_enhanced_grades_class_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enhanced_grades
    ADD CONSTRAINT fk_enhanced_grades_class_id FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- TOC entry 5661 (class 2606 OID 100316)
-- Name: final_grades fk_final_grades_class_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_grades
    ADD CONSTRAINT fk_final_grades_class_id FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- TOC entry 5662 (class 2606 OID 100138)
-- Name: final_grades fk_final_grades_computed_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_grades
    ADD CONSTRAINT fk_final_grades_computed_by FOREIGN KEY (computed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5616 (class 2606 OID 100158)
-- Name: grades fk_grades_class_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT fk_grades_class_id FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- TOC entry 5617 (class 2606 OID 90812)
-- Name: grades fk_grades_subject_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT fk_grades_subject_id FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- TOC entry 5651 (class 2606 OID 99892)
-- Name: grade_boundaries grade_boundaries_grading_scheme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grade_boundaries
    ADD CONSTRAINT grade_boundaries_grading_scheme_id_fkey FOREIGN KEY (grading_scheme_id) REFERENCES public.grading_schemes(id);


--
-- TOC entry 5618 (class 2606 OID 82531)
-- Name: grades grades_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id);


--
-- TOC entry 5619 (class 2606 OID 82536)
-- Name: grades grades_graded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.users(id);


--
-- TOC entry 5620 (class 2606 OID 90773)
-- Name: grades grades_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- TOC entry 5648 (class 2606 OID 99870)
-- Name: grading_schemes grading_schemes_educational_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grading_schemes
    ADD CONSTRAINT grading_schemes_educational_level_id_fkey FOREIGN KEY (educational_level_id) REFERENCES public.educational_levels(id);


--
-- TOC entry 5649 (class 2606 OID 99875)
-- Name: grading_schemes grading_schemes_grading_standard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grading_schemes
    ADD CONSTRAINT grading_schemes_grading_standard_id_fkey FOREIGN KEY (grading_standard_id) REFERENCES public.grading_standards(id);


--
-- TOC entry 5650 (class 2606 OID 99880)
-- Name: grading_schemes grading_schemes_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grading_schemes
    ADD CONSTRAINT grading_schemes_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- TOC entry 5719 (class 2606 OID 100953)
-- Name: learning_objectives learning_objectives_curriculum_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_objectives
    ADD CONSTRAINT learning_objectives_curriculum_id_fkey FOREIGN KEY (curriculum_id) REFERENCES public.curricula(id) ON DELETE CASCADE;


--
-- TOC entry 5627 (class 2606 OID 90852)
-- Name: lessons lessons_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- TOC entry 5628 (class 2606 OID 90857)
-- Name: lessons lessons_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id);


--
-- TOC entry 5595 (class 2606 OID 82341)
-- Name: login_history login_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5749 (class 2606 OID 101246)
-- Name: maintenance_requests maintenance_requests_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_requests
    ADD CONSTRAINT maintenance_requests_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- TOC entry 5750 (class 2606 OID 101236)
-- Name: maintenance_requests maintenance_requests_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_requests
    ADD CONSTRAINT maintenance_requests_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id);


--
-- TOC entry 5751 (class 2606 OID 101241)
-- Name: maintenance_requests maintenance_requests_reported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_requests
    ADD CONSTRAINT maintenance_requests_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.users(id);


--
-- TOC entry 5612 (class 2606 OID 82493)
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5596 (class 2606 OID 82355)
-- Name: parents parents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parents
    ADD CONSTRAINT parents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5629 (class 2606 OID 90871)
-- Name: resources resources_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- TOC entry 5630 (class 2606 OID 90876)
-- Name: resources resources_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id);


--
-- TOC entry 5692 (class 2606 OID 100384)
-- Name: school_based_assessments school_based_assessments_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_based_assessments
    ADD CONSTRAINT school_based_assessments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- TOC entry 5693 (class 2606 OID 100394)
-- Name: school_based_assessments school_based_assessments_moderated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_based_assessments
    ADD CONSTRAINT school_based_assessments_moderated_by_fkey FOREIGN KEY (moderated_by) REFERENCES public.teachers(id);


--
-- TOC entry 5694 (class 2606 OID 100374)
-- Name: school_based_assessments school_based_assessments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_based_assessments
    ADD CONSTRAINT school_based_assessments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- TOC entry 5695 (class 2606 OID 100379)
-- Name: school_based_assessments school_based_assessments_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_based_assessments
    ADD CONSTRAINT school_based_assessments_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- TOC entry 5696 (class 2606 OID 100389)
-- Name: school_based_assessments school_based_assessments_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_based_assessments
    ADD CONSTRAINT school_based_assessments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id);


--
-- TOC entry 5680 (class 2606 OID 100250)
-- Name: stem_assessment_results stem_assessment_results_assessed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_assessment_results
    ADD CONSTRAINT stem_assessment_results_assessed_by_fkey FOREIGN KEY (assessed_by) REFERENCES public.users(id);


--
-- TOC entry 5681 (class 2606 OID 100255)
-- Name: stem_assessment_results stem_assessment_results_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_assessment_results
    ADD CONSTRAINT stem_assessment_results_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.stem_assessments(id);


--
-- TOC entry 5682 (class 2606 OID 100260)
-- Name: stem_assessment_results stem_assessment_results_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_assessment_results
    ADD CONSTRAINT stem_assessment_results_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- TOC entry 5678 (class 2606 OID 100231)
-- Name: stem_assessments stem_assessments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_assessments
    ADD CONSTRAINT stem_assessments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5679 (class 2606 OID 100236)
-- Name: stem_assessments stem_assessments_learning_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_assessments
    ADD CONSTRAINT stem_assessments_learning_module_id_fkey FOREIGN KEY (learning_module_id) REFERENCES public.stem_learning_modules(id);


--
-- TOC entry 5673 (class 2606 OID 100188)
-- Name: stem_learning_modules stem_learning_modules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_learning_modules
    ADD CONSTRAINT stem_learning_modules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5674 (class 2606 OID 100193)
-- Name: stem_learning_modules stem_learning_modules_educational_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_learning_modules
    ADD CONSTRAINT stem_learning_modules_educational_level_id_fkey FOREIGN KEY (educational_level_id) REFERENCES public.educational_levels(id);


--
-- TOC entry 5675 (class 2606 OID 100198)
-- Name: stem_learning_modules stem_learning_modules_stem_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_learning_modules
    ADD CONSTRAINT stem_learning_modules_stem_subject_id_fkey FOREIGN KEY (stem_subject_id) REFERENCES public.stem_subjects(id);


--
-- TOC entry 5703 (class 2606 OID 100800)
-- Name: stem_project_submissions stem_project_submissions_graded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_project_submissions
    ADD CONSTRAINT stem_project_submissions_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.users(id);


--
-- TOC entry 5704 (class 2606 OID 100790)
-- Name: stem_project_submissions stem_project_submissions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_project_submissions
    ADD CONSTRAINT stem_project_submissions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.stem_projects(id);


--
-- TOC entry 5705 (class 2606 OID 100795)
-- Name: stem_project_submissions stem_project_submissions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_project_submissions
    ADD CONSTRAINT stem_project_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- TOC entry 5676 (class 2606 OID 100212)
-- Name: stem_projects stem_projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_projects
    ADD CONSTRAINT stem_projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5677 (class 2606 OID 100217)
-- Name: stem_projects stem_projects_learning_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_projects
    ADD CONSTRAINT stem_projects_learning_module_id_fkey FOREIGN KEY (learning_module_id) REFERENCES public.stem_learning_modules(id);


--
-- TOC entry 5684 (class 2606 OID 100288)
-- Name: stem_resource_bookings stem_resource_bookings_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_resource_bookings
    ADD CONSTRAINT stem_resource_bookings_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- TOC entry 5685 (class 2606 OID 100293)
-- Name: stem_resource_bookings stem_resource_bookings_booked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_resource_bookings
    ADD CONSTRAINT stem_resource_bookings_booked_by_fkey FOREIGN KEY (booked_by) REFERENCES public.users(id);


--
-- TOC entry 5686 (class 2606 OID 100298)
-- Name: stem_resource_bookings stem_resource_bookings_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_resource_bookings
    ADD CONSTRAINT stem_resource_bookings_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;


--
-- TOC entry 5687 (class 2606 OID 100303)
-- Name: stem_resource_bookings stem_resource_bookings_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_resource_bookings
    ADD CONSTRAINT stem_resource_bookings_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.stem_resource_center(id);


--
-- TOC entry 5683 (class 2606 OID 100274)
-- Name: stem_resource_center stem_resource_center_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_resource_center
    ADD CONSTRAINT stem_resource_center_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5666 (class 2606 OID 100032)
-- Name: stem_subjects stem_subjects_educational_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_subjects
    ADD CONSTRAINT stem_subjects_educational_level_id_fkey FOREIGN KEY (educational_level_id) REFERENCES public.educational_levels(id);


--
-- TOC entry 5667 (class 2606 OID 100037)
-- Name: stem_subjects stem_subjects_stem_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_subjects
    ADD CONSTRAINT stem_subjects_stem_domain_id_fkey FOREIGN KEY (stem_domain_id) REFERENCES public.stem_domains(id);


--
-- TOC entry 5668 (class 2606 OID 100042)
-- Name: stem_subjects stem_subjects_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stem_subjects
    ADD CONSTRAINT stem_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- TOC entry 5645 (class 2606 OID 99817)
-- Name: student_competency_assessments student_competency_assessments_competency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_competency_assessments
    ADD CONSTRAINT student_competency_assessments_competency_id_fkey FOREIGN KEY (competency_id) REFERENCES public.core_competencies(id);


--
-- TOC entry 5646 (class 2606 OID 99822)
-- Name: student_competency_assessments student_competency_assessments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_competency_assessments
    ADD CONSTRAINT student_competency_assessments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- TOC entry 5647 (class 2606 OID 99827)
-- Name: student_competency_assessments student_competency_assessments_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_competency_assessments
    ADD CONSTRAINT student_competency_assessments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id);


--
-- TOC entry 5697 (class 2606 OID 100733)
-- Name: student_competency_profiles student_competency_profiles_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_competency_profiles
    ADD CONSTRAINT student_competency_profiles_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- TOC entry 5698 (class 2606 OID 100738)
-- Name: student_competency_profiles student_competency_profiles_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_competency_profiles
    ADD CONSTRAINT student_competency_profiles_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- TOC entry 5713 (class 2606 OID 100927)
-- Name: student_progressions student_progressions_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_progressions
    ADD CONSTRAINT student_progressions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- TOC entry 5714 (class 2606 OID 100912)
-- Name: student_progressions student_progressions_current_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_progressions
    ADD CONSTRAINT student_progressions_current_level_id_fkey FOREIGN KEY (current_level_id) REFERENCES public.educational_levels(id);


--
-- TOC entry 5715 (class 2606 OID 100917)
-- Name: student_progressions student_progressions_next_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_progressions
    ADD CONSTRAINT student_progressions_next_level_id_fkey FOREIGN KEY (next_level_id) REFERENCES public.educational_levels(id);


--
-- TOC entry 5716 (class 2606 OID 100922)
-- Name: student_progressions student_progressions_recommended_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_progressions
    ADD CONSTRAINT student_progressions_recommended_by_fkey FOREIGN KEY (recommended_by) REFERENCES public.users(id);


--
-- TOC entry 5717 (class 2606 OID 100907)
-- Name: student_progressions student_progressions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_progressions
    ADD CONSTRAINT student_progressions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- TOC entry 5600 (class 2606 OID 100143)
-- Name: students students_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;


--
-- TOC entry 5601 (class 2606 OID 82404)
-- Name: students students_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.parents(id);


--
-- TOC entry 5602 (class 2606 OID 82409)
-- Name: students students_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5603 (class 2606 OID 91002)
-- Name: subjects subjects_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- TOC entry 5624 (class 2606 OID 90807)
-- Name: teacher_attendances teacher_attendances_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_attendances
    ADD CONSTRAINT teacher_attendances_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;


--
-- TOC entry 5604 (class 2606 OID 82430)
-- Name: teacher_subjects teacher_subjects_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_subjects
    ADD CONSTRAINT teacher_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- TOC entry 5605 (class 2606 OID 82435)
-- Name: teacher_subjects teacher_subjects_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_subjects
    ADD CONSTRAINT teacher_subjects_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id);


--
-- TOC entry 5597 (class 2606 OID 82373)
-- Name: teachers teachers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5743 (class 2606 OID 101200)
-- Name: transactions transactions_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- TOC entry 5744 (class 2606 OID 101190)
-- Name: transactions transactions_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.budgets(id);


--
-- TOC entry 5745 (class 2606 OID 101195)
-- Name: transactions transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5622 (class 2606 OID 90783)
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- TOC entry 5623 (class 2606 OID 90788)
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5711 (class 2606 OID 100866)
-- Name: values_education_resources values_education_resources_educational_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.values_education_resources
    ADD CONSTRAINT values_education_resources_educational_level_id_fkey FOREIGN KEY (educational_level_id) REFERENCES public.educational_levels(id);


-- Completed on 2025-08-30 16:35:07

--
-- PostgreSQL database dump complete
--

