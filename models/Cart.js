var mongoose=require('mongoose')
var Schema=mongoose.Schema;

const CartSchema=new Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    product:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Product',
        required:true
    },
    quantity:{
        type:Number,
        required:true,
        default:1
    }

},{timestamps:true})

module.exports=mongoose.model("Cart",CartSchema)
