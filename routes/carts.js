var express=require('express');
var router=express.Router();
var cartController=require('../controllers/cartController');

router.post('/',cartController.addTocart)
router.get('/:userId',cartController.getCartItem)
router.delete('/',cartController.deleteCartItem)
router.put('/',cartController.updateCartItem)

module.exports=router