import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { AppError } from '../types';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined
    }));

    next(new AppError(`Validation failed: ${formattedErrors.map(e => e.message).join(', ')}`, 400));
    return;
  }
  
  next();
};

/**
 * Helper function to run validation chains
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));
    
    // Check for errors
    handleValidationErrors(req, res, next);
  };
};

/**
 * Sanitize request body by removing undefined and null values
 */
export const sanitizeBody = (req: Request, res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (req.body[key] === undefined || req.body[key] === null || req.body[key] === '') {
        delete req.body[key];
      }
    });
  }
  next();
};

/**
 * Middleware to validate pagination parameters
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction): void => {
  const page = parseInt(req.query.page as string, 10);
  const limit = parseInt(req.query.limit as string, 10);

  // Set defaults if not provided
  req.query.page = (!isNaN(page) && page > 0 ? page : 1).toString();
  req.query.limit = (!isNaN(limit) && limit > 0 && limit <= 100 ? limit : 10).toString();

  next();
};

/**
 * Middleware to validate UUID parameters
 */
export const validateUUID = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const uuid = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuid || !uuidRegex.test(uuid)) {
      next(new AppError(`Invalid ${paramName} format`, 400));
      return;
    }
    
    next();
  };
};

/**
 * Middleware to validate date parameters
 */
export const validateDate = (paramName: string, isOptional: boolean = false) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const dateValue = req.query[paramName] as string || req.body[paramName];
    
    if (!dateValue) {
      if (!isOptional) {
        next(new AppError(`${paramName} is required`, 400));
        return;
      }
      next();
      return;
    }
    
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      next(new AppError(`Invalid ${paramName} format. Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)`, 400));
      return;
    }
    
    next();
  };
};

/**
 * Middleware to validate file upload
 */
export const validateFileUpload = (allowedMimeTypes: string[], maxFileSize: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.file) {
      next(new AppError('File is required', 400));
      return;
    }

    // Check file size
    if (req.file.size > maxFileSize) {
      next(new AppError(`File size exceeds maximum allowed size of ${maxFileSize / (1024 * 1024)}MB`, 400));
      return;
    }

    // Check MIME type
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      next(new AppError(`File type not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`, 400));
      return;
    }

    next();
  };
};

/**
 * Middleware to validate phone number format (Tanzania)
 */
export const validateTanzanianPhone = (req: Request, res: Response, next: NextFunction): void => {
  const phoneNumber = req.body.phoneNumber;
  
  if (!phoneNumber) {
    next();
    return;
  }
  
  // Tanzania phone number format: +255XXXXXXXXX or 0XXXXXXXXX
  const phoneRegex = /^(\+255|0)[67]\d{8}$/;
  
  if (!phoneRegex.test(phoneNumber)) {
    next(new AppError('Invalid phone number format. Use +255XXXXXXXXX or 0XXXXXXXXX', 400));
    return;
  }
  
  next();
};

/**
 * Middleware to validate NHIF number format
 */
export const validateNHIF = (req: Request, res: Response, next: NextFunction): void => {
  const nhifNumber = req.body.nhifNumber;
  
  if (!nhifNumber) {
    next();
    return;
  }
  
  // NHIF number format: NHXXXXXXXXX (NH followed by 9 digits)
  const nhifRegex = /^NH\d{9}$/;
  
  if (!nhifRegex.test(nhifNumber)) {
    next(new AppError('Invalid NHIF number format. Use NHXXXXXXXXX (NH followed by 9 digits)', 400));
    return;
  }
  
  next();
};

/**
 * Middleware to validate age based on date of birth
 */
export const validateAge = (minAge: number = 0, maxAge: number = 150) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const dateOfBirth = req.body.dateOfBirth;
    
    if (!dateOfBirth) {
      next();
      return;
    }
    
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
      ? age - 1 
      : age;
    
    if (actualAge < minAge || actualAge > maxAge) {
      next(new AppError(`Age must be between ${minAge} and ${maxAge} years`, 400));
      return;
    }
    
    next();
  };
};

/**
 * Middleware to validate gender values
 */
export const validateGender = (req: Request, res: Response, next: NextFunction): void => {
  const gender = req.body.gender;
  
  if (!gender) {
    next();
    return;
  }
  
  const validGenders = ['male', 'female', 'other'];
  
  if (!validGenders.includes(gender.toLowerCase())) {
    next(new AppError(`Invalid gender. Must be one of: ${validGenders.join(', ')}`, 400));
    return;
  }
  
  // Normalize gender to lowercase
  req.body.gender = gender.toLowerCase();
  next();
};

/**
 * Middleware to validate enum values
 */
export const validateEnum = (field: string, enumObject: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.body[field];
    
    if (!value) {
      next();
      return;
    }
    
    const validValues = Object.values(enumObject);
    
    if (!validValues.includes(value)) {
      next(new AppError(`Invalid ${field}. Must be one of: ${validValues.join(', ')}`, 400));
      return;
    }
    
    next();
  };
};

/**
 * Middleware to validate password strength
 */
export const validatePasswordStrength = (req: Request, res: Response, next: NextFunction): void => {
  const password = req.body.password;
  
  if (!password) {
    next();
    return;
  }
  
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const errors: string[] = [];
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }
  
  if (errors.length > 0) {
    next(new AppError(`Password validation failed: ${errors.join(', ')}`, 400));
    return;
  }
  
  next();
};

/**
 * Middleware to validate email format
 */
export const validateEmailFormat = (req: Request, res: Response, next: NextFunction): void => {
  const email = req.body.email;
  
  if (!email) {
    next();
    return;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    next(new AppError('Invalid email format', 400));
    return;
  }
  
  // Normalize email to lowercase
  req.body.email = email.toLowerCase();
  next();
};
