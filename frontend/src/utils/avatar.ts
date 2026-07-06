export function resolveAvatarUrl(value?: string | null): string | undefined {
  if (!value) return undefined;

  const trimmed = String(value).trim();
  if (!trimmed) return undefined;

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/api/') ||
    trimmed.startsWith('/uploads/')
  ) {
    return trimmed;
  }

  const normalized = trimmed.replace(/\\/g, '/');
  if (normalized.startsWith('uploads/profile_pictures/')) {
    const filename = normalized.split('uploads/profile_pictures/', 2)[1];
    return `/api/v1/enhanced-students/profile-picture/${filename}`;
  }

  return normalized;
}

export function resolveStudentAvatar(student: any): string | undefined {
  return resolveAvatarUrl(
    student?.profile_picture_url ??
      student?.profile_picture ??
      student?.profile_image ??
      student?.profileImage ??
      student?.photo ??
      student?.avatar_url
  );
}
