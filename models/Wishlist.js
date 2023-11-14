var mongoose = require('mongoose');
var Schema=mongoose.Schema;

const wishListSchema= new Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    product:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Product',
        required:true
    }
},{timestamps:true})

module.exports=mongoose.model('WishList',wishListSchema);