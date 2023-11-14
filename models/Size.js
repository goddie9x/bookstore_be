const mongoose =require('mongoose');
const Schema=mongoose.Schema;

const sizeSchema=new Schema({
    product:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Product',
        required:true
    },
    name:{
        type:String,
        required:true
    },
    numberInStock:{
        type:Number,
        required:true,
        min:0,
        default:0
    }
},{timestamps:true})

module.exports=mongoose.model('Size',sizeSchema);