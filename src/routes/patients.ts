import { Router } from 'express';
import { PatientController } from '../controllers/PatientController';
import { authenticateToken, requirePatientAccess, requirePatientModify } from '../middleware/auth';

const router = Router();
const patientController = new PatientController();

// All patient routes require authentication and patient access
router.use(authenticateToken, requirePatientAccess);

/**
 * @route   GET /api/v1/patients/statistics
 * @desc    Get patient statistics
 * @access  Private (requires patient access)
 */
router.get('/statistics', patientController.getPatientStatistics);

/**
 * @route   GET /api/v1/patients/search
 * @desc    Search patients by name, NHIF, or national ID
 * @access  Private (requires patient access)
 */
router.get('/search', patientController.searchPatients);

/**
 * @route   GET /api/v1/patients
 * @desc    Get paginated list of patients with search and filters
 * @access  Private (requires patient access)
 */
router.get('/', PatientController.patientQueryValidation, patientController.getPatients);

/**
 * @route   POST /api/v1/patients
 * @desc    Create a new patient
 * @access  Private (requires patient modify permissions)
 */
router.post(
  '/',
  requirePatientModify,
  PatientController.createPatientValidation,
  patientController.createPatient
);

/**
 * @route   GET /api/v1/patients/:id
 * @desc    Get patient by ID
 * @access  Private (requires patient access)
 */
router.get('/:id', patientController.getPatientById);

/**
 * @route   PUT /api/v1/patients/:id
 * @desc    Update patient information
 * @access  Private (requires patient modify permissions)
 */
router.put(
  '/:id',
  requirePatientModify,
  PatientController.updatePatientValidation,
  patientController.updatePatient
);

/**
 * @route   DELETE /api/v1/patients/:id
 * @desc    Delete (deactivate) patient
 * @access  Private (requires patient modify permissions)
 */
router.delete('/:id', requirePatientModify, patientController.deletePatient);

/**
 * @route   GET /api/v1/patients/:id/visits
 * @desc    Get patient's visit history
 * @access  Private (requires patient access)
 */
router.get('/:id/visits', patientController.getPatientVisits);

export default router;