import { Router } from 'express';
import { VisitController } from '../controllers/VisitController';
import { authenticateToken, requirePatientAccess, requirePatientModify } from '../middleware/auth';

const router = Router();
const visitController = new VisitController();

// All visit routes require authentication and patient access
router.use(authenticateToken, requirePatientAccess);

/**
 * @route   GET /api/v1/visits/statistics
 * @desc    Get visit statistics
 * @access  Private (requires patient access)
 */
router.get('/statistics', visitController.getVisitStatistics);

/**
 * @route   GET /api/v1/visits
 * @desc    Get paginated list of visits with search and filters
 * @access  Private (requires patient access)
 */
router.get('/', VisitController.visitQueryValidation, visitController.getVisits);

/**
 * @route   POST /api/v1/visits
 * @desc    Create a new visit
 * @access  Private (requires patient modify permissions)
 */
router.post(
  '/',
  requirePatientModify,
  VisitController.createVisitValidation,
  visitController.createVisit
);

/**
 * @route   GET /api/v1/visits/:id
 * @desc    Get visit by ID
 * @access  Private (requires patient access)
 */
router.get('/:id', visitController.getVisitById);

/**
 * @route   PUT /api/v1/visits/:id
 * @desc    Update visit information
 * @access  Private (requires patient modify permissions)
 */
router.put(
  '/:id',
  requirePatientModify,
  VisitController.updateVisitValidation,
  visitController.updateVisit
);

/**
 * @route   POST /api/v1/visits/:id/complete
 * @desc    Mark visit as completed
 * @access  Private (requires patient modify permissions)
 */
router.post('/:id/complete', requirePatientModify, visitController.completeVisit);

/**
 * @route   POST /api/v1/visits/:id/audio
 * @desc    Upload audio recording for visit
 * @access  Private (requires patient modify permissions)
 */
router.post(
  '/:id/audio',
  requirePatientModify,
  VisitController.audioUploadMiddleware,
  visitController.uploadVisitAudio
);

/**
 * @route   DELETE /api/v1/visits/:id
 * @desc    Cancel visit
 * @access  Private (requires patient modify permissions)
 */
router.delete('/:id', requirePatientModify, visitController.deleteVisit);

export default router;