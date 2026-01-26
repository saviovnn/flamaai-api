import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import axios from 'axios';
import { DATABASE_CONNECTION } from '../db/app.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { sql } from 'drizzle-orm';

export interface GeocodingResult {
  location_id: string | null;
  preference?: 'weather' | 'air';
  cep: string | null;
  logradouro: string | null;
  bairro: string | null;
  cidade: string;
  estado: string;
  ibge_id: string | null;
  bioma_id: number | null;
  bioma: string | null;
  lat: number | null;
  lng: number;
  endereco_completo: string;
  fonte_dados: string;
}

interface NominatimAddress {
  road?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
  postcode?: string;
}

interface NominatimPlace {
  lat: string;
  lon: string;
  display_name: string;
  class?: string;
  type?: string;
  address?: NominatimAddress;
}

interface BrasilApiV2Response {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  service: string;
  location?: {
    type: string;
    coordinates: {
      longitude: string;
      latitude: string;
    };
  };
}

export interface SearchMunicipiosResult {
  ibge_id: string;
  name: string;
  sigla_uf: string;
}

interface IbgeMunicipio {
  id: number;
  nome: string;
}

export interface LocationResponse {
  id: string;
  user_id: string;
  bioma_id: number;
  bioma: string;
  ibge_id: string;
  name: string;
  publicPlace: string | null;
  neighborhood: string | null;
  state: string | null;
  lat: number;
  lng: number;
  preference: 'weather' | 'air';
  created_at: Date;
}

