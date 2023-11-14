var WishList= require('../models/Wishlist')

const addWishList = async(req,res,next)=>{
        try{

            const {productId,userId}={...req.body}
            const exitWishList= await WishList.findOne({product:productId,user:userId})
            if(exitWishList){
                 return res.status(200).json({success:true,status:'ok'})
             } 
             const newWishList =  new WishList({user:userId,product:productId})
             newWishList.save()
             return res.status(200).json({success:true,newWishList})
        }catch(error){
            next(error)
        }
}
const getWishList = async(req,res,next)=>{
    try{
            const {userId}={...req.params}
            // console.log("param: ",req.params)
            const listWL= await WishList.find({user:userId}).sort('-_id').populate('product').lean()
            // console.log('list WL: ',listWL)
            return res.status(200).json({success:true,listWL})
    }
    catch(error){
        next(error)
    }
}
const deleteWishlist = async(req,res,next)=>{
    try{
            const {wishlistId}={...req.body}
            await WishList.deleteMany(  {_id: {$in :wishlistId} } )
            return res.status(200).json({success:true,status:"ok"})
    }catch(error){
       next(error)
    }
}
module.exports={
    addWishList,
    getWishList,
    deleteWishlist
}