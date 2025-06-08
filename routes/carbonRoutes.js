const express = require('express');
const router = express.Router();
const ctl = require('../controllers/carbonController');

router.get('/db', ctl.getCO2Last10);
router.get('/db/simulate', ctl.getRealtimeSimulatedCO2);
router.get('/stream', ctl.getCO2Stream);
router.get('/download', ctl.downloadCO2);

module.exports = router;
