const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const { validationResult } = require('express-validator');

exports.createAssignment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { title, description, dueDate } = req.body;
    const assignment = new Assignment({
      title,
      description,
      dueDate,
      teacher: req.user.id,
      status: 'draft'
    });

    await assignment.save();
    await assignment.populate('teacher', 'name email'); 
    res.status(201).json(assignment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAssignments = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    let query = { teacher: req.user.id };
    
    if (status && ['draft', 'published', 'completed'].includes(status)) {
      query.status = status;
    }

    const assignments = await Assignment.find(query)
      .populate('teacher', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Assignment.countDocuments(query);

    res.json({
      assignments,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.publishAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findOne({
      _id: req.params.id,
      teacher: req.user.id,
      status: 'draft'
    });

    if (!assignment) {
      return res.status(404).json({ 
        message: 'Assignment not found or cannot be published (must be in draft status)' 
      });
    }

    assignment.status = 'published';
    assignment.publishedAt = new Date(); 
    await assignment.save();
    
    await assignment.populate('teacher', 'name email');

    res.json(assignment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.completeAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findOne({
      _id: req.params.id,
      teacher: req.user.id,
      status: 'published'
    });

    if (!assignment) {
      return res.status(404).json({ 
        message: 'Assignment not found or cannot be completed (must be in published status)' 
      });
    }

    assignment.status = 'completed';
    assignment.completedAt = new Date(); 
    await assignment.save();
    
    await assignment.populate('teacher', 'name email');

    res.json(assignment); 
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findOne({
      _id: req.params.id,
      teacher: req.user.id,
      status: 'draft'
    });

    if (!assignment) {
      return res.status(404).json({ 
        message: 'Assignment not found or cannot be deleted (must be in draft status)' 
      });
    }

    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAssignmentSubmissions = async (req, res) => {
  try {
    const assignment = await Assignment.findOne({
      _id: req.params.id,
      teacher: req.user.id
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const submissions = await Submission.find({ assignment: req.params.id })
      .populate('student', 'name email')
      .sort({ submittedAt: -1 });

    const formattedSubmissions = submissions.map(sub => ({
      _id: sub._id,
      studentName: sub.student.name,
      studentId: sub.student._id,
      answer: sub.answer,
      submittedDate: sub.submittedAt.toISOString(),
      reviewed: sub.reviewed,
      assignmentId: sub.assignment.toString()
    }));

    res.json({
      assignment: {
        _id: assignment._id,
        title: assignment.title,
        description: assignment.description,
        status: assignment.status
      },
      submissions: formattedSubmissions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.reviewSubmission = async (req, res) => {
  try {
    const { assignmentId, submissionId } = req.params;
    const assignment = await Assignment.findOne({
      _id: assignmentId,
      teacher: req.user.id
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const submission = await Submission.findOneAndUpdate(
      { 
        _id: submissionId, 
        assignment: assignmentId 
      },
      { 
        reviewed: true,
        reviewedAt: new Date()
      },
      { new: true }
    ).populate('student', 'name email');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

   res.json({
  success: true,
  message: 'Submission marked as reviewed',
  submission: {
    _id: submission._id,
    studentName: submission.student.name,
    studentId: submission.student._id,
    answer: submission.answer,
    submittedDate: submission.submittedAt,
    reviewed: submission.reviewed,
    reviewedAt: submission.reviewedAt, 
    assignmentId: submission.assignment.toString()
  }
});
  } catch (error) {
    console.error('Error reviewing submission:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findOne({
      _id: req.params.id,
      teacher: req.user.id
    }).populate('teacher', 'name email');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    res.json(assignment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};



exports.updateAssignment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const assignment = await Assignment.findOne({
      _id: req.params.id,
      teacher: req.user.id,
      status: 'draft'
    });

    if (!assignment) {
      return res.status(404).json({ 
        message: 'Assignment not found or cannot be edited (must be in draft status)' 
      });
    }

    const { title, description, dueDate } = req.body;
    
    if (title) assignment.title = title;
    if (description) assignment.description = description;
    if (dueDate) assignment.dueDate = dueDate;

    await assignment.save();
    await assignment.populate('teacher', 'name email');
    
    res.json(assignment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};




