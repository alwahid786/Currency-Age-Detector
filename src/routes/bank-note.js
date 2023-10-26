const express = require('express');
const router = express.Router();

const { uploadS3 } = require('../helpers/s3.helper');

const {
  addNote,
  ClassifyNote,
  BankNoteGrade,
} = require('../controller/bank-note');

// Note
router.post(
  '/',
  uploadS3.fields([
    { name: 'frontSideImage', maxCount: 1 },
    { name: 'backSideSideImage', maxCount: 1 },
    { name: 'othersImage', maxCount: 1 },
  ]),
  addNote
);

router.post(
  '/classify',
  uploadS3.fields([
    { name: 'frontSideImage', maxCount: 1 },
    { name: 'backSideSideImage', maxCount: 1 },
  ]),
  ClassifyNote
);

router.post('/grade', BankNoteGrade);

module.exports = router;
