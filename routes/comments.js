var express = require('express');
var router = express.Router();
var commentController=require('../controllers/commentController')

router.post('/',commentController.userComment)
router.get('/:productId',commentController.getComment)
router.delete('/:commentId',commentController.deleteComment)

module.exports=router