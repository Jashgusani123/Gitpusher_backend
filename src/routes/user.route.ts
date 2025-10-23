import express from 'express'
import { createUser, getUser, loginUser, logoutUser } from '../controllers/user.controller';
import { protect } from '../middleware/authMiddleware';

const router = express();

// create user route
router.post('/create', createUser);

// login user route
router.post('/login', loginUser);

// get user route 
router.get('/get', protect, getUser);

// logout user route 
router.get('/logout', protect, logoutUser);


export default router;