import 'dotenv/config'

import pool from './db/index.js';

import start from './api/app.js';

pool.query('SELECT NOW()', (err, res) => {
    if(err) {
      console.error('Error connecting to the database', err.stack);
    } else {
      console.log('Connected to the database:', res.rows);
      // databaseCheck();
    }
});

start();