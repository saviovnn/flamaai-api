import { Inject, Injectable, Logger } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../db/app.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, sql } from 'drizzle-orm';

export interface MapResponse {
  map: string;
}

@Injectable()
export class MapService {
  private readonly logger = new Logger(MapService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getMapByIbgeId(ibgeId: string): Promise<MapResponse> {
    return await Promise.resolve(this.getMap(ibgeId));
  }

  private async getMap(ibgeId: string): Promise<MapResponse> {
    // Busca pelo código do município IBGE (cdMun)
    const municipio = await this.db
      .select({
        gid: schema.municipiosIbge.gid,
        cdMun: schema.municipiosIbge.cdMun,
        nmMun: schema.municipiosIbge.nmMun,
        cdUf: schema.municipiosIbge.cdUf,
        nmUf: schema.municipiosIbge.nmUf,
        siglaUf: schema.municipiosIbge.siglaUf,
        areaKm2: schema.municipiosIbge.areaKm2,
        // Converte a geometria para GeoJSON
        geom: sql<any>`ST_AsGeoJSON(${schema.municipiosIbge.geom})::jsonb`,
      })
      .from(schema.municipiosIbge)
      .where(eq(schema.municipiosIbge.cdMun, ibgeId))
      .limit(1);

    this.logger.log(
      `Município encontrado: ${municipio[0]?.nmMun || 'Não encontrado'}`,
    );

    return await Promise.resolve({
      map: JSON.stringify(
        municipio[0] || { message: 'Município não encontrado' },
      ),
    });
  }
}
