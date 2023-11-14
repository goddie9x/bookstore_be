var express = require('express');
const passport = require('passport')
var router = express.Router();
const UserController=require('../controllers/userController');

const passportConfig=require('../middlewares/passport');

/* GET users listing. */
// router.get('/', function(req, res, next) {
//   res.send('respond with a resource');
// });
router.post('/signup',UserController.signUp);
router.post('/signin',passport.authenticate('local',{session:false}),UserController.signin);
router.get('/secret',passport.authenticate('jwt',{session:false}),UserController.secret);
router.get('/',UserController.getUser);
router.get('/bin',UserController.getUserBin);
router.delete('/',UserController.deleteUser);
router.put('/restore',UserController.restoreUser);
router.put('/:userId',UserController.editAvatar);
router.post('/reset',UserController.resetPass);
router.post('/forgot/otp',UserController.sendOtp);
router.post('/forgot/newpass',UserController.forgotPass);

module.exports = router;
