import { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { PatientService, CreatePatientRequest, UpdatePatientRequest, PatientQuery } from '../services/PatientService';
import { Gender } from '../entities/Patient';

export class PatientController {
  private patientService: PatientService;

  constructor() {
    this.patientService = new PatientService();
  }

  /**
   * Validation rules for creating patient
   */
  static createPatientValidation = [
    body('name')
      .notEmpty()
      .isLength({ min: 2, max: 100 })
      .withMessage('Patient name must be between 2 and 100 characters'),
    body('dateOfBirth')
      .isISO8601()
      .toDate()
      .withMessage('Date of birth must be a valid date'),
    body('gender')
      .isIn(Object.values(Gender))
      .withMessage('Gender must be male, female, or other'),
    body('phone')
      .optional()
      .matches(/^\+?[1-9]\d{1,14}$/)
      .withMessage('Phone number must be valid'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Email must be valid'),
    body('nhifNumber')
      .optional()
      .isLength({ min: 10, max: 20 })
      .withMessage('NHIF number must be between 10 and 20 characters'),
    body('nationalId')
      .optional()
      .isLength({ min: 10, max: 50 })
      .withMessage('National ID must be between 10 and 50 characters'),
    body('facilityId')
      .optional()
      .isUUID()
      .withMessage('Facility ID must be a valid UUID'),
  ];

  /**
   * Validation rules for updating patient
   */
  static updatePatientValidation = [
    body('name')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Patient name must be between 2 and 100 characters'),
    body('dateOfBirth')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('Date of birth must be a valid date'),
    body('gender')
      .optional()
      .isIn(Object.values(Gender))
      .withMessage('Gender must be male, female, or other'),
    body('phone')
      .optional()
      .matches(/^\+?[1-9]\d{1,14}$/)
      .withMessage('Phone number must be valid'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Email must be valid'),
    body('nhifNumber')
      .optional()
      .isLength({ min: 10, max: 20 })
      .withMessage('NHIF number must be between 10 and 20 characters'),
    body('nationalId')
      .optional()
      .isLength({ min: 10, max: 50 })
      .withMessage('National ID must be between 10 and 50 characters'),
    body('facilityId')
      .optional()
      .isUUID()
      .withMessage('Facility ID must be a valid UUID'),
  ];

  /**
   * Validation rules for patient query parameters
   */
  static patientQueryValidation = [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('search')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search term must be between 1 and 100 characters'),
    query('gender')
      .optional()
      .isIn(Object.values(Gender))
      .withMessage('Gender must be male, female, or other'),
    query('facilityId')
      .optional()
      .isUUID()
      .withMessage('Facility ID must be a valid UUID'),
  ];

  /**
   * Create a new patient
   */
  createPatient = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const userId = req.user?.userId!;
      const patientData: CreatePatientRequest = req.body;

      const patient = await this.patientService.createPatient(patientData, userId);

      res.status(201).json({
        success: true,
        message: 'Patient created successfully',
        data: patient,
      });
    } catch (error) {
      console.error('Create patient error:', error);
      const status = error instanceof Error && error.message.includes('already exists') ? 409 : 400;
      res.status(status).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create patient',
      });
    }
  };

  /**
   * Get paginated list of patients
   */
  getPatients = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const query: PatientQuery = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        search: req.query.search as string,
        gender: req.query.gender as Gender,
        facilityId: req.query.facilityId as string,
      };

      // Parse age range if provided
      if (req.query.minAge || req.query.maxAge) {
        query.ageRange = {
          min: req.query.minAge ? parseInt(req.query.minAge as string, 10) : undefined,
          max: req.query.maxAge ? parseInt(req.query.maxAge as string, 10) : undefined,
        };
      }

      const result = await this.patientService.getPatients(query);

      res.status(200).json({
        success: true,
        message: 'Patients retrieved successfully',
        data: result,
      });
    } catch (error) {
      console.error('Get patients error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve patients',
      });
    }
  };

  /**
   * Get patient by ID
   */
  getPatientById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const includeStats = req.query.includeStats === 'true';

      const patient = await this.patientService.getPatientById(id, includeStats);

      if (!patient) {
        res.status(404).json({
          success: false,
          message: 'Patient not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Patient retrieved successfully',
        data: patient,
      });
    } catch (error) {
      console.error('Get patient error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve patient',
      });
    }
  };

  /**
   * Update patient information
   */
  updatePatient = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { id } = req.params;
      const userId = req.user?.userId!;
      const updateData: UpdatePatientRequest = req.body;

      const patient = await this.patientService.updatePatient(id, updateData, userId);

      res.status(200).json({
        success: true,
        message: 'Patient updated successfully',
        data: patient,
      });
    } catch (error) {
      console.error('Update patient error:', error);
      const status = error instanceof Error && error.message === 'Patient not found' ? 404 : 400;
      res.status(status).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update patient',
      });
    }
  };

  /**
   * Delete (deactivate) patient
   */
  deletePatient = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId!;

      await this.patientService.deletePatient(id, userId);

      res.status(200).json({
        success: true,
        message: 'Patient deleted successfully',
      });
    } catch (error) {
      console.error('Delete patient error:', error);
      const status = error instanceof Error && error.message === 'Patient not found' ? 404 : 400;
      res.status(status).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete patient',
      });
    }
  };

  /**
   * Get patient's visit history
   */
  getPatientVisits = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const result = await this.patientService.getPatientVisits(id, page, limit);

      res.status(200).json({
        success: true,
        message: 'Patient visits retrieved successfully',
        data: result,
      });
    } catch (error) {
      console.error('Get patient visits error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve patient visits',
      });
    }
  };

  /**
   * Search patients
   */
  searchPatients = async (req: Request, res: Response): Promise<void> => {
    try {
      const { q: searchTerm } = req.query;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      if (!searchTerm || typeof searchTerm !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Search term is required',
        });
        return;
      }

      const patients = await this.patientService.searchPatients(searchTerm, limit);

      res.status(200).json({
        success: true,
        message: 'Patient search completed successfully',
        data: patients,
      });
    } catch (error) {
      console.error('Search patients error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search patients',
      });
    }
  };

  /**
   * Get patient statistics
   */
  getPatientStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const facilityId = req.query.facilityId as string;

      const statistics = await this.patientService.getPatientStatistics(facilityId);

      res.status(200).json({
        success: true,
        message: 'Patient statistics retrieved successfully',
        data: statistics,
      });
    } catch (error) {
      console.error('Get patient statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve patient statistics',
      });
    }
  };
}