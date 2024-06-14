"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const elasticemail_client_ts_axios_1 = require("@elasticemail/elasticemail-client-ts-axios");
const app = (0, express_1.default)();
const cors = require('cors');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const prisma = new client_1.PrismaClient();
const config = new elasticemail_client_ts_axios_1.Configuration({
    apiKey: process.env.ELASTIC_EMAIL_API_KEY
});
app.use(cors({ origin: '*' }));
const port = process.env.PORT;
app.post('/sendotp', bodyParser.json(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('send');
    try {
        let email = req.body.email;
        console.log('>>' + email);
        let randomnum = Math.floor((Math.random() * (9999 - 1000 + 1)) + 1000); //Generates random numbers between 100000 and 999999
        const emailsApi = new elasticemail_client_ts_axios_1.EmailsApi(config);
        const emailTransactionalMessageData = {
            Recipients: {
                To: [email] // maximum 50 recipients
            },
            Content: {
                Body: [
                    {
                        ContentType: "HTML",
                        Charset: "utf-8",
                        Content: "<h2><strong>" + (randomnum).toString() + "</strong></h2>"
                    } /*,
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
        const sendTransactionalEmails = (emailTransactionalMessageData) => {
            emailsApi.emailsTransactionalPost(emailTransactionalMessageData).then((response) => {
                //console.log('API called successfully.');
                //console.log(response.data);
                res.send({ msg: 'success', otp: randomnum, err: false });
            }).catch((error) => {
                console.error('Error occured in /sendotp @emailsTransactionalPost: ' + error);
                res.send({ err: true });
            });
        };
        sendTransactionalEmails(emailTransactionalMessageData);
    }
    catch (e) {
        console.log('Error occured in /sendotp: ' + e);
        res.send({ err: true });
    }
}));
app.post('/userdetailsexistencecheck', bodyParser.json(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let email = req.body.email;
        let matric = req.body.matric;
        let similardetail = yield prisma.user.findFirst({
            where: {
                OR: [
                    { email: email },
                    { matricnumber: matric }
                ]
            }
        });
        if (similardetail) {
            res.send({ err: false, msg: true });
        }
        else {
            res.send({ err: false, msg: false });
        }
    }
    catch (e) {
        console.log('Error occured @ /userdetailsexistencecheck: ' + e);
        res.send({ err: true });
    }
}));
app.post('/createuseraccount', bodyParser.json(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let fname = req.body.fname;
        let lname = req.body.lname;
        let email = req.body.email;
        let matric = req.body.matric.toUpperCase();
        let password = req.body.password;
        //Hash password
        let hashedpass = yield bcrypt.hash(password, 10);
        //Store in the mongodb
        let action = yield prisma.user.create({
            data: {
                firstname: fname,
                lastname: lname,
                email: email,
                matricnumber: matric,
                password: hashedpass,
                type: "user"
            }
        });
        let user = { id: action.id, firstname: action.firstname, lastname: action.lastname, email: action.email, matricnumber: action.matricnumber, type: action.type };
        res.send({ err: false, user: user });
    }
    catch (e) {
        console.log('Error occured @ /createaccount: ' + e);
        res.send({ err: true });
    }
}));
app.post('/userlogin', bodyParser.json(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let email = req.body.email;
        let password = req.body.password;
        let action = yield prisma.user.findFirst({
            where: {
                email: email
            }
        });
        if (action) {
            let valid = yield bcrypt.compare(password, action.password);
            if (valid) { //
                let user = { id: action.id, firstname: action.firstname, lastname: action.lastname, email: action.email, matricnumber: action.matricnumber, type: action.type };
                res.send({ err: false, msg: 'success', user: user });
            }
            else {
                res.send({ err: false, msg: 'invalid password', });
            }
        }
        else {
            res.send({ err: false, msg: 'no email' });
        }
    }
    catch (e) {
        console.log('Error occured @ /userlogin: ' + e);
        res.send({ err: true });
    }
}));
app.post('/checkuseremailexistence', bodyParser.json(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let email = req.body.email;
        let action = yield prisma.user.findFirst({
            where: {
                email: email
            }
        });
        if (action) { //Email exists
            res.send({ err: false, success: true });
        }
        else { //No such email exists
            res.send({ err: false, success: false });
        }
    }
    catch (e) {
        console.log('Error occured @ /checkuseremailexistence: ' + e);
        res.send({ err: true });
    }
}));
app.post('/checkdriveremailexistence', bodyParser.json(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let email = req.body.email;
        let action = yield prisma.driver.findFirst({
            where: {
                email: email
            }
        });
        if (action) { //Email exists
            res.send({ err: false, success: true });
        }
        else { //No such email exists
            res.send({ err: false, success: false });
        }
    }
    catch (e) {
        console.log('Error occured @ /checkdriveremailexistence: ' + e);
        res.send({ err: true });
    }
}));
app.post('/changeuserpassword', bodyParser.json(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let email = req.body.email;
        let password = req.body.password;
        let hashedpass = yield bcrypt.hash(password, 10);
        let user = yield prisma.user.findFirst({
            where: {
                email: email
            },
        });
        if (user) {
            let action = yield prisma.user.update({
                where: {
                    id: user.id
                },
                data: {
                    password: hashedpass
                }
            });
            if (action) {
                let user = { id: action.id, firstname: action.firstname, lastname: action.lastname, email: action.email, matricnumber: action.matricnumber };
                res.send({ err: false, user: user });
            }
            else {
                res.send({ err: true });
            }
        }
        else {
            res.send({ err: true });
        }
    }
    catch (e) {
        console.log('Error occured @ /changeuserpassword: ' + e);
        res.send({ err: true });
    }
}));
app.post('/checkandchangeuserpassword', bodyParser.json(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let user = req.body.user;
        let oldpass = req.body.oldpass;
        let newpass = req.body.newpass;
        //Check if the old pass is correct
        let action1 = yield prisma.user.findFirst({
            where: {
                email: user.email
            }
        });
        if (action1) {
            let validpass = yield bcrypt.compare(oldpass, action1.password);
            if (validpass) {
                //Change password
                let hashedpass = yield bcrypt.hash(newpass, 10);
                let action2 = yield prisma.user.update({
                    where: {
                        id: user.id
                    },
                    data: {
                        password: hashedpass
                    }
                });
                if (action2) {
                    res.send({ err: false, msg: 'success' });
                }
                else {
                    res.send({ err: true });
                }
            }
            else {
                res.send({ err: false, msg: 'wrong password', stuff: oldpass });
            }
        }
        else {
            res.send({ err: true });
        }
    }
    catch (e) {
        console.log('Error occured @ /checkandchangeuserpassword: ' + e);
        res.send({ err: true });
    }
}));
app.post('/driverdetailsexistencecheck', bodyParser.json(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let email = req.body.email;
        let similardriver = yield prisma.driver.findFirst({
            where: {
                email: email
            }
        });
        if (similardriver) {
            res.send({ err: false, msg: true });
        }
        else {
            res.send({ err: false, msg: false });
        }
    }
    catch (e) {
        console.log('Error occured @ /driverdetailsexistencecheck: ' + e);
        res.send({ err: true });
    }
}));
app.post('/createdriveraccount', bodyParser.json(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let { fullname, email, password, phone, cartype, carnumber } = req.body;
        console.log('>>' + password);
        let hashedpass = yield bcrypt.hash(password, 10);
        let action = yield prisma.driver.create({
            data: {
                fullname: fullname,
                email: email,
                phone: phone,
                password: hashedpass,
                carnumber: carnumber,
                cartype: cartype,
                type: "driver"
            }
        });
        if (action) {
            //Carry out function of sending driver details to the admin to verify
            let data = { id: action.id, fullname: action.fullname, email: action.email, phone: action.phone, cartype: action.cartype, carnumber: action.carnumber, type: action.type };
            res.send({ err: false, driver: data });
        }
        else {
            res.send({ err: true });
        }
    }
    catch (e) {
        console.log('Error occured @ /createdriveraccount: ' + e);
        res.send({ err: true });
    }
}));
app.post('/driverlogin', bodyParser.json(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let email = req.body.email;
        let password = req.body.password;
        let action = yield prisma.driver.findFirst({
            where: {
                email: email
            }
        });
        if (action) {
            let correct = yield bcrypt.compare(password, action.password);
            if (correct) {
                let data = { id: action.id, fullname: action.fullname, email: action.email, phone: action.phone, cartype: action.cartype, carnumber: action.carnumber, type: action.type };
                res.send({ err: false, correct: true, driver: data });
            }
            else {
                res.send({ err: false, correct: false });
            }
        }
        else {
            res.send({ err: true, message: 'No driver exists with this email' });
        }
    }
    catch (e) {
        console.log('Error occured @ /driverlogin: ' + e);
        res.send({ err: true });
    }
}));
app.post('/changedriverpassword', bodyParser.json(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let email = req.body.email;
        let password = req.body.password;
        let hashedpass = yield bcrypt.hash(password, 10);
        let action = yield prisma.driver.update({
            where: {
                email: email
            },
            data: {
                password: hashedpass
            }
        });
        if (action) {
            let data = { id: action.id, fullname: action.fullname, email: action.email, phone: action.phone, cartype: action.cartype, carnumber: action.carnumber };
            res.send({ err: false, driver: data });
        }
        else {
            res.send({ err: true });
        }
    }
    catch (e) {
        console.log('Error occured @ /changedriverpassword: ' + e);
        res.send({ err: true });
    }
}));
app.post('/adminlogin', bodyParser.json(), (req, res) => {
    try {
        let email = req.body.email;
        let pass = req.body.pass;
        if (email === process.env.ADMIN_EMAIL && pass === process.env.ADMIN_PASS) {
            res.send({ err: false, user: { type: 'admin', id: process.env.ADMIN_ID } });
        }
        else {
            res.send({ err: false, msg: 'Invalid credentials' });
        }
    }
    catch (e) {
        console.log('Error ococured @ /adminlogin: ' + e);
        res.send({ err: true });
    }
});
app.post('/getemissiondata', bodyParser.json(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        fetch('http://167.99.0.104:5000/get_data').then(response => {
            return response.json();
        }).then(response => {
            res.send({ err: false, data: response });
        });
    }
    catch (e) {
        console.log('Error ococured @ /adminlogin: ' + e);
        res.send({ err: true });
    }
}));
app.get('/', (req, res) => {
    res.send('You just reached the root dir');
});
app.get('/ping', (req, res) => {
    res.send('Hello, how may I help you?');
});
app.listen(port, () => {
    console.log(`Express server is listening at http://localhost:${port} 🚀`);
});
function sendemail(email, message) {
    try {
        console.log('>>' + email);
        const emailsApi = new elasticemail_client_ts_axios_1.EmailsApi(config);
        const emailTransactionalMessageData = {
            Recipients: {
                To: [email] // maximum 50 recipients
            },
            Content: {
                Body: [
                    {
                        ContentType: "HTML",
                        Charset: "utf-8",
                        Content: "<h2><strong>" + (message).toString() + "</strong></h2>"
                    } /*,
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
        const sendTransactionalEmails = (emailTransactionalMessageData) => {
            emailsApi.emailsTransactionalPost(emailTransactionalMessageData).then((response) => {
                //console.log('API called successfully.');
                //console.log(response.data);
                return 'success';
            }).catch((error) => {
                console.error('Error occured in sendemail() @emailsTransactionalPost: ' + error);
                return 'failed';
            });
        };
        sendTransactionalEmails(emailTransactionalMessageData);
    }
    catch (e) {
        console.log('Error occured in sendemail(): ' + e);
        return 'failed';
    }
}
//# sourceMappingURL=index.js.map