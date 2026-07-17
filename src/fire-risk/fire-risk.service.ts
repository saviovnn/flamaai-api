import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DATABASE_CONNECTION } from '../db/app.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, inArray } from 'drizzle-orm';
import axios from 'axios';
import * as schema from '../db/schema';

export interface FireRiskResponse {
  risk_level: string;
  rag_explanation: string;
  daily_risks: {
    day: string;
    risk: number;
  }[];
  weekly_risk_mean: number;
  model_version?: string;
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

interface ModelDailyWeather {
  time: string;
  temperature_2m_max?: number;
  temperature_2m_min?: number;
  temperature_2m_mean?: number;
  relative_humidity_2m_mean?: number;
  precipitation_sum?: number;
  rain_sum?: number;
  windspeed_10m_max?: number;
  windgusts_10m_max?: number;
  et0_fao_evapotranspiration?: number;
  uv_index_max?: number;
}

interface ModelPredictResponse {
  model_version: string;
  daily_risks: { day: string; risk: number }[];
  weekly_risk_mean: number;
}

@Injectable()
export class FireRiskService {
  private readonly logger = new Logger(FireRiskService.name);
  private readonly modelUrl =
    process.env.MODEL_URL || 'http://localhost:8001';
  private readonly ragUrl = process.env.RAG_URL || 'http://localhost:8000';

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getFireRisk(
    location_id: string,
    start_date: Date,
    end_date: Date,
    weather_data_ids: string[],
    model_version?: string,
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

      const loc = location[0];
      const { daily, historico } = await this.buildDailyPayload(
        weather_data_ids,
        start_date,
      );

      if (daily.length === 0) {
        throw new ServiceUnavailableException(
          'Não há dados meteorológicos futuros para calcular o risco de fogo.',
        );
      }

      const prediction = await this.predictWithModel({
        lat: Number(loc.lat),
        lon: Number(loc.lng),
        municipio_id: Number(loc.cdMun),
        daily,
        historico,
      });

      const daily_risks = prediction.daily_risks.map((d) => ({
        day: d.day,
        risk: parseFloat(Number(d.risk).toFixed(2)),
      }));

      const weekly_risk_mean = parseFloat(
        Number(prediction.weekly_risk_mean).toFixed(2),
      );

      const risk_level = this.mapRiskLevel(weekly_risk_mean);
      const resolvedModelVersion =
        prediction.model_version || model_version || 'v8-xgb';

      const rag_explanation = await this.fetchRagExplanation({
        locationName: loc.name,
        state: loc.state,
        risk_level,
        weekly_risk_mean,
        daily_risks,
        daily,
        historico,
      });

      const fire_risk_id = crypto.randomUUID();
      const fireRiskToSave: FireRisk = {
        id: fire_risk_id,
        location_id: location_id,
        week_start_date: start_date,
        week_end_date: end_date,
        daily_risks,
        weekly_risk_mean,
        risk_level,
        rag_explanation,
        model_version: resolvedModelVersion,
      };

      await this.saveFireRisk(fireRiskToSave);
      await this.saveFireRiskWeatherData(fire_risk_id, weather_data_ids);

      return {
        weekly_risk_mean,
        risk_level,
        daily_risks,
        rag_explanation,
        model_version: resolvedModelVersion,
      };
    } catch (error) {
      this.logger.error(error);
      if (
        error instanceof NotFoundException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }
      throw new Error('Erro ao buscar dados de risco de incêndio');
    }
  }

  private mapRiskLevel(weekly_risk_mean: number): string {
    // Faixas alinhadas ao frontend: <20% minimo, 20-40% baixo, 40-60% medio, 60-80% alto, >=80% critico
    if (weekly_risk_mean < 0.2) return 'minimo';
    if (weekly_risk_mean < 0.4) return 'baixo';
    if (weekly_risk_mean < 0.6) return 'medio';
    if (weekly_risk_mean < 0.8) return 'alto';
    return 'critico';
  }

