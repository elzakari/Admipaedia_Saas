/**
 * Safely format a date string to localized format
 * @param dateString The date string to format
 * @param fallback The fallback text to display if date is invalid
 * @returns Formatted date string or fallback text
 */
export const formatDate = (dateString?: string, fallback: string = 'No date provided'): string => {
  if (!dateString) return fallback;
  
  try {
    const date = new Date(dateString);
    // Check if date is valid
    return date instanceof Date && !isNaN(date.getTime()) 
      ? date.toLocaleDateString() 
      : fallback;
  } catch (error) {
    return fallback;
  }
};