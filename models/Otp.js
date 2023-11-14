var mongoose = require('mongoose')
var Schema = mongoose.Schema

var otpSchema = new Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    otp:{
        type:String,
        required:true
    }

},{timestamps:true})

module.exports= mongoose.model('Otp',otpSchema);