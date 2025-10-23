import express from 'express'
import { protect } from '../middleware/authMiddleware';
import { createApiKey, deleteApiKey, getApiKey, verifyHashedKeyGetApiKey } from '../controllers/apikey.controller';

const router = express();

router.post('/create',protect ,createApiKey );
router.post('/verify', verifyHashedKeyGetApiKey );
router.get('/get', protect, getApiKey );
router.delete('/delete/:apiKeyId', protect, deleteApiKey );


export default router;