const mongoose = require('mongoose');

const employeeAttendanceSchema = new mongoose.Schema({
    employee:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    employeeName:{type:String,required:true,trim:true},
    employeeEmail:{type:String,required:true,trim:true,lowercase:true},
    position:{type:String,required:true,trim:true},
    companyId:{type:String,required:true,trim:true},
    workDate:{type:String,required:true},
    checkInAt:{type:Date,required:true},
    checkOutAt:{type:Date},
    workSummary:{type:String,trim:true,maxlength:1200}
},{timestamps:true});

employeeAttendanceSchema.index({employee:1,workDate:1},{unique:true});

module.exports = mongoose.model('EmployeeAttendance', employeeAttendanceSchema);
