// /lib/dateFormatter.ts

/**
 * Formats a date string or Date object into a readable date in IST.
 * Example output: "June 24, 2025"
 * @param dateInput - The date string (e.g., from your database) or a Date object.
 * @returns The formatted date string in IST.
 */
export const formatDateIST = (dateInput: string | Date | undefined): string => {
  if (!dateInput) return 'N/A';

  try {
    // THE FIX IS HERE: We must define the 'date' variable
    const date = new Date(dateInput);
    
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Kolkata', // Force Indian Standard Time
    };
    return new Intl.DateTimeFormat('en-IN', options).format(date);
  } catch (error) {
    console.error('Failed to format date:', dateInput, error);
    return 'Invalid Date';
  }
};

/**
 * Formats a date string or Date object into a readable time in IST.
 * Example output: "4:11 PM"
 * @param dateInput - The date string (e.g., from your database) or a Date object.
 * @returns The formatted time string in IST.
 */
export const formatTimeIST = (dateInput: string | Date | undefined): string => {
  if (!dateInput) return 'N/A';

  try {
    // THE FIX IS HERE: We must define the 'date' variable for this function too
    const date = new Date(dateInput);

    const options: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata', // Force Indian Standard Time
    };
    return new Intl.DateTimeFormat('en-IN', options).format(date);
  } catch (error) {
    console.error('Failed to format time:', dateInput, error);
    return 'Invalid Time';
  }
};