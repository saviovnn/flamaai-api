import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../db/app.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../db/schema';

export interface FireRiskResponse {
  risk_level: string;
  rag_explanation: string;
  daily_risks: {
    day: string;
    risk: number;
  }[];
  weekly_risk_mean: number;
}

export interface FireRisk {
  id: string;
  location_id: string;
  week_start_date: Date;
  week_end_date: Date;
  daily_risks: { day: string; risk: number }[];
  weekly_risk_mean: number;
  risk_level: string;
  rag_explanation: string;
  model_version: string;
}
export interface FireRiskWeatherData {
  id: string;
  fire_risk_id: string;
  weather_data_id: string;
}
@Injectable()
export class FireRiskService {
  private readonly logger = new Logger(FireRiskService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getFireRisk(
    location_id: string,
    start_date: Date,
    end_date: Date,
    weather_data_ids: string[],
    model_version: string,
  ): Promise<FireRiskResponse> {
    try {
      const location = await this.db
        .select()
        .from(schema.location)
        .where(eq(schema.location.id, location_id))
        .limit(1);

      if (location.length === 0) {
        throw new NotFoundException(
          `Location com id ${location_id} não encontrada no banco de dados.`,
        );
      }

      const daily_risks: { day: string; risk: number }[] = [];
      const start = new Date(start_date);
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        daily_risks.push({
          day: currentDate.toISOString().split('T')[0],
          risk: parseFloat((Math.random() * 0.98 + 0.01).toFixed(2)),
        });
      }

      const weekly_risk_mean = parseFloat(
        (daily_risks.reduce((acc, curr) => acc + curr.risk, 0) / 7).toFixed(2),
      );

      // Faixas alinhadas ao frontend (FireRiskCard): <20% baixo, 20-40% regular, 40-60% medio, 60-80% alto, >=80% critico
      const risk_level = (() => {
        if (weekly_risk_mean < 0.2) return 'baixo';
        if (weekly_risk_mean < 0.4) return 'regular';
        if (weekly_risk_mean < 0.6) return 'medio';
        if (weekly_risk_mean < 0.8) return 'alto';
        return 'critico';
      })();

      const rag_explanation =
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

      // Criar objeto FireRisk para salvar
      const fire_risk_id = crypto.randomUUID();
      const fireRiskToSave: FireRisk = {
        id: fire_risk_id,
        location_id: location_id,
        week_start_date: start_date,
        week_end_date: end_date,
        daily_risks: daily_risks.map((dailyRisk) => ({
          day: dailyRisk.day,
          risk: parseFloat(dailyRisk.risk.toFixed(2)),
        })),
        weekly_risk_mean,
        risk_level,
        rag_explanation,
        model_version,
      };

      await this.saveFireRisk(fireRiskToSave);

      await this.saveFireRiskWeatherData(fire_risk_id, weather_data_ids);

      return {
        weekly_risk_mean,
        risk_level,
        daily_risks: daily_risks.map((dailyRisk) => ({
          day: dailyRisk.day,
          risk: parseFloat(dailyRisk.risk.toFixed(2)),
        })),
        rag_explanation,
      };
    } catch (error) {
      this.logger.error(error);
      throw new Error('Erro ao buscar dados de risco de incêndio');
    }
  }

  async getFireRiskByWeatherDataIds(
    weather_data_ids: string[],
  ): Promise<(typeof schema.fireRisk.$inferSelect)[]> {
    if (weather_data_ids.length === 0) {
      return [];
    }

    const fireRiskWeatherData: (typeof schema.fireRiskWeatherData.$inferSelect)[] =
      await this.db
        .select()
        .from(schema.fireRiskWeatherData)
        .where(
          inArray(schema.fireRiskWeatherData.weatherDataId, weather_data_ids),
        );

    if (fireRiskWeatherData.length === 0) {
      return [];
    }

    const fire_risk_ids = [
      ...new Set(fireRiskWeatherData.map((item) => item.fireRiskId)),
    ];

    const fireRisks: (typeof schema.fireRisk.$inferSelect)[] = await this.db
      .select()
      .from(schema.fireRisk)
      .where(inArray(schema.fireRisk.id, fire_risk_ids));

    return fireRisks;
  }

  async saveFireRisk(fireRisk: FireRisk): Promise<FireRisk> {
    const [savedFireRisk] = await this.db
      .insert(schema.fireRisk)
      .values({
        id: fireRisk.id,
        locationId: fireRisk.location_id,
        week_start_date: fireRisk.week_start_date,
        week_end_date: fireRisk.week_end_date,
        dailyRisks: fireRisk.daily_risks,
        weekly_risk_mean: fireRisk.weekly_risk_mean,
        risk_level: fireRisk.risk_level,
        rag_explanation: fireRisk.rag_explanation,
        model_version: fireRisk.model_version,
      })
      .returning();

    return {
      id: savedFireRisk.id,
      location_id: savedFireRisk.locationId,
      week_start_date: savedFireRisk.week_start_date,
      week_end_date: savedFireRisk.week_end_date,
      daily_risks: savedFireRisk.dailyRisks as { day: string; risk: number }[],
      weekly_risk_mean: savedFireRisk.weekly_risk_mean,
      risk_level: savedFireRisk.risk_level,
      rag_explanation: savedFireRisk.rag_explanation,
      model_version: savedFireRisk.model_version,
    };
  }

  async saveFireRiskWeatherData(
    fire_risk_id: string,
    weather_data_ids: string[],
  ): Promise<FireRiskWeatherData[]> {
    if (weather_data_ids.length === 0) {
      return [];
    }

    const fireRiskWeatherDataToInsert = weather_data_ids.map(
      (weather_data_id) => ({
        id: crypto.randomUUID(),
        fireRiskId: fire_risk_id,
        weatherDataId: weather_data_id,
      }),
    );

    await this.db
      .insert(schema.fireRiskWeatherData)
      .values(fireRiskWeatherDataToInsert);

    return fireRiskWeatherDataToInsert.map((item) => ({
      id: item.id,
      fire_risk_id: item.fireRiskId,
      weather_data_id: item.weatherDataId,
    }));
  }
}
