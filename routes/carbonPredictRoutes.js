const express = require('express');
const router = express.Router();
const ctl = require('../controllers/carbonPredictController');  // Pastikan import controller sudah benar

// Simulasi tolerant
router.get('/db/simulate', ctl.getSimulatedCO2);

// 10 data terakhir prediksi CO2
router.get('/db', ctl.getCO2Last10);

// Prediksi live dari backend Python
router.get('/stream', ctl.getLivePrediction);

// Download data
router.get('/download', ctl.downloadPredict);

// Download by range date
router.get('/download-range', ctl.downloadPredictRange);

module.exports = router;
