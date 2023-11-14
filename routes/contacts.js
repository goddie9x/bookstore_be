var express = require('express')
var router = express.Router()
const RouterController = require('../controllers/contactController')

router.post('/user',RouterController.sendContact)
router.get('/admin',RouterController.getContact)
router.delete('/',RouterController.deleteContact)

module.exports = router