import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../db/app.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../db/schema';

export interface FireRiskResponse {
  riskLevel: string;
  ragExplanation: string;
  dailyRisks: {
    day: string;
    risk: number;
  }[];
  weeklyRiskMean: number;
}

export interface FireRisk {
  id: string;
  locationId: string;
  weekStartDate: Date;
  weekEndDate: Date;
  dailyRisks: { day: string; risk: number }[];
  weeklyRiskMean: number;
  riskLevel: string;
  ragExplanation: string;
  modelVersion: string;
}
export interface FireRiskWeatherData {
  id: string;
  fireRiskId: string;
  weatherDataId: string;
}
@Injectable()
export class FireRiskService {
  private readonly logger = new Logger(FireRiskService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getFireRisk(
    locationId: string,
    startDate: Date,
    endDate: Date,
    weatherDataIds: string[],
    modelVersion: string,
  ): Promise<FireRiskResponse> {
    try {
      // Buscar location pelo locationId
      const location = await this.db
        .select()
        .from(schema.location)
        .where(eq(schema.location.id, locationId))
        .limit(1);

      if (location.length === 0) {
        throw new NotFoundException(
          `Location com id ${locationId} não encontrada no banco de dados.`,
        );
      }

      // Gerar dados mockados de risco
      const dailyRisks: { day: string; risk: number }[] = [];
      const start = new Date(startDate);
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        dailyRisks.push({
          day: currentDate.toISOString().split('T')[0],
          risk: parseFloat((Math.random() * 0.98 + 0.01).toFixed(2)),
        });
      }

      const weeklyRiskMean = parseFloat(
        (dailyRisks.reduce((acc, curr) => acc + curr.risk, 0) / 7).toFixed(2),
      );

      const riskLevel = (() => {
        if (weeklyRiskMean <= 0.3) {
          return 'low';
        } else if (weeklyRiskMean > 0.3 && weeklyRiskMean < 0.8) {
          return 'regular';
        } else {
          return 'high';
        }
      })();

      const ragExplanation =
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

      // Criar objeto FireRisk para salvar
      const fireRiskId = crypto.randomUUID();
      const fireRiskToSave: FireRisk = {
        id: fireRiskId,
        locationId: locationId,
        weekStartDate: startDate,
        weekEndDate: endDate,
        dailyRisks: dailyRisks.map((dailyRisk) => ({
          day: dailyRisk.day,
          risk: parseFloat(dailyRisk.risk.toFixed(2)),
        })),
        weeklyRiskMean,
        riskLevel,
        ragExplanation,
        modelVersion,
      };

      // Salvar no banco
      await this.saveFireRisk(fireRiskToSave);

      // Salvar relacionamento com weather data
      await this.saveFireRiskWeatherData(fireRiskId, weatherDataIds);

      // Retornar resposta
      return {
        weeklyRiskMean,
        riskLevel,
        dailyRisks: dailyRisks.map((dailyRisk) => ({
          day: dailyRisk.day,
          risk: parseFloat(dailyRisk.risk.toFixed(2)),
        })),
        ragExplanation,
      };
    } catch (error) {
      this.logger.error(error);
      throw new Error('Erro ao buscar dados de risco de incêndio');
    }
  }

  async getFireRiskByWeatherDataIds(
    weatherDataIds: string[],
  ): Promise<(typeof schema.fireRisk.$inferSelect)[]> {
    if (weatherDataIds.length === 0) {
      return [];
    }

    // Buscar todos os registros de fireRiskWeatherData para os weatherDataIds fornecidos
    const fireRiskWeatherData: (typeof schema.fireRiskWeatherData.$inferSelect)[] =
      await this.db
        .select()
        .from(schema.fireRiskWeatherData)
        .where(
          inArray(schema.fireRiskWeatherData.weatherDataId, weatherDataIds),
        );

    if (fireRiskWeatherData.length === 0) {
      return [];
    }

    // Extrair fireRiskIds únicos
    const fireRiskIds = [
      ...new Set(fireRiskWeatherData.map((item) => item.fireRiskId)),
    ];

    // Buscar todos os fireRisks correspondentes
    const fireRisks: (typeof schema.fireRisk.$inferSelect)[] = await this.db
      .select()
      .from(schema.fireRisk)
      .where(inArray(schema.fireRisk.id, fireRiskIds));

    return fireRisks;
  }

  async saveFireRisk(fireRisk: FireRisk): Promise<FireRisk> {
    const [savedFireRisk] = await this.db
      .insert(schema.fireRisk)
      .values({
        id: fireRisk.id,
        locationId: fireRisk.locationId,
        week_start_date: fireRisk.weekStartDate,
        week_end_date: fireRisk.weekEndDate,
        dailyRisks: fireRisk.dailyRisks,
        weekly_risk_mean: fireRisk.weeklyRiskMean,
        risk_level: fireRisk.riskLevel,
        rag_explanation: fireRisk.ragExplanation,
        model_version: fireRisk.modelVersion,
      })
      .returning();

    return {
      id: savedFireRisk.id,
      locationId: savedFireRisk.locationId,
      weekStartDate: savedFireRisk.week_start_date,
      weekEndDate: savedFireRisk.week_end_date,
      dailyRisks: savedFireRisk.dailyRisks as { day: string; risk: number }[],
      weeklyRiskMean: savedFireRisk.weekly_risk_mean,
      riskLevel: savedFireRisk.risk_level,
      ragExplanation: savedFireRisk.rag_explanation,
      modelVersion: savedFireRisk.model_version,
    };
  }

  async saveFireRiskWeatherData(
    fireRiskId: string,
    weatherDataIds: string[],
  ): Promise<FireRiskWeatherData[]> {
    if (weatherDataIds.length === 0) {
      return [];
    }

    const fireRiskWeatherDataToInsert = weatherDataIds.map((weatherDataId) => ({
      id: crypto.randomUUID(),
      fireRiskId,
      weatherDataId: weatherDataId,
    }));

    await this.db
      .insert(schema.fireRiskWeatherData)
      .values(fireRiskWeatherDataToInsert);

    return fireRiskWeatherDataToInsert;
  }
}
