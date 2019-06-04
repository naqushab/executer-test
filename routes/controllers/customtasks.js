core = require('../models/functions');
const express = require('express');
router = express.Router();
const { exec } = require('child_process');


router.post('/', (req, res) => {
    exec(req.body.query, (error, stdout, stderr) => {
        if (error) {
            core.apilog('custom',0,req.originalUrl,Date.now(),req.body);
            res.send(stderr);
        }
        else if (!error) {
            res.send(stdout);
            core.apilog('custom',1,req.originalUrl,Date.now(),req.body);
        }
    });

});

router.get('/',(req,res)=>{
    res.send({"Post to":"/custom"});
});

module.exports = router;