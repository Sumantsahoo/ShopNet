const express=require('express');
const {protect}=require('../middleware/authMiddleWare');
const {admin}=require('../middleware/adminMiddleWare');
const router=express.Router();
const {getAdminStats}=require('../controllers/analyticsController');
router.get('/',protect,admin,getAdminStats);

module.exports=router;
