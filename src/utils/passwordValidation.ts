export interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

export const passwordRequirements: PasswordRequirement[] = [
  {
    label: 'At least 8 characters',
    test: (password) => password.length >= 8,
  },
  {
    label: 'One uppercase letter',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    label: 'One lowercase letter',
    test: (password) => /[a-z]/.test(password),
  },
  {
    label: 'One number',
    test: (password) => /\d/.test(password),
  },
  {
    label: 'One special character (!@#$%^&*)',
    test: (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
  },
];

export function validatePassword(password: string): {
  isValid: boolean;
  failedRequirements: string[];
} {
  const failedRequirements: string[] = [];
  
  passwordRequirements.forEach((req) => {
    if (!req.test(password)) {
      failedRequirements.push(req.label);
    }
  });
  
  return {
    isValid: failedRequirements.length === 0,
    failedRequirements,
  };
}

export function getPasswordStrength(password: string): {
  strength: 'weak' | 'medium' | 'strong';
  percentage: number;
  color: string;
} {
  const metRequirements = passwordRequirements.filter((req) => req.test(password)).length;
  const percentage = (metRequirements / passwordRequirements.length) * 100;
  
  if (percentage < 40) {
    return { strength: 'weak', percentage, color: 'text-red-500' };
  } else if (percentage < 80) {
    return { strength: 'medium', percentage, color: 'text-yellow-500' };
  } else {
    return { strength: 'strong', percentage, color: 'text-green-500' };
  }
}