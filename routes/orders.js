var express=require('express')
var router=express.Router()
var OrderController=require('../controllers/orderController')
var OrderAdminController=require('../controllers/orderAdminController')

router.post('/',OrderController.createOrder)
router.get('/',OrderController.getOrder)
router.get('/payment',OrderController.payment)
router.get('/admin',OrderAdminController.getOrder)
router.put('/admin/status',OrderAdminController.acceptStatus)
router.put('/',OrderController.cancelOrder)
module.exports=router