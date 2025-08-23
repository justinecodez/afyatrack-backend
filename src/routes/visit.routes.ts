import { Router } from 'express';
import { body, query } from 'express-validator';
import { VisitService } from '../services/visit.service';
import { authenticate, authorize, authorizeVisitAccess } from '../middleware/auth';
import { 
  validate, 
  validateUUID, 
  validatePagination, 
  validateDate,
  validateEnum
} from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { UserRole, VisitType, VisitStatus } from '../types';

const router = Router();
const visitService = new VisitService();

/**
 * @route   POST /api/v1/visits
 * @desc    Create a new visit
 * @access  Private (Doctor, Nurse, Admin)
 */
router.post('/',
  authenticate,
  authorize(UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN),
  validate([
    body('patientId')
      .isUUID()
      .withMessage('Valid patient ID is required'),
    body('visitType')
      .isIn(Object.values(VisitType))
      .withMessage(`Visit type must be one of: ${Object.values(VisitType).join(', ')}`),
    body('chiefComplaint')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Chief complaint must not exceed 500 characters'),
    body('visitDate')
      .optional()
      .isISO8601()
      .withMessage('Visit date must be a valid ISO 8601 date')
  ]),
  validateEnum('visitType', VisitType),
  asyncHandler(async (req, res) => {
    const visit = await visitService.createVisit(req.body, req.user!.id);
    
    res.status(201).json({
      success: true,
      message: 'Visit created successfully',
      data: visit
    });
  })
);

/**
 * @route   GET /api/v1/visits
 * @desc    Get visits with pagination and filtering
 * @access  Private (Doctor, Nurse, Admin)
 */
router.get('/',
  authenticate,
  authorize(UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN),
  validatePagination,
  validate([
    query('patientId')
      .optional()
      .isUUID()
      .withMessage('Patient ID must be a valid UUID'),
    query('doctorId')
      .optional()
      .isUUID()
      .withMessage('Doctor ID must be a valid UUID'),
    query('visitType')
      .optional()
      .isIn(Object.values(VisitType))
      .withMessage(`Visit type must be one of: ${Object.values(VisitType).join(', ')}`),
    query('status')
      .optional()
      .isIn(Object.values(VisitStatus))
      .withMessage(`Status must be one of: ${Object.values(VisitStatus).join(', ')}`),
    query('fromDate')
      .optional()
      .isISO8601()
      .withMessage('From date must be a valid ISO 8601 date'),
    query('toDate')
      .optional()
      .isISO8601()
      .withMessage('To date must be a valid ISO 8601 date')
  ]),
  validateDate('fromDate', true),
  validateDate('toDate', true),
  asyncHandler(async (req, res) => {
    const result = await visitService.getVisits(req.query, req.user!.id, req.user!.role);
    
    res.json({
      success: true,
      message: 'Visits retrieved successfully',
      data: result.data,
      pagination: result.pagination
    });
  })
);

/**
 * @route   GET /api/v1/visits/stats
 * @desc    Get visit statistics
 * @access  Private (Doctor, Nurse, Admin)
 */
router.get('/stats',
  authenticate,
  authorize(UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const stats = await visitService.getVisitStats(req.user!.id, req.user!.role);
    
    res.json({
      success: true,
      message: 'Visit statistics retrieved successfully',
      data: stats
    });
  })
);

/**
 * @route   GET /api/v1/visits/patient/:patientId
 * @desc    Get patient visit history
 * @access  Private (Doctor, Nurse, Admin)
 */
router.get('/patient/:patientId',
  authenticate,
  authorize(UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN),
  validateUUID('patientId'),
  asyncHandler(async (req, res) => {
    const patientId = req.params.patientId;
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
    }
    const visits = await visitService.getPatientVisitHistory(patientId);
    
    return res.json({
      success: true,
      message: 'Patient visit history retrieved successfully',
      data: visits
    });
  })
);

/**
 * @route   GET /api/v1/visits/:visitId
 * @desc    Get visit by ID
 * @access  Private (Doctor, Nurse, Admin)
 */
router.get('/:visitId',
  authenticate,
  authorize(UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN),
  validateUUID('visitId'),
  authorizeVisitAccess,
  asyncHandler(async (req, res) => {
    const visitId = req.params.visitId;
    if (!visitId) {
      return res.status(400).json({
        success: false,
        message: 'Visit ID is required'
      });
    }
    const visit = await visitService.getVisitById(visitId);
    
    return res.json({
      success: true,
      message: 'Visit retrieved successfully',
      data: visit
    });
  })
);

/**
 * @route   PUT /api/v1/visits/:visitId
 * @desc    Update visit information
 * @access  Private (Doctor, Nurse, Admin)
 */
router.put('/:visitId',
  authenticate,
  authorize(UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN),
  validateUUID('visitId'),
  authorizeVisitAccess,
  validate([
    body('chiefComplaint')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Chief complaint must not exceed 500 characters'),
    body('transcript')
      .optional()
      .isLength({ max: 10000 })
      .withMessage('Transcript must not exceed 10,000 characters'),
    body('soapNotes.subjective')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Subjective notes must not exceed 2,000 characters'),
    body('soapNotes.objective')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Objective notes must not exceed 2,000 characters'),
    body('soapNotes.assessment')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Assessment notes must not exceed 2,000 characters'),
    body('soapNotes.plan')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Plan notes must not exceed 2,000 characters'),
    body('status')
      .optional()
      .isIn(Object.values(VisitStatus))
      .withMessage(`Status must be one of: ${Object.values(VisitStatus).join(', ')}`),
    body('duration')
      .optional()
      .isInt({ min: 1, max: 480 })
      .withMessage('Duration must be between 1 and 480 minutes'),
    body('followUpDate')
      .optional()
      .isISO8601()
      .withMessage('Follow-up date must be a valid ISO 8601 date')
  ]),
  validateEnum('status', VisitStatus),
  validateDate('followUpDate', true),
  asyncHandler(async (req, res) => {
    const visitId = req.params.visitId;
    if (!visitId) {
      return res.status(400).json({
        success: false,
        message: 'Visit ID is required'
      });
    }
    const visit = await visitService.updateVisit(visitId, req.body);
    
    return res.json({
      success: true,
      message: 'Visit updated successfully',
      data: visit
    });
  })
);

/**
 * @route   DELETE /api/v1/visits/:visitId
 * @desc    Delete visit
 * @access  Private (Admin only)
 */
router.delete('/:visitId',
  authenticate,
  authorize(UserRole.ADMIN),
  validateUUID('visitId'),
  asyncHandler(async (req, res) => {
    const visitId = req.params.visitId;
    if (!visitId) {
      return res.status(400).json({
        success: false,
        message: 'Visit ID is required'
      });
    }
    await visitService.deleteVisit(visitId);
    
    return res.json({
      success: true,
      message: 'Visit deleted successfully'
    });
  })
);

export default router;
