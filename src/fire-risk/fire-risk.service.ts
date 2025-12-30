import { Inject, Injectable, Logger } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../db/app.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';

export interface FireRiskRequest {
  lat: number;
  lng: number;
  startDate: Date;
  endDate: Date;
  weatherDataIds: string[];
  modelVersion: string;
}

export interface FireRiskResponse {
  riskLevel: string;
  ragExplanation: string;
  dailyRisks: {
    day: string;
    risk: number;
  }[];
  weeklyRiskMean: number;
}
@Injectable()
export class FireRiskService {
  private readonly logger = new Logger(FireRiskService.name);
  // Identificação do usuário para não ser bloqueado pelo OSM
  private readonly USER_AGENT = process.env.USER_AGENT;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getFireRisk(
    lat: number,
    lng: number,
    startDate: Date,
    endDate: Date,
    weatherDataIds: string[],
    modelVersion: string,
  ): Promise<FireRiskResponse> {
    try {
      console.log('weatherDataIds', weatherDataIds);
      console.log('modelVersion', modelVersion);
      console.log('startDate', startDate);
      console.log('endDate', endDate);
      console.log('lat', lat);
      console.log('lng', lng);
      const dailyRisks: { day: string; risk: number }[] = [];
      for (let i = 0; i < 7; i++) {
        dailyRisks.push({
          day: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          risk: parseFloat((Math.random() * 0.98 + 0.01).toFixed(2)),
        });
      }
      return await Promise.resolve({
        weeklyRiskMean: parseFloat(
          (dailyRisks.reduce((acc, curr) => acc + curr.risk, 0) / 7).toFixed(2),
        ),
        riskLevel: (() => {
          const meanRisk =
            dailyRisks.reduce((acc, curr) => acc + curr.risk, 0) / 7;
          if (meanRisk <= 0.3) {
            return 'low';
          } else if (meanRisk > 0.3 && meanRisk < 0.8) {
            return 'regular';
          } else {
            return 'high';
          }
        })(),
        dailyRisks: dailyRisks.map((dailyRisk) => ({
          day: dailyRisk.day,
          risk: parseFloat(dailyRisk.risk.toFixed(2)),
        })),
        ragExplanation:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      });
    } catch (error) {
      this.logger.error(error);
      throw new Error('Erro ao buscar dados de risco de incêndio');
    }
  }
}
