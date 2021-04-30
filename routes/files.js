const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const {v4: uuid4} = require('uuid');
const File = require('../model/file')

let storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueName =`${Date.now()} - ${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName); 
    }
}) 

let upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 * 100},
}).single('myfile');

router.post('/', (req, res)=>{
    //Store file
    upload(req, res, async(err)=>{
        //Validate Request
        if (!req.file) {
            return res.json({ error: "All fields are required!!"});
        }

        if(err){
            return res.status(500).send({error: err.message});
        }
            
    //Store into database
        const file = new File({
            filename: req.file.filename,
            uuid: uuid4(),
            path: req.file.path,
            size: req.file.size
        });
        
        const responce = await file.save();
        return res.json({file:`${process.env.APP_BASE_URL}/files/${responce.uuid}}`});
        
    })

router.post('/send', async(req, res)=>{
    // console.log(req.body);
    // return res.send({});
    const {uuid, emailTo, emailFrom} = req.body;
    //Validate request
    if (!uuid || !emailTo || !emailFrom) {
        return res.status(422).render({error: 'All fields are required to fill'});
    }

    const file = await File.findOne({uuid : uuid});
    if(file.sender){
        return res.status(422).render({error: 'Email already sent.'});
    }

    file.sender = emailFrom;
    file.receiver = emailTo;

    const responce = await file.save();

    //Send Email
    const sendMail = require('../services/emailService');

    sendMail({
        from: emailFrom,
        to: emailTo,
        subject: "freeShare file sharing",
        text: `${emailFrom} shared file with you.`,
        html: require('../services/emailTemplate')({
            emailFrom: emailFrom,
            downloadLink: `${process.env.APP_BASE_URL}/files/${file.uuid}`,
            size: parseInt(file.size)/1000 + 'KB',
            expires: '24 Hours'

        })

    })
    return res.send({success: true})
})
    

})

module.exports = router;    