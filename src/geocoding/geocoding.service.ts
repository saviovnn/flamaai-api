import { Inject, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { DATABASE_CONNECTION } from '../db/app.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';

export interface GeocodingResult {
  cep: string | null;
  logradouro: string | null;
  bairro: string | null;
  cidade: string;
  estado: string;
  ibge_id: string | null;
  lat: number;
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

interface IbgeMunicipio {
  id: number;
  nome: string;
}

const ESTADOS_MAP: Record<string, string> = {
  Acre: 'AC',
  Alagoas: 'AL',
  Amapá: 'AP',
  Amazonas: 'AM',
  Bahia: 'BA',
  Ceará: 'CE',
  DistritoFederal: 'DF',
  EspiritoSanto: 'ES',
  Goiás: 'GO',
  Maranhão: 'MA',
  MatoGrosso: 'MT',
  MatoGrossoDoSul: 'MS',
  MinasGerais: 'MG',
  Pará: 'PA',
  Paraíba: 'PB',
  Paraná: 'PR',
  Pernambuco: 'PE',
  Piauí: 'PI',
  RioDeJaneiro: 'RJ',
  RioGrandeDoNorte: 'RN',
  RioGrandeDoSul: 'RS',
  Rondônia: 'RO',
  Roraima: 'RR',
  SantaCatarina: 'SC',
  SaoPaulo: 'SP',
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

  async search(query: string): Promise<GeocodingResult> {
    const cleanQuery = query.trim();

    // 1. É Coordenada? (Lat, Long)
    const coords = this.extractCoordinates(cleanQuery);
    if (coords) {
      return this.handleReverseGeocoding(coords.lat, coords.lng);
    }

    // 2. É CEP? (8 dígitos)
    const cepMatch = cleanQuery.replace(/\D/g, '').match(/^(\d{8})$/);
    if (cepMatch) {
      return this.handleCepFlow(cepMatch[0]);
    }

    // 3. É Busca Textual (Nome de rua, cidade, etc)
    return this.handleTextSearch(cleanQuery);
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
        cep: data.cep,
        logradouro,
        bairro,
        cidade: data.city,
        estado: data.state,
        ibge_id: ibgeId,
        lat: lat || 0,
        lng: lng || 0,
        endereco_completo: `${logradouro || 'Logradouro não informado'}, ${bairro || ''}, ${data.city} - ${data.state}`,
        fonte_dados: fonteGeo,
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
        cep,
        logradouro:
          place.address?.road || (place.class === 'highway' ? query : null),
        bairro: place.address?.suburb || null,
        cidade: cidade || 'Desconhecida',
        estado: ufSigla || 'UF',
        ibge_id: ibgeId,
        lat,
        lng,
        endereco_completo: place.display_name,
        fonte_dados: 'nominatim_search',
      };
    } catch (error) {
      this.logger.error(`Erro na busca textual: ${error}`);
      throw new Error('Local não encontrado.');
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
        cep: place.address?.postcode || null,
        logradouro: place.address?.road || null,
        bairro: place.address?.suburb || null,
        cidade,
        estado: ufSigla,
        ibge_id: ibgeId,
        lat: Number(place.lat),
        lng: Number(place.lon),
        endereco_completo: place.display_name,
        fonte_dados: 'nominatim_reverse',
      };
    } catch {
      throw new Error('Erro ao processar coordenadas.');
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
    const { data } = await axios.get<NominatimPlace[]>(
      'https://nominatim.openstreetmap.org/search',
      {
        params: { q: query, format: 'json', limit: 1, addressdetails: 1 },
        headers: { 'User-Agent': this.USER_AGENT },
      },
    );
    if (!data[0]) throw new Error('Local não encontrado');
    return data[0];
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