const ESTADOS_MAP: Record<string, string> = {
  Acre: 'AC',
  Alagoas: 'AL',
  Amapá: 'AP',
  Amazonas: 'AM',
  Bahia: 'BA',
  Ceará: 'CE',
  'Distrito Federal': 'DF',
  'Espírito Santo': 'ES',
  Goiás: 'GO',
  Maranhão: 'MA',
  'Mato Grosso': 'MT',
  'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG',
  Pará: 'PA',
  Paraíba: 'PB',
  Paraná: 'PR',
  Pernambuco: 'PE',
  Piauí: 'PI',
  'Rio de Janeiro': 'RJ',
  'Rio Grande do Norte': 'RN',
  'Rio Grande do Sul': 'RS',
  Rondônia: 'RO',
  Roraima: 'RR',
  'Santa Catarina': 'SC',
  'São Paulo': 'SP',
  Sergipe: 'SE',
  Tocantins: 'TO',
};

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  // Identificação do usuário para não ser bloqueado pelo OSM
  private readonly USER_AGENT = process.env.USER_AGENT;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async search(
    query: string,
    user_id: string,
    preference: 'weather' | 'air',
  ): Promise<GeocodingResult> {
    const cleanQuery = query.trim();

    // 1. É Coordenada? (Lat, Long)
    const coords = this.extractCoordinates(cleanQuery);
    if (coords) {
      const response = await this.handleReverseGeocoding(
        coords.lat,
        coords.lng,
      );
      if (response) {
        const responseWithBiomaId = await this.addBiomaIdToResponse(response);
        this.validateBrazilLocation(responseWithBiomaId);
        const locationId = await this.saveGeocodingResult(
          responseWithBiomaId,
          user_id,
          preference,
        );
        return {
          ...responseWithBiomaId,
          location_id: locationId,
          preference: preference,
        };
      } else {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Erro ao buscar local',
          error:
            'Não foi possível encontrar o local informado. Verifique se as coordenadas estão corretas.',
        });
      }
    }

    // 2. É CEP? (8 dígitos)
    const cepMatch = cleanQuery.replace(/\D/g, '').match(/^(\d{8})$/);
    if (cepMatch) {
      const response = await this.handleCepFlow(cepMatch[0]);
      if (response) {
        const responseWithBiomaId = await this.addBiomaIdToResponse(response);
        this.validateBrazilLocation(responseWithBiomaId);
        const locationId = await this.saveGeocodingResult(
          responseWithBiomaId,
          user_id,
          preference,
        );
        return {
          ...responseWithBiomaId,
          location_id: locationId,
          preference: preference,
        };
      } else {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Erro ao buscar local',
          error: 'Não foi possível encontrar o local para o CEP informado.',
        });
      }
    }

    // 3. É Busca Textual (Nome de rua, cidade, etc)
    try {
      const response = await this.handleTextSearch(cleanQuery);
      if (response) {
        const responseWithBiomaId = await this.addBiomaIdToResponse(response);
        this.validateBrazilLocation(responseWithBiomaId);
        const locationId = await this.saveGeocodingResult(
          responseWithBiomaId,
          user_id,
          preference,
        );
        return {
          ...responseWithBiomaId,
          location_id: locationId,
          preference: preference,
        };
      } else {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Erro ao buscar local',
          error: `Não foi possível encontrar o local para "${cleanQuery}". Verifique se o nome está correto.`,
        });
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof HttpException
      ) {
        throw error;
      }
      throw new NotFoundException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Erro ao buscar local',
        error: `Não foi possível encontrar o local para "${cleanQuery}". Verifique se o nome está correto.`,
      });
    }
  }

  async searchMunicipios(query: string): Promise<SearchMunicipiosResult[]> {
    // Busca com normalização de acentos e ordenação por relevância
    const response = await this.db
      .select({
        cdMun: schema.municipiosIbge.cdMun,
        name: schema.municipiosIbge.nmMun,
        siglaUf: schema.municipiosIbge.siglaUf,
      })
      .from(schema.municipiosIbge)
      .where(sql`unaccent(nm_mun) ILIKE unaccent(${'%' + query + '%'})`)
      .orderBy(
        sql`
          CASE
            WHEN unaccent(nm_mun) ILIKE unaccent(${query}) THEN 1
            WHEN unaccent(nm_mun) ILIKE unaccent(${query + '%'}) THEN 2
            ELSE 3
          END
        `,
      )
      .limit(10);
    return response.map((municipio) => ({
      ibge_id: municipio.cdMun,
      name: municipio.name || '',
      sigla_uf: municipio.siglaUf || '',
    }));
  }

  async getDataByLocationId(locationId: string): Promise<LocationResponse> {
    const location = await this.db
      .select()
      .from(schema.location)
      .where(sql`id = ${locationId}`)
      .limit(1);

    if (!location || location.length === 0) {
      throw new NotFoundException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Localização não encontrada',
        error: `Não foi possível encontrar a localização com o ID informado.`,
      });
    }

    const locationData = location[0];

    // Busca o nome do bioma
    const bioma = await this.db
      .select({
        bioma: schema.biomasIbge.bioma,
      })
      .from(schema.biomasIbge)
      .where(sql`gid = ${locationData.biomaId}`)
      .limit(1);

    return {
      id: locationData.id,
      user_id: locationData.userId,
      bioma_id: locationData.biomaId,
      bioma: bioma[0]?.bioma || 'Desconhecido',
      ibge_id: locationData.cdMun,
      name: locationData.name,
      publicPlace: locationData.publicPlace || null,
      neighborhood: locationData.neighborhood || null,
      state: locationData.state || null,
      lat: locationData.lat,
      lng: locationData.lng,
      preference: locationData.preference as 'weather' | 'air',
      created_at: locationData.createdAt,
    };
  }

  private validateBrazilLocation(result: GeocodingResult): void {
    if (!result.ibge_id) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Erro ao buscar local',
        error:
          'O local informado não é do Brasil. Por favor, informe um local brasileiro.',
      });
    }
  }

  private async addBiomaIdToResponse(
    response: GeocodingResult,
  ): Promise<GeocodingResult> {
    const bioma = await this.db
      .select({
        gid: schema.biomasIbge.gid,
        bioma: schema.biomasIbge.bioma,
      })
      .from(schema.biomasIbge)
      .where(
        sql`ST_Intersects(
            ${schema.biomasIbge.geom},
            ST_Buffer(
              ST_SetSRID(
                ST_Point(${response.lng}, ${response.lat}),
                4674
              ),
              0.00001
            )
        )`,
      )
      .limit(1);

    const biomaId = bioma.length > 0 ? bioma[0].gid : null;
    const biomaNome = bioma.length > 0 ? bioma[0].bioma : null;
    return {
      ...response,
      bioma_id: biomaId,
      bioma: biomaNome,
    };
  }

  private async saveGeocodingResult(
    result: GeocodingResult,
    user_id: string,
    preference: 'weather' | 'air',
  ): Promise<string | null> {
    try {
      // Validação: bioma_id e ibge_id são obrigatórios no schema
      if (!result.bioma_id || !result.ibge_id) {
        this.logger.warn(
          `Não foi possível salvar localização: bioma_id=${result.bioma_id}, ibge_id=${result.ibge_id}`,
        );
        return null;
      }

      // Validação: lat e lng devem ser válidos
      if (result.lat === null || result.lng === null) {
        this.logger.warn(
          `Não foi possível salvar localização: coordenadas inválidas (lat=${result.lat}, lng=${result.lng})`,
        );
        return null;
      }

      this.logger.log(`Salvando localização para usuário ${user_id}`);
      const cidade = this.getBestCityName({ city: result.cidade });
      const locationId = crypto.randomUUID();
      await this.db.insert(schema.location).values({
        id: locationId,
        userId: user_id,
        biomaId: result.bioma_id,
        cdMun: result.ibge_id,
        name: cidade,
        publicPlace: result.logradouro || null,
        neighborhood: result.bairro || null,
        state: result.estado || null,
        lat: result.lat,
        lng: result.lng,
        preference: preference,
      });

      this.logger.log('Localização salva com sucesso');
      return locationId;
    } catch (error) {
      this.logger.error(
        `Erro ao salvar localização: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Não relança o erro para não quebrar o fluxo de busca
      return null;
    }
  }

  // FLUXO 1: CEP (BrasilAPI + Fallback Nominatim)
  private async handleCepFlow(cep: string): Promise<GeocodingResult> {
    try {
      this.logger.log(`Consultando CEP ${cep} na BrasilAPI...`);
      const { data } = await axios.get<BrasilApiV2Response>(
        `https://brasilapi.com.br/api/cep/v2/${cep}`,
      );

      // Extrai dados iniciais
      let lat = data.location?.coordinates?.latitude
        ? Number(data.location.coordinates.latitude)
        : 0;
      let lng = data.location?.coordinates?.longitude
        ? Number(data.location.coordinates.longitude)
        : 0;
      let logradouro = data.street || null;
      let bairro = data.neighborhood || null;
      let fonteGeo = 'brasilapi';

      // Validação: Se faltar coordenada ou logradouro, pede ajuda ao Nominatim
      const missingData = !lat || !lng || !logradouro;

      if (missingData) {
        this.logger.log(
          'BrasilAPI incompleta. Buscando complemento no Nominatim...',
        );
        const geo = await this.callNominatimStructured(
          logradouro || '',
          data.city,
          data.state,
        );

        if (geo) {
          if (!lat) lat = Number(geo.lat);
          if (!lng) lng = Number(geo.lon);
          if (!logradouro) logradouro = geo.address?.road || null;
          if (!bairro) bairro = geo.address?.suburb || null;
          fonteGeo = 'cep_nominatim_enriched';
        }
      }

      // Busca IBGE (BrasilAPI geralmente devolve UF correta, ex: SP)
      const ibgeId = await this.fetchIbgeId(data.city, data.state);

      return {
        location_id: null,
        cep: data.cep,
        logradouro,
        bairro,
        cidade: data.city,
        estado: data.state,
        ibge_id: ibgeId,
        bioma_id: null,
        bioma: null,
        lat: lat || 0,
        lng: lng || 0,
        endereco_completo: `${logradouro || 'Logradouro não informado'}, ${bairro || ''}, ${data.city} - ${data.state}`,
        fonte_dados: fonteGeo,
        preference: undefined,
      };
    } catch {
      this.logger.warn(
        `CEP não encontrado na BrasilAPI. Tentando busca textual.`,
      );
      return this.handleTextSearch(cep);
    }
  }

  // FLUXO 2: TEXTO (Nominatim Search + Auto-Reverse + Limpeza)
  private async handleTextSearch(query: string): Promise<GeocodingResult> {
    try {
      const place = await this.callNominatimRaw(query);

      const lat = Number(place.lat);
      const lng = Number(place.lon);

      // Limpeza Crítica: Extrai o nome da cidade ignorando "Região Imediata"
      const cidade = this.getBestCityName(place.address);

      const estadoRaw = place.address?.state || null;
      const cep = place.address?.postcode || null;

      // Converte "São Paulo" -> "SP"
      const ufSigla = estadoRaw ? ESTADOS_MAP[estadoRaw] || estadoRaw : null;

      // Busca IBGE
      let ibgeId: string | null = null;
      if (cidade && cidade !== 'Desconhecida' && ufSigla) {
        ibgeId = await this.fetchIbgeId(cidade, ufSigla);
      }

      // AUTO-ENRIQUECIMENTO
      // Se achamos o local mas faltou metadados (CEP/IBGE), fazemos Reverse Geocoding
      const missingAdminData = !cep || !ibgeId;

      if (missingAdminData && lat && lng) {
        this.logger.log(`Enriquecendo busca textual via Reverse Geocoding...`);
        try {
          const reverse = await this.handleReverseGeocoding(lat, lng);

          // Mescla os resultados
          return {
            ...reverse,
            // Mantém o termo original se for busca específica de rua e o reverse retornou algo genérico, caso contrário, usa o logradouro do reverse
            logradouro:
              reverse.logradouro ||
              (place.class === 'highway' ? place.address?.road || query : null),
            fonte_dados: 'nominatim_search_enriched',
          };
        } catch {
          this.logger.warn(
            'Falha no enriquecimento reverse, retornando dados parciais.',
          );
        }
      }

      return {
        location_id: null,
        cep,
        logradouro:
          place.address?.road || (place.class === 'highway' ? query : null),
        bairro: place.address?.suburb || null,
        cidade: cidade || 'Desconhecida',
        estado: ufSigla || 'UF',
        ibge_id: ibgeId,
        bioma_id: null,
        bioma: null,
        lat,
        lng,
        endereco_completo: place.display_name,
        fonte_dados: 'nominatim_search',
        preference: undefined,
      };
    } catch (error) {
      this.logger.error(`Erro na busca textual: ${error}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new NotFoundException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Erro ao buscar local',
        error: `Não foi possível encontrar o local para "${query}". Verifique se o nome está correto.`,
      });
    }
  }

  // FLUXO 3: REVERSE (Lat/Long -> Endereço)
  private async handleReverseGeocoding(
    lat: number,
    lng: number,
  ): Promise<GeocodingResult> {
    try {
      const { data: place } = await axios.get<NominatimPlace>(
        `https://nominatim.openstreetmap.org/reverse`,
        {
          params: { lat, lon: lng, format: 'json' },
          headers: { 'User-Agent': this.USER_AGENT },
        },
      );

      // Limpeza Crítica de Cidade
      const cidade = this.getBestCityName(place.address);

      const estadoRaw = place.address?.state || 'UF';
      const ufSigla = ESTADOS_MAP[estadoRaw] || estadoRaw;

      const ibgeId = await this.fetchIbgeId(cidade, ufSigla);

      return {
        location_id: null,
        cep: place.address?.postcode || null,
        logradouro: place.address?.road || null,
        bairro: place.address?.suburb || null,
        cidade,
        estado: ufSigla,
        ibge_id: ibgeId,
        bioma_id: null,
        bioma: null,
        lat: Number(place.lat),
        lng: Number(place.lon),
        endereco_completo: place.display_name,
        fonte_dados: 'nominatim_reverse',
        preference: undefined,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new NotFoundException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Erro ao buscar local',
        error:
          'Não foi possível processar as coordenadas informadas. Verifique se estão corretas.',
      });
    }
  }

  // HELPERS & UTILS

  /**
   * Extrai o nome da cidade mais relevante e ignora regiões administrativas
   */
  private getBestCityName(address: NominatimAddress | undefined): string {
    if (!address) return 'Desconhecida';

    // Ordem de prioridade para o Brasil
    const candidates = [
      address.city,
      address.town,
      address.village,
      address.hamlet,
      address.municipality,
      address.county,
    ];

    // Procura o primeiro candidato que NÃO contenha termos proibidos
    const validCity = candidates.find((c) => {
      if (!c) return false;
      const invalidTerms = [
        'Região Imediata',
        'Região Metropolitana',
        'Região Geográfica',
        'Região Integrada',
        'Microrregião',
        'Mesorregião',
      ];
      return !invalidTerms.some((term) => c.includes(term));
    });

    return validCity || 'Desconhecida';
  }

  /**
   * Busca ID oficial no IBGE com normalização de string
   */
  private async fetchIbgeId(
    cidadeName: string,
    uf: string,
  ): Promise<string | null> {
    if (!cidadeName || !uf || uf.length !== 2) return null;

    try {
      const url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`;
      const { data } = await axios.get<IbgeMunicipio[]>(url);

      // Normaliza para comparar (remove acentos e caixa alta/baixa)
      const normalizedInput = cidadeName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      const found = data.find(
        (m) =>
          m.nome
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') === normalizedInput,
      );

      return found ? found.id.toString() : null;
    } catch {
      this.logger.warn(`Erro ao buscar IBGE para ${cidadeName}-${uf}`);
      return null;
    }
  }

  private async callNominatimStructured(
    street: string,
    city: string,
    state: string,
  ) {
    try {
      const { data } = await axios.get<NominatimPlace[]>(
        `https://nominatim.openstreetmap.org/search`,
        {
          params: {
            street,
            city,
            state,
            country: 'Brazil',
            format: 'json',
            limit: 1,
            addressdetails: 1,
          },
          headers: { 'User-Agent': this.USER_AGENT },
        },
      );
      return data[0] || null;
    } catch {
      return null;
    }
  }

  private async callNominatimRaw(query: string): Promise<NominatimPlace> {
    try {
      const { data } = await axios.get<NominatimPlace[]>(
        'https://nominatim.openstreetmap.org/search',
        {
          params: { q: query, format: 'json', limit: 1, addressdetails: 1 },
          headers: { 'User-Agent': this.USER_AGENT },
        },
      );
      if (!data[0]) {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Erro ao buscar local',
          error: `Não foi possível encontrar o local para "${query}". Verifique se o nome está correto.`,
        });
      }
      return data[0];
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new NotFoundException({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Erro ao buscar local',
        error: `Não foi possível encontrar o local para "${query}". Verifique se o nome está correto.`,
      });
    }
  }

  private extractCoordinates(
    query: string,
  ): { lat: number; lng: number } | null {
    const regex = /^(-?\d{1,3}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/;
    const match = query.trim().match(regex);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
    return null;
  }
}
