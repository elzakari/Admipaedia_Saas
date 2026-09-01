export function resolveAvatarUrl(value?: string | null): string | undefined {
  if (!value) return undefined;

  const trimmed = String(value).trim();
  if (!trimmed) return undefined;

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/api/') ||
    trimmed.startsWith('/_storage/') ||
    trimmed.startsWith('/uploads/')
  ) {
    return trimmed;
  }

  const normalized = trimmed.replace(/\\/g, '/').replace(/^\/+/, '');

  if (normalized.startsWith('uploads/profile_pictures/')) {
    const filename = normalized.split('uploads/profile_pictures/', 2)[1];
    return `/api/v1/enhanced-students/profile-picture/${filename}`;
  }

  if (normalized.startsWith('profile_pictures/')) {
    const filename = normalized.split('profile_pictures/', 2)[1];
    return `/api/v1/enhanced-students/profile-picture/${filename}`;
  }

  if (normalized.startsWith('uploads/avatars/')) {
    const filename = normalized.split('uploads/avatars/', 2)[1];
    return `/api/v1/profile/avatar/${filename}`;
  }

  if (normalized.startsWith('avatars/')) {
    const filename = normalized.split('avatars/', 2)[1];
    return `/api/v1/profile/avatar/${filename}`;
  }

  if (/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(normalized)) {
    return normalized;
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
