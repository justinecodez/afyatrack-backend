import { Router } from 'express';
import { body, query } from 'express-validator';
import { PatientService } from '../services/patient.service';
import { authenticate, authorize, authorizePatientAccess } from '../middleware/auth';
import { 
  validate, 
  validateUUID, 
  validatePagination, 
  validateTanzanianPhone, 
  validateNHIF, 
  validateAge, 
  validateGender,
  validateEmailFormat
} from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { UserRole } from '../types';

const router = Router();
const patientService = new PatientService();

/**
 * @route   POST /api/v1/patients
 * @desc    Create a new patient
 * @access  Private (Doctor, Nurse, Admin)
 */
router.post('/',
  authenticate,
  authorize(UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN),
  validate([
    body('firstName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters'),
    body('lastName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters'),
    body('dateOfBirth')
      .isISO8601()
      .withMessage('Date of birth must be a valid date (YYYY-MM-DD)'),
    body('gender')
      .isIn(['male', 'female', 'other'])
      .withMessage('Gender must be male, female, or other'),
    body('phoneNumber')
      .optional()
      .isMobilePhone('any')
      .withMessage('Invalid phone number format'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email format'),
    body('address')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Address must not exceed 200 characters'),
    body('nhifNumber')
      .optional()
      .matches(/^NH\d{9}$/)
      .withMessage('NHIF number must be in format NHXXXXXXXXX'),
    body('emergencyContact.name')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('Emergency contact name must be between 2 and 50 characters'),
    body('emergencyContact.phone')
      .optional()
      .isMobilePhone('any')
      .withMessage('Invalid emergency contact phone number'),
    body('emergencyContact.relationship')
      .optional()
      .isLength({ min: 2, max: 30 })
      .withMessage('Emergency contact relationship must be between 2 and 30 characters')
  ]),
  validateEmailFormat,
  validateTanzanianPhone,
  validateNHIF,
  validateAge(0, 150),
  validateGender,
  asyncHandler(async (req, res) => {
    const patient = await patientService.createPatient(req.body, req.user!.id);
    
    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      data: patient
    });
  })
);

/**
 * @route   GET /api/v1/patients
 * @desc    Get patients with pagination and filtering
 * @access  Private (Doctor, Nurse, Admin)
 */
router.get('/',
  authenticate,
  authorize(UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN),
  validatePagination,
  validate([
    query('search')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search term must be between 1 and 100 characters'),
    query('gender')
      .optional()
      .isIn(['male', 'female', 'other'])
      .withMessage('Gender filter must be male, female, or other'),
    query('minAge')
      .optional()
      .isInt({ min: 0, max: 150 })
      .withMessage('Minimum age must be between 0 and 150'),
    query('maxAge')
      .optional()
      .isInt({ min: 0, max: 150 })
      .withMessage('Maximum age must be between 0 and 150')
  ]),
  asyncHandler(async (req, res) => {
    const result = await patientService.getPatients(req.query, req.user!.id, req.user!.role);
    
    res.json({
      success: true,
      message: 'Patients retrieved successfully',
      data: result.data,
      pagination: result.pagination
    });
  })
);

/**
 * @route   GET /api/v1/patients/stats
 * @desc    Get patient statistics
 * @access  Private (Doctor, Nurse, Admin)
 */
router.get('/stats',
  authenticate,
  authorize(UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const stats = await patientService.getPatientStats(req.user!.id, req.user!.role);
    
    res.json({
      success: true,
      message: 'Patient statistics retrieved successfully',
      data: stats
    });
  })
);

/**
 * @route   GET /api/v1/patients/:patientId
 * @desc    Get patient by ID
 * @access  Private (Doctor, Nurse, Admin)
 */
router.get('/:patientId',
  authenticate,
  authorize(UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN),
  validateUUID('patientId'),
  authorizePatientAccess,
  asyncHandler(async (req, res) => {
    const patientId = req.params.patientId;
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
    }
    const patient = await patientService.getPatientById(patientId);
    
    return res.json({
      success: true,
      message: 'Patient retrieved successfully',
      data: patient
    });
  })
);

/**
 * @route   PUT /api/v1/patients/:patientId
 * @desc    Update patient information
 * @access  Private (Doctor, Nurse, Admin)
 */
router.put('/:patientId',
  authenticate,
  authorize(UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN),
  validateUUID('patientId'),
  authorizePatientAccess,
  validate([
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters'),
    body('dateOfBirth')
      .optional()
      .isISO8601()
      .withMessage('Date of birth must be a valid date (YYYY-MM-DD)'),
    body('gender')
      .optional()
      .isIn(['male', 'female', 'other'])
      .withMessage('Gender must be male, female, or other'),
    body('phoneNumber')
      .optional()
      .isMobilePhone('any')
      .withMessage('Invalid phone number format'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email format'),
    body('address')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Address must not exceed 200 characters'),
    body('nhifNumber')
      .optional()
      .matches(/^NH\d{9}$/)
      .withMessage('NHIF number must be in format NHXXXXXXXXX'),
    body('emergencyContact.name')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('Emergency contact name must be between 2 and 50 characters'),
    body('emergencyContact.phone')
      .optional()
      .isMobilePhone('any')
      .withMessage('Invalid emergency contact phone number'),
    body('emergencyContact.relationship')
      .optional()
      .isLength({ min: 2, max: 30 })
      .withMessage('Emergency contact relationship must be between 2 and 30 characters')
  ]),
  validateEmailFormat,
  validateTanzanianPhone,
  validateNHIF,
  validateAge(0, 150),
  validateGender,
  asyncHandler(async (req, res) => {
    const patientId = req.params.patientId;
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
    }
    const patient = await patientService.updatePatient(patientId, req.body);
    
    return res.json({
      success: true,
      message: 'Patient updated successfully',
      data: patient
    });
  })
);

/**
 * @route   DELETE /api/v1/patients/:patientId
 * @desc    Delete patient
 * @access  Private (Admin only)
 */
router.delete('/:patientId',
  authenticate,
  authorize(UserRole.ADMIN),
  validateUUID('patientId'),
  asyncHandler(async (req, res) => {
    const patientId = req.params.patientId;
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
    }
    await patientService.deletePatient(patientId);
    
    return res.json({
      success: true,
      message: 'Patient deleted successfully'
    });
  })
);

export default router;
