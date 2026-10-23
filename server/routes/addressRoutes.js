const express = require('express');
const { lookupPincode } = require('../controllers/addressController');

const router = express.Router();

router.get('/pincode/:pincode', lookupPincode);

module.exports = router;