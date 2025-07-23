// A helper function to format dates for `<input type="date">`
export function formatDateForInput(date: Date): string {
    if (!date || isNaN(date.getTime())) {
      // Return a default or empty string if the date is invalid
      return '';
    }
    // The toISOString() format is 'YYYY-MM-DDTHH:mm:ss.sssZ'
    // We just need the 'YYYY-MM-DD' part.
    return date.toISOString().split('T')[0];
  }