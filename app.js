// app.js
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import corsHeaders from './middlewares/corsHeaders.js';
import routes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(corsHeaders);

// QR codes e arquivos estáticos
app.use('/qrcodes', express.static(path.join(__dirname, 'public', 'qrcodes')));
app.use(express.static(path.join(__dirname, 'public')));

// Rotas
app.use('/auth', routes.auth);
app.use('/filtros', routes.filtros);

export default app;
