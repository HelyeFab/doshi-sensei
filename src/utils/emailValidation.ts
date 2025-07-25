export async function checkEmailAvailability(email: string): Promise<{
  isAvailable: boolean;
  error?: string;
}> {
  // Basic email validation only - no server-side checking to prevent enumeration
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isAvailable: false, error: 'Invalid email format' };
  }

  // Always return true for valid email format to prevent enumeration
  // The actual availability check will happen during registration
  return { isAvailable: true };
}

// Debounce function to avoid too many API calls
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}