  private async buildDailyPayload(
    weather_data_ids: string[],
    start_date: Date,
  ): Promise<{ daily: ModelDailyWeather[]; historico: ModelDailyWeather[] }> {
    if (weather_data_ids.length === 0) {
      return { daily: [], historico: [] };
    }

    const rows = await this.db
      .select()
      .from(schema.weatherData)
      .where(inArray(schema.weatherData.id, weather_data_ids));

    const startKey = [
      start_date.getFullYear(),
      String(start_date.getMonth() + 1).padStart(2, '0'),
      String(start_date.getDate()).padStart(2, '0'),
    ].join('-');

    const toDaily = (
      row: typeof schema.weatherData.$inferSelect,
    ): ModelDailyWeather => {
      // Datas vindas de YYYY-MM-DD são gravadas como UTC midnight — usar UTC.
      let raw: string;
      if (row.time instanceof Date) {
        raw = [
          row.time.getUTCFullYear(),
          String(row.time.getUTCMonth() + 1).padStart(2, '0'),
          String(row.time.getUTCDate()).padStart(2, '0'),
        ].join('-');
      } else {
        raw = String(row.time).split('T')[0];
      }
      return {
        time: raw,
        temperature_2m_max: row.temperature_2m_max,
        temperature_2m_min: row.temperature_2m_min,
        temperature_2m_mean: row.temperature_2m_mean,
        relative_humidity_2m_mean: row.relative_humidity_2m_mean,
        precipitation_sum: row.precipitation_sum,
        rain_sum: row.rain_sum ?? row.precipitation_sum,
        windspeed_10m_max: row.windspeed_10m_max,
        windgusts_10m_max: row.windgusts_10m_max,
        et0_fao_evapotranspiration: row.et0_fao_evapotranspiration,
        uv_index_max: row.uv_index_max,
      };
    };

    const mapped = rows.map(toDaily).sort((a, b) => a.time.localeCompare(b.time));
    const daily = mapped.filter((d) => d.time >= startKey);
    const historico = mapped.filter((d) => d.time < startKey);

    // Se tudo veio como "futuro" (ids só do forecast), usa os 7 primeiros como daily
    if (daily.length === 0 && mapped.length > 0) {
      return {
        daily: mapped.slice(-7),
        historico: mapped.slice(0, -7),
      };
    }

    return { daily, historico };
  }

  private async predictWithModel(input: {
    lat: number;
    lon: number;
    municipio_id: number;
    daily: ModelDailyWeather[];
    historico: ModelDailyWeather[];
  }): Promise<ModelPredictResponse> {
    try {
      const { data } = await axios.post<ModelPredictResponse>(
        `${this.modelUrl}/predict`,
        {
          lat: input.lat,
          lon: input.lon,
          municipio_id: input.municipio_id,
          daily: input.daily,
          historico: input.historico.length > 0 ? input.historico : undefined,
          buscar_historico: input.historico.length === 0,
        },
        { timeout: 90_000 },
      );
      return data;
    } catch (error) {
      this.logger.error(
        `Falha ao consultar modelo em ${this.modelUrl}/predict`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Serviço de modelo de risco de fogo indisponível',
      );
    }
  }

  private summarizeWeather(
    days: ModelDailyWeather[],
  ): {
    n: number;
    temp_mean: number | null;
    humidity_mean: number | null;
    precip_total: number | null;
    wind_max_mean: number | null;
    uv_max_mean: number | null;
    et0_mean: number | null;
  } {
    if (days.length === 0) {
      return {
        n: 0,
        temp_mean: null,
        humidity_mean: null,
        precip_total: null,
        wind_max_mean: null,
        uv_max_mean: null,
        et0_mean: null,
      };
    }
    const avg = (vals: number[]) =>
      vals.reduce((a, b) => a + b, 0) / vals.length;
    const num = (v: number | undefined) =>
      typeof v === 'number' && !Number.isNaN(v) ? v : 0;
    return {
      n: days.length,
      temp_mean: parseFloat(
        avg(days.map((d) => num(d.temperature_2m_mean))).toFixed(1),
      ),
      humidity_mean: parseFloat(
        avg(days.map((d) => num(d.relative_humidity_2m_mean))).toFixed(1),
      ),
      precip_total: parseFloat(
        days.map((d) => num(d.precipitation_sum)).reduce((a, b) => a + b, 0).toFixed(1),
      ),
      wind_max_mean: parseFloat(
        avg(days.map((d) => num(d.windspeed_10m_max))).toFixed(1),
      ),
      uv_max_mean: parseFloat(
        avg(days.map((d) => num(d.uv_index_max))).toFixed(1),
      ),
      et0_mean: parseFloat(
        avg(days.map((d) => num(d.et0_fao_evapotranspiration))).toFixed(1),
      ),
    };
  }

