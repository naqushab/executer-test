const express = require('express');
router = express.Router();
core = require('../models/functions');

router.post('/', (req, res) => {
    dataset = {
        "processor":core.processor,
        "free":core.freeram,
        "OS":core.os
    };
    res.send(dataset);

});

router.get('/',(req,res)=>{
    dataset={
        "system resources": "/systemres",
        "status of servers":"/systemres/status"
    }
    res.send(dataset);
});

router.get('/status',(req,res)=>{
    
});

module.exports = router;
