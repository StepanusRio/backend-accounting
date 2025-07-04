// src/config/configuration.ts
import * as Joi from 'joi'; // npm install joi

export interface EnvVariables {
  DATABASE_URL: string;
  JWT_SECRET: string;
  // Tambahkan variabel lingkungan lain yang Anda butuhkan
}

export const validationSchema = Joi.object<EnvVariables>({
  DATABASE_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(32).required().messages({ // Minimal 32 karakter agar lebih aman
    'string.empty': 'JWT_SECRET cannot be empty',
    'string.min': 'JWT_SECRET should have a minimum length of {#limit}',
    'any.required': 'JWT_SECRET is required',
  }),
});

export const config = () => ({
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
});