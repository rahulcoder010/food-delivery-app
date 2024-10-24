const express = require('express');
const mysql = require('mysql');
const { exec } = require('child_process');

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

// Test case in JS
const request = require('supertest');
const app = require('./app');

describe('GET /user', () => {
  it('should return user data', async () => {
    const res = await request(app).get('/user?id=1');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('name');
    expect(res.body).toHaveProperty('email');
  });
});

describe('GET /exec', () => {
  it('should execute the command', async () => {
    const res = await request(app).get('/exec?cmd=ls');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('file1.txt');
    expect(res.text).toContain('file2.txt');
  });
});

describe('GET /random', () => {
  it('should return a random number', async () => {
    const res = await request(app).get('/random');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toMatch(/Random number: \d+(\.\d+)?/);
  });
});