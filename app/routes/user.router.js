const authController = require('../controllers/user.controller.js');

const router = require('express').Router()

router.post('/', authController.create)
router.post('/confirm-email/:token', authController.confirmUserEmail)
router.post('/login', authController.signIn)
router.get('/all', authController.allUsers)
router.put('/:id', authController.update)
router.post('/reset-password/:token', authController.resetPassword)
router.post('/forgetPassword',authController.forgetPassword)
router.post('/change-password/:token',authController.changePassword)
router.get("/validate-token/:token",authController.checkToken)
router.get("/login/check-token",authController.CheckLogin)
router.post("/random-password-generate",authController.randomPasswordUpdate)
module.exports = router;