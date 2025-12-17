import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './db/app.module';
import { GeocodingModule } from './geocoding/geocoding.module';
import { MapModule } from './map/map.module';
import { WeatherModule } from './weather/weather.module';

@Module({
  imports: [
    // Carrega as variáveis de ambiente (.env)
    ConfigModule.forRoot({ isGlobal: true }),

    // Conexão com o Banco (Postgres + Drizzle)
    DatabaseModule,

    // Outros módulos
    AuthModule,
    GeocodingModule,
    MapModule,
    WeatherModule,
  ],
})
export class AppModule {}
