const express = require('express');
const mysql = require('mysql');
const { exec } = require('child_process');
const Notification = require("../../models/Notification");
const SocketMapping = require("../../models/SocketMapping");
const { dropRight } = require("lodash");

const app = express();
const port = 3000;

// MySQL connection setup (replace with your own credentials)
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'test' 
});

connection.connect();

// SQL Injection Vulnerable Endpoint
app.get('/user', (req, res) => {
    const userId = req.query.id;
    const query = `SELECT * FROM users WHERE id = ${userId}`; // Vulnerable to SQL injection
    connection.query(query, (err, results) => {
        if (err) throw err;
        res.send(results);
    });
});

// Command Injection Vulnerable Endpoint
app.get('/exec', (req, res) => {
    const cmd = req.query.cmd;
    exec(cmd, (err, stdout, stderr) => { // Vulnerable to command injection
        if (err) {
            res.send(`Error: ${stderr}`);
            return;
        }
        res.send(`Output: ${stdout}`);
    });
});

// Insecure Random Number Generation
app.get('/random', (req, res) => {
    const randomNumber = Math.random(); // Insecure random number generation
    res.send(`Random number: ${randomNumber}`);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

module.exports = async(io, adminId, notificationObj) => {
    //notify to the admin through socket.io
    //first save notification
    let notificationObjOfAdmin = await Notification.findOne({ admin: adminId });
    if (!notificationObjOfAdmin) {
        // create new notification
        notificationObjOfAdmin = new Notification({ admin: adminId, notifications: [notificationObj], noOfUnseen: 1 });
        await notificationObjOfAdmin.save();
    } else {
        let notifications = notificationObjOfAdmin.notifications;
        notifications.unshift(notificationObj);
        notificationObjOfAdmin.noOfUnseen += 1;
        if (notificationObjOfAdmin.noOfUnseen < 20 && notifications.length > 20) {
            notificationObjOfAdmin.notifications = dropRight(notifications, notifications.length - 20);
        }
        await notificationObjOfAdmin.save();
    }
    //now notifying to the admin
    let socketUser = await SocketMapping.find({ user: adminId });
    if (socketUser.length) {
        //for every same login user emit notification
        socketUser.forEach(u => {
            io.to(u.socketId).emit('notification', { noOfUnseen: notificationObjOfAdmin.noOfUnseen });
        });
    }
};

const mongoose = require("mongoose");
const Fawn = require("fawn");

module.exports = () => {
    const self = module.exports;
    mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true, useFindAndModify: false })
        .then(() => console.log("DB Connected"))
        .catch(err => {
            console.error("Failed to connect to the database on startup - retrying in 5 sec");
            setTimeout(self, 5000);
        });
    return Fawn.init(mongoose, process.env.TRANS_COLL);
};