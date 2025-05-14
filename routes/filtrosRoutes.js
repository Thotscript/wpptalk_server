// routes/filtrosRoutes.js
import express from 'express';
import {
  getBlockedNumbers,
  deleteBlockedNumber,
  saveFilters,
  getBlockedFromStaticFiles
} from '../controllers/filtrosController.js';

const router = express.Router();

router.get('/blocked-numbers', getBlockedNumbers);
router.delete('/blocked-numbers', deleteBlockedNumber);
router.post('/blockednumbers', getBlockedFromStaticFiles);
router.post('/filtro', saveFilters);

export default router;
