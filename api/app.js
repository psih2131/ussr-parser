
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import errorMiddleware from '../api/middleware/errorMiddleware.js';

import authRouter from './routes/authRouter.js';
import parserRouter from './routes/parserRouter.js';

function start() {
    const app = express();
    const port = process.env.PORT || 3001;

    app.use(express.json());
    app.use(cookieParser());

    if (process.env.CLIENT_URL && process.env.CLIENT_URL_2) {
        app.use(cors({
            credentials: true,
            origin: [process.env.CLIENT_URL, process.env.CLIENT_URL_2],
        }));
    }

    // admin API (cookie-сессия, без API key)
    app.use('/api/v1/admin', authRouter);
    app.use('/api/v1/admin/parser', parserRouter);

    app.use(errorMiddleware);

    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

export default start;