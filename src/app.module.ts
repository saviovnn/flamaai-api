import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './db/app.module';
import { GeocodingModule } from './geocoding/geocoding.module';

@Module({
  imports: [
    // Carrega as variáveis de ambiente (.env)
    ConfigModule.forRoot({ isGlobal: true }),

    // Conexão com o Banco (Postgres + Drizzle)
    DatabaseModule,

    // Outros módulos
    AuthModule,
    GeocodingModule,
  ],
})
export class AppModule {}
