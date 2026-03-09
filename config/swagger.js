import swaggerJsdoc from 'swagger-jsdoc';
import { PORT } from './env.js';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '.Soko API Documentation',
      version: '1.0.0',
      description: 'The official API documentation for the .Soko E-Commerce platform.',
      contact: {
        name: '.Soko Support',
        email: 'support@dotsoko.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}/api/v1`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.js', './controllers/*.js'], // Files containing annotations
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
