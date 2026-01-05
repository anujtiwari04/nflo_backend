const express = require('express');
const router = express.Router();

const userRoutes = require('./userRoutes');
const examRoutes = require('./examRoutes');

router.use('/user', userRoutes);
// router.use('/exam', examRoutes)

module.exports = router;