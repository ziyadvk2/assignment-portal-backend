const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const User = require('../models/User');
const { validationResult } = require('express-validator');


exports.getPublishedAssignments = async (req, res) => {
  try {  
    const assignments = await Assignment.find({ 
      status: 'published'
    })
    .populate('teacher', 'name email')
    .sort({ dueDate: 1 });

    const formattedAssignments = assignments.map(assignment => ({
      _id: assignment._id,
      title: assignment.title,
      description: assignment.description,
      dueDate: assignment.dueDate,
      status: assignment.status,
      teacher: assignment.teacher,
      submissions: assignment.submissions || [],
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt
    }));

    res.json({ 
      success: true,
      assignments: formattedAssignments 
    });
  } catch (error) {
    console.error('Error fetching published assignments:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching assignments' 
    });
  }
};


exports.submitAssignment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const { answer } = req.body;

    const assignment = await Assignment.findOne({ 
      _id: id, 
      status: 'published' 
    });

    if (!assignment) {
      return res.status(404).json({ 
        success: false,
        message: 'Assignment not found or not available for submission' 
      });
    }
    const existingSubmission = await Submission.findOne({
      assignment: id,
      student: req.user.id
    });

    if (existingSubmission) {
      return res.status(400).json({ 
        success: false,
        message: 'You have already submitted this assignment' 
      });
    }

    const submission = new Submission({
      assignment: id,
      student: req.user.id,
      answer: answer.trim()
    });

    await submission.save();

    await Assignment.findByIdAndUpdate(id, {
      $push: { submissions: submission._id }
    });

    await submission.populate('assignment', 'title description dueDate');
    await submission.populate('student', 'name email');

    res.status(201).json({
      success: true,
      message: 'Assignment submitted successfully',
      submission: {
        _id: submission._id,
        assignmentId: submission.assignment._id,
        assignmentTitle: submission.assignment.title,
        answer: submission.answer,
        submittedDate: submission.submittedAt,
        reviewed: submission.reviewed,
        studentName: submission.student.name,
        studentId: submission.student._id
      }
    });
  } catch (error) {
    console.error('Error submitting assignment:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while submitting assignment' 
    });
  }
};


exports.getStudentSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ student: req.user.id })
      .populate('assignment', 'title description dueDate')
      .populate('student', 'name email')
      .sort({ submittedAt: -1 });

    const formattedSubmissions = submissions.map(submission => ({
      _id: submission._id,
      assignmentId: submission.assignment._id,
      assignmentTitle: submission.assignment.title,
      answer: submission.answer,
      submittedDate: submission.submittedAt,
      reviewed: submission.reviewed,
      studentName: submission.student.name,
      studentId: submission.student._id
    }));

    res.json({ 
      success: true,
      submissions: formattedSubmissions 
    });
  } catch (error) {
    console.error('Error fetching student submissions:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching submissions' 
    });
  }
};