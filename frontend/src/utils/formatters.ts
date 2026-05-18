/**
 * Utility to defensively extract and format a grade level string from any student or class entity.
 * Handles:
 * 1. Nested grade_level objects (e.g., student.grade_level.name or student.grade_level.code)
 * 2. Flat string properties (e.g., student.grade_level_name, student.grade_level, student.grade)
 * 3. CamelCase property variants (e.g., student.gradeLevel)
 * 4. Nested grade_level_name/gradeLevelName property variants
 */
export const getNormalizedGradeLevel = (dataEntity: any): string => {
  if (!dataEntity) return "Unassigned";

  // 1. Check if grade_level is a nested object
  if (dataEntity.grade_level && typeof dataEntity.grade_level === 'object') {
    return dataEntity.grade_level.name || dataEntity.grade_level.code || "Unassigned";
  }

  // 2. Check if gradeLevel is a nested object (camelCase variant)
  if (dataEntity.gradeLevel && typeof dataEntity.gradeLevel === 'object') {
    return dataEntity.gradeLevel.name || dataEntity.gradeLevel.code || "Unassigned";
  }

  // 3. Fall back to direct properties
  if (typeof dataEntity.grade_level_name === 'string' && dataEntity.grade_level_name) {
    return dataEntity.grade_level_name;
  }
  if (typeof dataEntity.gradeLevelName === 'string' && dataEntity.gradeLevelName) {
    return dataEntity.gradeLevelName;
  }
  if (typeof dataEntity.grade_level === 'string' && dataEntity.grade_level) {
    return dataEntity.grade_level;
  }
  if (typeof dataEntity.gradeLevel === 'string' && dataEntity.gradeLevel) {
    return dataEntity.gradeLevel;
  }
  if (typeof dataEntity.grade === 'string' && dataEntity.grade) {
    return dataEntity.grade;
  }
  if (typeof dataEntity.class_name === 'string' && dataEntity.class_name) {
    return dataEntity.class_name;
  }
  if (typeof dataEntity.className === 'string' && dataEntity.className) {
    return dataEntity.className;
  }

  // 4. Check if the entity itself is a grade level object
  if (typeof dataEntity.name === 'string' && dataEntity.name) {
    return dataEntity.name;
  }
  if (typeof dataEntity.level_name === 'string' && dataEntity.level_name) {
    return dataEntity.level_name;
  }

  return "Unassigned";
};
