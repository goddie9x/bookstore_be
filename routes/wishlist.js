var express=require('express')
var router=express.Router()
var WishListController=require('../controllers/wishListController');

router.get('/:userId',WishListController.getWishList)
router.post('/',WishListController.addWishList)
router.delete('/',WishListController.deleteWishlist)

module.exports=router