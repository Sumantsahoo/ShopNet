const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { protect } = require('../middleware/authMiddleWare');
const { admin } = require('../middleware/adminMiddleWare');
const { getStorefrontSettings, updateStorefrontSettings } = require('../controllers/storefrontController');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const router = express.Router();
const upload = multer({ dest: uploadDir });
const heroImageFields = [
    { name: 'heroImage', maxCount: 1 },
    ...Array.from({ length: 6 }, (_, index) => ({ name: `heroImage${index}`, maxCount: 1 }))
];

router.get('/', getStorefrontSettings);
router.put('/', protect, admin, upload.fields(heroImageFields), updateStorefrontSettings);

module.exports = router;
