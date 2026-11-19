const express = require('express');
const { optionalProtect } = require('../middleware/authMiddleWare');
const { getRecommendations } = require('../controllers/recommendationController');

const router = express.Router();
router.get('/', optionalProtect, getRecommendations);

module.exports = router;
