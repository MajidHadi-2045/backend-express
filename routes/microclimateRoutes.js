const express = require('express');
const router = express.Router();
const ctl = require('../controllers/microclimateController');

router.get('/db', ctl.getMicroLast10);
router.get('/db/simulate', ctl.getRealtimeSimulatedMicro);
router.get('/stream', ctl.getMicroStream);
router.get('/download', ctl.downloadMicro);
router.get('/download-range', ctl.downloadMicroRange);

module.exports = router;
