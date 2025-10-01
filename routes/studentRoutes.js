const express = require('express');
const { body } = require('express-validator');
const {
  getPublishedAssignments,
  submitAssignment,
  getStudentSubmissions,
  getStudentSubmission
} = require('../controllers/studentController');
const { auth, requireStudent } = require('../middleware/auth');

const router = express.Router();

router.use(auth, requireStudent);

router.get('/assignments', getPublishedAssignments);
router.get('/submissions', getStudentSubmissions);
router.post('/assignments/:id/submit', [
  body('answer').not().isEmpty().trim().withMessage('Answer is required')
], submitAssignment);


module.exports = router;