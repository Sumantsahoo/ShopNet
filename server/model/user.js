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
        block:{type:String,trim:true},
        village:{type:String,trim:true},
        postalCode:{type:String,trim:true},
        country:{type:String,default:'India'}
    },
    wishlist:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Product'
    }],
    recentSearches:{type:[String],default:[]},
    searchHistory:[{
        term:{type:String,required:true},
        searchedAt:{type:Date,required:true,default:Date.now}
    }],
    recentProducts:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Product'
    }],
    productViewHistory:[{
        product:{type:mongoose.Schema.Types.ObjectId,ref:'Product',required:true},
        viewedAt:{type:Date,required:true,default:Date.now}
    }],
    cartHistory:[{
        product:{type:mongoose.Schema.Types.ObjectId,ref:'Product',required:true},
        addedAt:{type:Date,required:true,default:Date.now}
    }],
    password:{
        type:String,
        required:true
    },
    role:{
        type:String,
        enum:['user','admin','employee'],
        default:'user'
    },
    accountDisabled:{type:Boolean,default:false},
    employeePosition:{type:String,trim:true,default:''},
    employeeCompanyId:{type:String,trim:true,default:''},
    employmentStatus:{type:String,enum:['active','inactive'],default:'active'},
    employeeStartedAt:{type:Date},
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