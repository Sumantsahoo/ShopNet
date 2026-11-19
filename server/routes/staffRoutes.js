const express = require('express');
const { protect } = require('../middleware/authMiddleWare');
const { admin } = require('../middleware/adminMiddleWare');
const { employee } = require('../middleware/employeeMiddleWare');
const {
    getEmployeeWorkspace,
    checkIn,
    checkOut,
    listEmployees,
    searchEmployeeCandidates,
    assignEmployee,
    activateEmployee,
    deactivateEmployee,
    updateEmployee
} = require('../controllers/employeeController');

const router = express.Router();

router.get('/employee/me', protect, employee, getEmployeeWorkspace);
router.post('/employee/check-in', protect, employee, checkIn);
router.post('/employee/check-out', protect, employee, checkOut);
router.get('/cofounder/employees', protect, admin, listEmployees);
router.get('/cofounder/employee-candidates', protect, admin, searchEmployeeCandidates);
router.post('/cofounder/employees', protect, admin, assignEmployee);
router.put('/cofounder/employees/:id', protect, admin, updateEmployee);
router.put('/cofounder/employees/:id/activate', protect, admin, activateEmployee);
router.put('/cofounder/employees/:id/deactivate', protect, admin, deactivateEmployee);

module.exports = router;
