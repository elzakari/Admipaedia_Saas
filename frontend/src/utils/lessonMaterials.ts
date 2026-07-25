export type LessonMaterialEntry = {
  type: string
  value?: any
  [key: string]: any
}

export function getLessonMaterialEntry(materials: LessonMaterialEntry[] | undefined, type: string): LessonMaterialEntry | undefined {
  if (!Array.isArray(materials)) return undefined
  return materials.find((item) => item?.type === type)
}

export function getLessonMaterialValue<T = string>(materials: LessonMaterialEntry[] | undefined, type: string, fallback: T): T {
  const entry = getLessonMaterialEntry(materials, type)
  return (entry?.value ?? fallback) as T
}

export function buildLessonMaterials(input: {
  subjectId?: number
  subjectName?: string
  objectives?: string
  classwork?: string
  homework?: string
  notes?: string
  resources?: string[]
}): LessonMaterialEntry[] {
  const materials: LessonMaterialEntry[] = []

  if (input.subjectId || input.subjectName) {
    materials.push({
      type: 'subject',
      subject_id: input.subjectId ?? null,
      subject_name: input.subjectName || 'General',
      value: input.subjectName || 'General',
    })
  }

  if (input.objectives?.trim()) {
    materials.push({ type: 'objectives', value: input.objectives.trim() })
  }
  if (input.classwork?.trim()) {
    materials.push({ type: 'classwork', value: input.classwork.trim() })
  }
  if (input.homework?.trim()) {
    materials.push({ type: 'homework', value: input.homework.trim() })
  }
  if (input.notes?.trim()) {
    materials.push({ type: 'notes', value: input.notes.trim() })
  }
  if (Array.isArray(input.resources) && input.resources.length > 0) {
    materials.push({
      type: 'resources',
      value: input.resources.filter((item) => Boolean(item?.trim())).map((item) => item.trim()),
    })
  }

  return materials
}
