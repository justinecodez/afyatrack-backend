import { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { VisitService, CreateVisitRequest, UpdateVisitRequest, VisitQuery } from '../services/VisitService';
import { VisitStatus, VisitType } from '../entities/Visit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'audio');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `visit-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const audioUpload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

export class VisitController {
  private visitService: VisitService;

  constructor() {
    this.visitService = new VisitService();
  }

  /**
   * Validation rules for creating visit
   */
  static createVisitValidation = [
    body('patientId')
      .notEmpty()
      .isUUID()
      .withMessage('Valid patient ID is required'),
    body('chiefComplaint')
      .notEmpty()
      .isLength({ min: 5, max: 1000 })
      .withMessage('Chief complaint must be between 5 and 1000 characters'),
    body('visitType')
      .optional()
      .isIn(Object.values(VisitType))
      .withMessage('Invalid visit type'),
    body('currentIllness')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Current illness must be less than 2000 characters'),
    body('medicalHistory')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Medical history must be less than 2000 characters'),
    body('physicalExam')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Physical exam must be less than 2000 characters'),
    body('assessment')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Assessment must be less than 2000 characters'),
    body('plan')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Plan must be less than 2000 characters'),
    body('nextAppointment')
      .optional()
      .isISO8601()
      .withMessage('Next appointment must be a valid date'),
  ];

  /**
   * Validation rules for updating visit
   */
  static updateVisitValidation = [
    body('chiefComplaint')
      .optional()
      .isLength({ min: 5, max: 1000 })
      .withMessage('Chief complaint must be between 5 and 1000 characters'),
    body('visitType')
      .optional()
      .isIn(Object.values(VisitType))
      .withMessage('Invalid visit type'),
    body('status')
      .optional()
      .isIn(Object.values(VisitStatus))
      .withMessage('Invalid visit status'),
    body('nextAppointment')
      .optional()
      .isISO8601()
      .withMessage('Next appointment must be a valid date'),
  ];

  /**
   * Validation rules for visit query parameters
   */
  static visitQueryValidation = [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('patientId')
      .optional()
      .isUUID()
      .withMessage('Patient ID must be a valid UUID'),
    query('status')
      .optional()
      .isIn(Object.values(VisitStatus))
      .withMessage('Invalid status'),
    query('visitType')
      .optional()
      .isIn(Object.values(VisitType))
      .withMessage('Invalid visit type'),
  ];

  /**
   * Create a new visit
   */
  createVisit = async (req: Request, res: Response): Promise<void> => {
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
      const visitData: CreateVisitRequest = req.body;

      const visit = await this.visitService.createVisit(visitData, userId);

      res.status(201).json({
        success: true,
        message: 'Visit created successfully',
        data: visit,
      });
    } catch (error) {
      console.error('Create visit error:', error);
      const status = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      res.status(status).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create visit',
      });
    }
  };

  /**
   * Get visits with pagination and filtering
   */
  getVisits = async (req: Request, res: Response): Promise<void> => {
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

      const query: VisitQuery = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        patientId: req.query.patientId as string,
        status: req.query.status as VisitStatus,
        visitType: req.query.visitType as VisitType,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      };

      const result = await this.visitService.getVisits(query);

      res.status(200).json({
        success: true,
        message: 'Visits retrieved successfully',
        data: result,
      });
    } catch (error) {
      console.error('Get visits error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve visits',
      });
    }
  };

  /**
   * Get visit by ID
   */
  getVisitById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const includePatient = req.query.includePatient === 'true';

      const visit = await this.visitService.getVisitById(id, includePatient);

      if (!visit) {
        res.status(404).json({
          success: false,
          message: 'Visit not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Visit retrieved successfully',
        data: visit,
      });
    } catch (error) {
      console.error('Get visit error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve visit',
      });
    }
  };

  /**
   * Update visit information
   */
  updateVisit = async (req: Request, res: Response): Promise<void> => {
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
      const updateData: UpdateVisitRequest = req.body;

      const visit = await this.visitService.updateVisit(id, updateData, userId);

      res.status(200).json({
        success: true,
        message: 'Visit updated successfully',
        data: visit,
      });
    } catch (error) {
      console.error('Update visit error:', error);
      const status = error instanceof Error && error.message === 'Visit not found' ? 404 : 400;
      res.status(status).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update visit',
      });
    }
  };

  /**
   * Delete (cancel) visit
   */
  deleteVisit = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId!;

      await this.visitService.deleteVisit(id, userId);

      res.status(200).json({
        success: true,
        message: 'Visit cancelled successfully',
      });
    } catch (error) {
      console.error('Delete visit error:', error);
      const status = error instanceof Error && error.message === 'Visit not found' ? 404 : 400;
      res.status(status).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to cancel visit',
      });
    }
  };

  /**
   * Complete a visit
   */
  completeVisit = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId!;

      const visit = await this.visitService.completeVisit(id, userId);

      res.status(200).json({
        success: true,
        message: 'Visit completed successfully',
        data: visit,
      });
    } catch (error) {
      console.error('Complete visit error:', error);
      const status = error instanceof Error && error.message === 'Visit not found' ? 404 : 400;
      res.status(status).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to complete visit',
      });
    }
  };

  /**
   * Upload visit audio recording
   */
  uploadVisitAudio = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { transcript, durationMinutes } = req.body;

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Audio file is required',
        });
        return;
      }

      // Generate URL for the uploaded file
      const audioUrl = `/uploads/audio/${req.file.filename}`;
      const parsedDuration = durationMinutes ? parseFloat(durationMinutes) : undefined;

      const visit = await this.visitService.updateVisitAudio(id, audioUrl, transcript, parsedDuration);

      res.status(200).json({
        success: true,
        message: 'Visit audio uploaded successfully',
        data: {
          ...visit,
          audioUrl: `${req.protocol}://${req.get('host')}${audioUrl}`,
        },
      });
    } catch (error) {
      console.error('Upload visit audio error:', error);
      const status = error instanceof Error && error.message === 'Visit not found' ? 404 : 400;
      res.status(status).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to upload audio',
      });
    }
  };

  /**
   * Get visit statistics
   */
  getVisitStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const facilityId = req.query.facilityId as string;

      const statistics = await this.visitService.getVisitStatistics(facilityId);

      res.status(200).json({
        success: true,
        message: 'Visit statistics retrieved successfully',
        data: statistics,
      });
    } catch (error) {
      console.error('Get visit statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve visit statistics',
      });
    }
  };

  /**
   * Middleware for handling audio upload
   */
  static audioUploadMiddleware = audioUpload.single('audio');
}