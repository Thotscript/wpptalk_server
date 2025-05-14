// routes/authRoutes.js
import express from 'express';
import {
  loginSession,
  logoutSession,
  getStatusDevices,
  getStatusFinder,
  getPreferenceNumbers
} from '../controllers/authController.js';

const router = express.Router();

router.post('/login', loginSession);
router.get('/logout', logoutSession);
router.get('/statusdevices', getStatusDevices);
router.get('/statusfinder', getStatusFinder);
router.get('/preference-numbers', getPreferenceNumbers);

export default router;