  private formatWeatherBlock(
    label: string,
    days: ModelDailyWeather[],
  ): string {
    const s = this.summarizeWeather(days);
    if (s.n === 0) return `${label}: (sem dados)`;
    const dailyLines = days
      .map(
        (d) =>
          `  ${d.time}: Tméd=${d.temperature_2m_mean ?? '—'}°C UR=${d.relative_humidity_2m_mean ?? '—'}% ` +
          `chuva=${d.precipitation_sum ?? '—'}mm vento=${d.windspeed_10m_max ?? '—'}km/h UV=${d.uv_index_max ?? '—'}`,
      )
      .join('\n');
    return (
      `${label} (${s.n} dias) — médias: Tméd=${s.temp_mean}°C UR=${s.humidity_mean}% ` +
      `chuva_total=${s.precip_total}mm vento_máx_méd=${s.wind_max_mean}km/h UV_méd=${s.uv_max_mean} ET0_méd=${s.et0_mean}\n` +
      dailyLines
    );
  }

  private async fetchRagExplanation(ctx: {
    locationName: string;
    state: string | null;
    risk_level: string;
    weekly_risk_mean: number;
    daily_risks: { day: string; risk: number }[];
    daily: ModelDailyWeather[];
    historico: ModelDailyWeather[];
  }): Promise<string> {
    const dailySummary = ctx.daily_risks
      .map((d) => `${d.day}: ${(d.risk * 100).toFixed(0)}%`)
      .join(', ');

    const climaFuturo = this.formatWeatherBlock(
      'Clima previsto (Open-Meteo, próximos dias)',
      ctx.daily,
    );
    const climaPassado = this.formatWeatherBlock(
      'Clima recente (Open-Meteo, dias anteriores)',
      ctx.historico,
    );

    const pergunta =
      `Explique em no máximo 2 ou 3 frases curtas o risco de fogo para ${ctx.locationName}` +
      `${ctx.state ? ` (${ctx.state})` : ''}.\n` +
      `Nível semanal do modelo XGBoost v8: ${ctx.risk_level} ` +
      `(média ${(ctx.weekly_risk_mean * 100).toFixed(0)}%). ` +
      `Riscos diários previstos: ${dailySummary}.\n\n` +
      `DADOS CLIMÁTICOS REAIS DESTA PREVISÃO (use APENAS estes números; não invente):\n` +
      `${climaFuturo}\n` +
      `${climaPassado}\n\n` +
      `REGRAS OBRIGATÓRIAS:\n` +
      `- Baseie a explicação nos valores de temperatura, umidade relativa, precipitação, vento, UV e ET0 acima.\n` +
      `- Se a umidade for alta (>70%) ou houver chuva relevante, NÃO diga "baixa umidade" nem "estiagem" sem citar os números reais.\n` +
      `- NÃO mencione aerossóis, fumaça, qualidade do ar, PM2.5, NDVI, focos, FWI ou estatísticas de acerto histórico — o modelo desta previsão usa clima Open-Meteo + features internas, e você só tem o clima acima.\n` +
      `- NÃO invente percentuais de acerto (ex.: "85%") nem mecanismos que não estejam nos dados.\n` +
      `- Seja breve: sem listas, sem introdução, sem títulos.`;

    try {
      const { data } = await axios.post<{ resposta: string }>(
        `${this.ragUrl}/perguntar`,
        { pergunta },
        { timeout: 90_000 },
      );
      if (data?.resposta?.trim()) {
        return data.resposta.trim();
      }
    } catch (error) {
      this.logger.warn(
        `RAG indisponível em ${this.ragUrl}/perguntar; usando fallback`,
      );
      this.logger.debug(error);
    }

    const s = this.summarizeWeather(ctx.daily);
    const climaHint =
      s.n > 0
        ? ` Clima previsto (médias): Tméd ${s.temp_mean}°C, UR ${s.humidity_mean}%, chuva total ${s.precip_total}mm.`
        : '';

    return (
      `Risco de fogo classificado como ${ctx.risk_level} ` +
      `(média semanal ${(ctx.weekly_risk_mean * 100).toFixed(0)}%) ` +
      `para ${ctx.locationName}.${climaHint} Explicação detalhada indisponível no momento.`
    );
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
