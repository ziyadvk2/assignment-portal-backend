const express = require('express');
const { body } = require('express-validator');
const {
  createAssignment,
  getAssignments,
  getAssignment,
  updateAssignment,
  publishAssignment,
  completeAssignment,
  deleteAssignment,
  getAssignmentSubmissions,
  reviewSubmission
} = require('../controllers/assignmentController');
const { auth, requireTeacher } = require('../middleware/auth');

const router = express.Router();

router.use(auth, requireTeacher);

router.post('/', [
  body('title').not().isEmpty().trim().withMessage('Title is required'),
  body('description').not().isEmpty().trim().withMessage('Description is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required')
], createAssignment);

router.get('/', getAssignments);
router.get('/:id', getAssignment);
router.put('/:id', [
  body('title').optional().not().isEmpty().trim().withMessage('Title cannot be empty'),
  body('description').optional().not().isEmpty().trim().withMessage('Description cannot be empty')
], updateAssignment);
router.patch('/:id/publish', publishAssignment);
router.patch('/:id/complete', completeAssignment);
router.delete('/:id', deleteAssignment);
router.get('/:id/submissions', getAssignmentSubmissions);
router.patch('/:assignmentId/submissions/:submissionId/review', reviewSubmission);

module.exports = router;