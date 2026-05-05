
/**
 * Date Utility Functions
 */

/**
 * Formats an ISO date string or Date object to DD/MM/YYYY
 */
export function formatDate(dateInput: string | Date | undefined): string {
  if (!dateInput) return 'Unknown';
  
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  if (isNaN(date.getTime())) return 'Invalid Date';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
