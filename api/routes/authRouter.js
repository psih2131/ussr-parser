import express from 'express';
import UserController from '../controllers/UserController.js';

const router = express.Router();
const userController = new UserController();

// auth
router.post('/login', userController.login.bind(userController));
router.post('/logout', userController.logout.bind(userController));
router.get('/me', userController.me.bind(userController));

router.post('/register', userController.register.bind(userController));

export default router;
