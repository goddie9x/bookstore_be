var mongoose = require("mongoose");
var Schema = mongoose.Schema;

const contactSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    require: true,
  },
  email:{
    type:String,
    require:true
  },
  message: {
    type: String,
    required: true,
  },
},{timestamps:true});

module.exports= mongoose.model('Contact',contactSchema)
