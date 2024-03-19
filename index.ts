import express from 'express';
import { PrismaClient } from '@prisma/client';
import { Configuration, EmailsApi, EmailTransactionalMessageData } from '@elasticemail/elasticemail-client-ts-axios';

const app = express();
const cors = require('cors');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');

const prisma = new PrismaClient();

const config = new Configuration({
    apiKey: process.env.ELASTIC_EMAIL_API_KEY
});

app.use( cors({ origin: '*' }) );
const port = 3001;

app.post('/sendotp', bodyParser.json(), async (req, res) => {
    try{
        let email: string = req.body.email;
        console.log('>>'+email);
        let randomnum = Math.floor((Math.random() * (9999-1000+1))+1000) //Generates random numbers between 100000 and 999999

        const emailsApi = new EmailsApi(config);

        const emailTransactionalMessageData: EmailTransactionalMessageData = {
            Recipients: { 
                To: [email] // maximum 50 recipients
            },
            Content: {
                Body: [
                    {
                        ContentType: "HTML",
                        Charset: "utf-8",
                        Content: "<h2><strong>"+(randomnum).toString()+"</strong></h2>"
                    }/*,
                    {
                        ContentType: "PlainText",
                        Charset: "utf-8",
                        Content: (randomnum).toString()
                    }*/
                ],
                From: "shuttlers.mail@gmail.com",
                Subject: "Shuttlers Email Verification [OTP]"
            }
        };

        const sendTransactionalEmails = (emailTransactionalMessageData: EmailTransactionalMessageData): void => {
            emailsApi.emailsTransactionalPost(emailTransactionalMessageData).then((response) => {
                //console.log('API called successfully.');
                //console.log(response.data);
                res.send({msg:'success', otp: randomnum, err: false});
            }).catch((error) => {
                console.error('Error occured in /sendotp @emailsTransactionalPost: '+error);
                res.send({err: true});
            });
        };

        sendTransactionalEmails(emailTransactionalMessageData);
        
    }catch(e){
        console.log('Error occured in /sendotp: '+e);
        res.send({err: true});
    }
});

app.post('/userdetailsexistencecheck', bodyParser.json(), async (req, res) => {
    try{
        let email = req.body.email;
        let matric = req.body.matric;

        let similardetail = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email },
                    { matricnumber: matric }
                ]
            }
        });

        if(similardetail){
            res.send({err: false, msg: true});    
        }else{
            res.send({err: false, msg: false})
        }
    }catch(e){
        console.log('Error occured @ /userdetailsexistencecheck: '+e);
        res.send({err:true});
    }
});

app.post('/createaccount', bodyParser.json(), async (req, res) => {
    try{
        let fname = req.body.fname;         let lname = req.body.lname;
        let email = req.body.email;         let matric = req.body.matric.toUpperCase();
        let password = req.body.password;

        //Hash password
        let hashedpass = await bcrypt.hash(password, 10);

        //Store in the mongodb
        let action = await prisma.user.create({
            data: {
                firstname: fname,
                lastname: lname,
                email: email,
                matricnumber: matric,
                password: hashedpass
            }
        });

        let user = {id: action.id, firstname: action.firstname, lastname: action.lastname, email: action.email, matricnumber: action.matricnumber}
        res.send({err:false, user: user});
    }catch(e){
        console.log('Error occured @ /createaccount: '+e);
        res.send({err:true});
    }
});

app.post('/signin', bodyParser.json(), async (req, res) => {

});

app.post('/forgotpassword', bodyParser.json(), async (req, res) => {

});

app.listen(port, () => {
    console.log(`Express server is listening at http://localhost:${port} 🚀`);
});