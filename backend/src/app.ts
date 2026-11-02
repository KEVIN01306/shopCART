import express from 'express';
import cors from 'cors';
import routes from './routes/index.routes.js';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:5601',
        'http://localhost:5601',
        'http://localhost:5173',
        'http://localhost:4001',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-guest-token', 'X-Guest-Token']
}));
app.set('trust proxy', true);
// Increase body size limits to accept base64 image payloads (adjust if needed)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

app.use('/api', routes);

export default app;
