const mongoose=require('mongoose');
const userSchema=new mongoose.Schema({
    name:{type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true
    },
    defaultAddress:{
        fullName:{type:String,trim:true},
        phone:{type:String,trim:true},
        altPhone:{type:String,trim:true},
        street:{type:String,trim:true},
        district:{type:String,trim:true},
        state:{type:String,trim:true},
        postalCode:{type:String,trim:true},
        country:{type:String,default:'India'}
    },
    wishlist:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Product'
    }],
    password:{
        type:String,
        required:true
    },
    role:{
        type:String,
        enum:['user','admin'],
        default:'user'
    },
    joinedAt:{type:Date},
    lastLoginAt:{type:Date},
    orderOtpHash: String,
    orderOtpExpiresAt: Date,
    orderOtpSentAt: Date,
    orderOtpAttempts: {
        type: Number,
        default: 0
    },
    orderAuthorizationHash: String,
    orderAuthorizationExpiresAt: Date,
    passwordResetOtpHash: String,
    passwordResetOtpExpiresAt: Date,
    passwordResetOtpSentAt: Date,
    passwordResetOtpAttempts: {
        type: Number,
        default: 0
    }
});
const User=mongoose.model("User",userSchema);
module.exports=User;