
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import router from './src/router.js';
import openApiDocument from './src/docs/openapi.js';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
     return res.status(200).json({
          message: 'Server is running'
     });
});

app.get('/api-docs.json', (req, res) => {
     return res.status(200).json(openApiDocument);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use('/', router);

app.use((error, req, res, next) => {
     if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
          return res.status(400).json({
               message: 'Invalid JSON request body'
          });
     }

     return next(error);
});

export default app;
