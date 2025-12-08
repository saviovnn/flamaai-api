// src/auth/auth.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Db } from 'mongodb';

@Injectable()
export class AuthService implements OnModuleInit {
  public auth!: ReturnType<typeof betterAuth>; // Instância do Better Auth

  constructor(@InjectConnection() private readonly connection: Connection) {}

  onModuleInit() {
    // Acessa o driver nativo do MongoDB através do Mongoose
    const db = this.connection.db;
    console.log('🔥 Conexão com MongoDB estabelecida:', db);
    this.auth = betterAuth({
      database: mongodbAdapter(db as Db), // Adaptador MongoDB
      baseURL: process.env.BASE_URL as string, // URL base do backend
      basePath: process.env.BASE_PATH as string, // Caminho base das rotas de autenticação
      emailAndPassword: {
        enabled: true, // Habilita login com email/senha
      },
      // Adicione provedores sociais aqui (Google, GitHub) se precisar
      socialProviders: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
      },
      trustedOrigins: ['http://localhost:3000', 'http://localhost:5173'], // URLs do frontend
    });
    console.log('🔥 Servidor Better Auth inicializado:', this.auth);
  }
}
