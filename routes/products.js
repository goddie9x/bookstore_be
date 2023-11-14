var express =require('express');
const passport =require('../middlewares/passport');
var router=express.Router();
const ProductController=require('../controllers/productController');

router.post('/',ProductController.addProduct)
router.get('/',ProductController.searchProduct)
router.get('/:productId',ProductController.getProductId)
router.get('/product/bin',ProductController.getProductBin)
router.delete('/',ProductController.deleteProduct)
router.put('/restore',ProductController.restoreProduct)
router.put('/edit',ProductController.editProduct)
module.exports=router;