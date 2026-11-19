const mongoose = require('mongoose');
const User = require('../model/user');
const EmployeeAttendance = require('../model/employeeAttendance');

const getIndiaWorkDate = () => new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);

const getEmployeeWorkspace = async (req, res) => {
    try {
        const [today, recent] = await Promise.all([
            EmployeeAttendance.findOne({ employee: req.user._id, workDate: getIndiaWorkDate() }).lean(),
            EmployeeAttendance.find({ employee: req.user._id }).sort({ workDate: -1, checkInAt: -1 }).limit(7).lean()
        ]);
        return res.json({
            employee: {
                name: req.user.name,
                position: req.user.employeePosition,
                companyId: req.user.employeeCompanyId
            },
            today,
            recent
        });
    } catch (error) {
        console.error('Could not load employee workspace:', error.message);
        return res.status(500).json({ message: 'Could not load your work status.' });
    }
};

const checkIn = async (req, res) => {
    try {
        const today = getIndiaWorkDate();
        const existing = await EmployeeAttendance.findOne({ employee: req.user._id, workDate: today });
        if (existing) {
            return res.status(409).json({ message: 'You already checked in today.' });
        }

        const attendance = await EmployeeAttendance.create({
            employee: req.user._id,
            employeeName: req.user.name,
            employeeEmail: req.user.email,
            position: req.user.employeePosition,
            companyId: req.user.employeeCompanyId,
            workDate: today,
            checkInAt: new Date()
        });
        return res.status(201).json({ message: 'Check-in recorded.', attendance });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'You already checked in today.' });
        }
        console.error('Employee check-in failed:', error.message);
        return res.status(500).json({ message: 'Could not record your check-in.' });
    }
};

const checkOut = async (req, res) => {
    const workSummary = typeof req.body.workSummary === 'string' ? req.body.workSummary.trim() : '';
    if (workSummary.length < 3 || workSummary.length > 1200) {
        return res.status(400).json({ message: 'Enter a work update between 3 and 1200 characters before checking out.' });
    }

    try {
        const attendance = await EmployeeAttendance.findOneAndUpdate(
            { employee: req.user._id, workDate: getIndiaWorkDate(), checkOutAt: { $exists: false } },
            { $set: { checkOutAt: new Date(), workSummary } },
            { new: true, runValidators: true }
        );
        if (!attendance) {
            return res.status(409).json({ message: 'Check in first, or your check-out was already recorded today.' });
        }
        return res.json({ message: 'Work update saved and check-out recorded.', attendance });
    } catch (error) {
        console.error('Employee check-out failed:', error.message);
        return res.status(500).json({ message: 'Could not save your work update.' });
    }
};

const listEmployees = async (_req, res) => {
    try {
        const [employees, logs, possibleEmployeeAccounts] = await Promise.all([
            User.find({ role: 'employee' })
                .select('name email employeePosition employeeCompanyId employmentStatus employeeStartedAt accountDisabled')
                .sort({ employeePosition: 1, name: 1 })
                .lean(),
            EmployeeAttendance.find().sort({ workDate: -1, checkInAt: -1 }).lean(),
            User.find({
                role: 'user',
                accountDisabled: { $ne: true },
                email: { $regex: 'shopnest', $options: 'i' }
            }).select('name email joinedAt').sort({ joinedAt: -1 }).limit(50).lean()
        ]);
        return res.json({ employees, logs, possibleEmployeeAccounts });
    } catch (error) {
        console.error('Could not load employee records:', error.message);
        return res.status(500).json({ message: 'Could not load employee records.' });
    }
};

const searchEmployeeCandidates = async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    if (search.length < 2 || search.length > 80) {
        return res.status(400).json({ message: 'Enter at least two characters to find a registered account.' });
    }

    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
        const candidates = await User.find({
            role: 'user',
            accountDisabled: { $ne: true },
            $or: [
                { name: { $regex: escapedSearch, $options: 'i' } },
                { email: { $regex: escapedSearch, $options: 'i' } }
            ]
        }).select('name email joinedAt').sort({ name: 1 }).limit(25).lean();
        return res.json(candidates);
    } catch (error) {
        console.error('Employee account search failed:', error.message);
        return res.status(500).json({ message: 'Could not search registered accounts.' });
    }
};

