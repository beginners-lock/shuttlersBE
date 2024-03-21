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

app.post('/login', bodyParser.json(), async (req, res) => {
    try{
        let email = req.body.email;
        let password = req.body.password;

        let action = await prisma.user.findFirst({
            where: {
                email: email
            }
        });

        if(action){
            let valid = await bcrypt.compare(password, action.password);
            if(valid){//
                let user = {id: action.id, firstname: action.firstname, lastname: action.lastname, email: action.email, matricnumber: action.matricnumber}
                res.send({err:false, msg:'success', user: user});
            }else{
                res.send({err:false, msg:'invalid password',});
            }
        }else{
            res.send({err:false, msg:'no email'});
        }
    }catch(e){
        console.log('Error occured @ /login: '+e);
        res.send({err:true});
    }
});

app.post('/checkemailexistence', bodyParser.json(), async (req, res) => {
    try{
        let email = req.body.email;

        let action = await prisma.user.findFirst({
            where: {
                email: email
            }
        });

        if(action){//Email exists
            res.send({err:false, success:true})
        }else{//No such email exists
            res.send({err:false, success:false});
        }
    }catch(e){
        console.log('Error occured @ /checkemailexistence: '+e);
        res.send({err:true});
    }
});

app.post('/changepassword', bodyParser.json(), async (req, res) => {
    try{
        let email = req.body.email;
        let password = req.body.password;

        let hashedpass = await bcrypt.hash(password, 10);
        let user = await prisma.user.findFirst({
            where: {
                email: email
            },
        });

        if(user){
            let action = await prisma.user.update({
                where: {
                    id: user.id
                },
                data: {
                    password: hashedpass
                }
            });

            if(action){
                let user = {id: action.id, firstname: action.firstname, lastname: action.lastname, email: action.email, matricnumber: action.matricnumber};

                res.send({err: false, user: user});
            }else{
                res.send({err: true});
            }
        }else{
            res.send({err:true});
        }
    }catch(e){
        console.log('Error occured @ /changepassword: '+e);
        res.send({err:true});
    }
});

app.post('/checkandchangepassword', bodyParser.json(), async (req, res) => {
    try{
        let user = req.body.user;
        let oldpass = req.body.oldpass;
        let newpass = req.body.newpass;

        //Check if the old pass is correct
        let action1 = await prisma.user.findFirst({
            where: {
                email: user.email
            }
        });

        if(action1){
            let validpass = await bcrypt.compare(oldpass, action1.password);

            if(validpass){
                //Change password
                let hashedpass = await bcrypt.hash(newpass, 10);

                let action2 = await prisma.user.update({
                    where: {
                        id: user.id
                    },
                    data: {
                        password: hashedpass
                    }
                });

                if(action2){
                    res.send({err: false, msg: 'success'});
                }else{
                    res.send({err: true});
                }
            }else{
                res.send({err:false, msg:'wrong password', stuff:oldpass});
            }
        }else{
            res.send({err: true});
        }
    }catch(e){
        console.log('Error occured @ /checkandchangepassword: '+e);
        res.send({err:true});
    }
});

app.listen(port, () => {
    console.log(`Express server is listening at http://localhost:${port} 🚀`);
});