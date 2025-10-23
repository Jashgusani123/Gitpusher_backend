import express from 'express'
import { addUsage, daysWiseAnalytics, getActivityLogs, getAnalytics, successVsFailure } from '../controllers/usage.controller';
import { protect } from '../middleware/authMiddleware';

const router = express();

router.post('/add',addUsage);
router.get('/analytics', protect, getAnalytics);
router.get('/activity-logs', protect, getActivityLogs);
router.get('/daywise-analytics', protect, daysWiseAnalytics);
router.get('/success-failure', protect, successVsFailure);


export default router;