const assignEmployee = async (req, res) => {
    const { userId } = req.body;
    const position = typeof req.body.position === 'string' ? req.body.position.trim() : '';
    const companyId = typeof req.body.companyId === 'string' ? req.body.companyId.trim() : '';
    if (!mongoose.isValidObjectId(userId) || position.length < 2 || position.length > 80 || companyId.length < 2 || companyId.length > 40) {
        return res.status(400).json({ message: 'Select a registered account, enter a valid job title, and enter a company ID.' });
    }

    try {
        const employee = await User.findOne({ _id: userId, role: 'user', accountDisabled: { $ne: true } });
        if (!employee) {
            return res.status(404).json({ message: 'That account is unavailable or already assigned.' });
        }

        employee.role = 'employee';
        employee.employeePosition = position;
        employee.employeeCompanyId = companyId;
        employee.employmentStatus = 'active';
        employee.employeeStartedAt = new Date();
        await employee.save();
        return res.status(201).json({
            message: `${employee.name} is now assigned as ${position}. They must sign in again to see the employee workspace.`,
            employee: {
                _id: employee._id,
                name: employee.name,
                email: employee.email,
                employeePosition: employee.employeePosition,
                employeeCompanyId: employee.employeeCompanyId,
                employmentStatus: employee.employmentStatus,
                employeeStartedAt: employee.employeeStartedAt
            }
        });
    } catch (error) {
        console.error('Employee assignment failed:', error.message);
        return res.status(500).json({ message: 'Could not assign this employee.' });
    }
};

const deactivateEmployee = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: 'A valid employee account is required.' });
    }

    try {
        const employee = await User.findOne({ _id: req.params.id, role: 'employee' });
        if (!employee) return res.status(404).json({ message: 'Employee account not found.' });
        employee.employmentStatus = 'inactive';
        employee.accountDisabled = true;
        await employee.save();
        return res.json({ message: `Access for ${employee.name} has been disabled. Past attendance records were retained.` });
    } catch (error) {
        console.error('Employee deactivation failed:', error.message);
        return res.status(500).json({ message: 'Could not disable this employee account.' });
    }
};

const activateEmployee = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: 'A valid employee account is required.' });
    }

    try {
        const employee = await User.findOneAndUpdate(
            { _id: req.params.id, role: 'employee' },
            { $set: { employmentStatus: 'active', accountDisabled: false } },
            { new: true, runValidators: true }
        ).select('name employmentStatus accountDisabled');
        if (!employee) return res.status(404).json({ message: 'Employee account not found.' });
        return res.json({ message: `Access for ${employee.name} has been activated.`, employee });
    } catch (error) {
        console.error('Employee activation failed:', error.message);
        return res.status(500).json({ message: 'Could not activate this employee account.' });
    }
};

const updateEmployee = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: 'A valid employee account is required.' });
    }
    const position = typeof req.body.position === 'string' ? req.body.position.trim() : '';
    const companyId = typeof req.body.companyId === 'string' ? req.body.companyId.trim() : '';
    if (position.length < 2 || position.length > 80 || companyId.length < 2 || companyId.length > 40) {
        return res.status(400).json({ message: 'Enter a valid job title and company ID.' });
    }

    try {
        const employee = await User.findOneAndUpdate(
            { _id: req.params.id, role: 'employee' },
            { $set: { employeePosition: position, employeeCompanyId: companyId } },
            { new: true, runValidators: true }
        ).select('name employeePosition employeeCompanyId employmentStatus accountDisabled');
        if (!employee) return res.status(404).json({ message: 'Employee account not found.' });
        return res.json({ message: `${employee.name}'s position and company ID were updated.`, employee });
    } catch (error) {
        console.error('Employee record update failed:', error.message);
        return res.status(500).json({ message: 'Could not update this employee record.' });
    }
};

module.exports = {
    getEmployeeWorkspace,
    checkIn,
    checkOut,
    listEmployees,
    searchEmployeeCandidates,
    assignEmployee,
    activateEmployee,
    deactivateEmployee,
    updateEmployee
};
