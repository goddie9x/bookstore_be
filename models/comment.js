var mongoose=require('mongoose');
var Schema=mongoose.Schema

const commentSchema=new Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    author:{
        type:String,
        required:true
    },
    comment:{
        type:String,
        required:true
    },
    product:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Product',
        required:true
    },
    rating:{
        type:Number,
        required:true,
        default:5,
        min:1,
        max:5
    }
},{timestamps:true})

module.exports=mongoose.model('Comment',commentSchema);