import { Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import { DATABASE_CONNECTION } from '../db/app.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';

// --- INTERFACES ---

export interface GeocodingResult {
  dados: {
    cidade: string | null;
    estado: string | null;
    pais: string | null;
    lat: number;
    lng: number;
    endereco: string;
  };
}

// Unificando interfaces do Nominatim para facilitar
interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  country?: string;
  road?: string;
  house_number?: string;
}

interface NominatimPlace {
  lat: string;
  lon: string;
  display_name: string;
  address?: NominatimAddress; // Opcional na busca, presente no reverso
}

interface GroqLocation {
  cidade: string | null;
  estado: string | null;
  pais: string | null;
  endereco: string | null;
}

interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

@Injectable()
export class GeocodingService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  // --- MÉTODO PRINCIPAL ---
  async search(query: string): Promise<GeocodingResult> {
    // 1. Verifica se é lat/long
    const coords = this.extractCoordinates(query);

    if (coords) {
      return this.callNominatimReverse(coords.lat, coords.lng);
    }

    // 2. Tenta via Groq (IA) -> Busca Estruturada
    try {
      const location = await this.callGroq(query);
      return await this.callNominatimSearch(location);
    } catch (error) {
      // 3. FALLBACK: Se o Groq falhar, faz busca direta (texto bruto)
      console.warn(
        'Erro no Groq ou busca estruturada, tentando busca direta:',
        error,
      );
      return await this.callNominatimRaw(query);
    }
  }

  // --- MÉTODOS PRIVADOS ---

  // Helper para verificar coordenadas
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

  // 1. Geocoding Reverso (Lat/Lon -> Endereço)
  private async callNominatimReverse(
    lat: number,
    lon: number,
  ): Promise<GeocodingResult> {
    const response = await axios.get<NominatimPlace>(
      `https://nominatim.openstreetmap.org/reverse`,
      {
        params: { lat, lon, format: 'json' },
        headers: { 'User-Agent': 'FlamaAI/1.0 (contato@flamaai.com)' },
      },
    );
    return this.mapNominatimToResult(response.data, null);
  }

  // 2. Chamada Groq (IA)
  private async callGroq(query: string): Promise<GroqLocation> {
    const response = await axios.post<GroqResponse>(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'openai/gpt-oss-120b',
        messages: [
          {
            role: 'system',
            content: `Você extrai entidades geográficas. Retorne APENAS JSON válido.`,
          },
          {
            role: 'user',
            content: `Texto: "${query}"\nFormato: { "cidade": string | null, "estado": string | null, "pais": string | null, "endereco": string | null }`,
          },
        ],
        temperature: 0,
      },
      { headers: { Authorization: `Bearer ${process.env.GROQ_KEY_SEARCH}` } },
    );

    const content = response.data.choices[0]?.message?.content;
    if (typeof content !== 'string')
      throw new Error('Invalid response from Groq');

    try {
      // IMPORTANTE: Remove markdown antes do parse
      const cleanedContent = content.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(cleanedContent) as GroqLocation;
    } catch {
      throw new Error('Groq returned invalid JSON');
    }
  }

  // 3. Busca Estruturada (usando dados do Groq)
  private async callNominatimSearch(
    location: GroqLocation,
  ): Promise<GeocodingResult> {
    const q = [
      location.endereco,
      location.cidade,
      location.estado,
      location.pais,
    ]
      .filter(Boolean)
      .join(', ');

    const response = await axios.get<NominatimPlace[]>(
      `https://nominatim.openstreetmap.org/search`,
      {
        params: { q, format: 'json', limit: 1, addressdetails: 1 },
        headers: { 'User-Agent': 'FlamaAI/1.0 (contato@flamaai.com)' },
      },
    );

    const place = response.data[0];
    if (!place) throw new Error('Local não encontrado');

    return this.mapNominatimToResult(place, location);
  }

  // 4. Busca Direta (Fallback)
  private async callNominatimRaw(query: string): Promise<GeocodingResult> {
    const response = await axios.get<NominatimPlace[]>(
      'https://nominatim.openstreetmap.org/search',
      {
        params: {
          q: query,
          format: 'json',
          limit: 1,
          addressdetails: 1, // Essencial para vir cidade/estado
        },
        headers: {
          'User-Agent': 'FlamaAI/1.0 (contato@flamaai.com)',
        },
      },
    );

    const place = response.data[0];
    if (!place) throw new Error('Local não encontrado na busca direta');

    return this.mapNominatimToResult(place, null);
  }

  // --- HELPER UNIFICADO ---
  private mapNominatimToResult(
    place: NominatimPlace,
    groqLocation: GroqLocation | null,
  ): GeocodingResult {
    const cidade =
      groqLocation?.cidade ||
      place.address?.city ||
      place.address?.town ||
      place.address?.village ||
      place.address?.municipality ||
      null;

    const estado = groqLocation?.estado || place.address?.state || null;
    const pais = groqLocation?.pais || place.address?.country || null;

    return {
      dados: {
        cidade,
        estado,
        pais,
        endereco: place.display_name,
        lat: Number(place.lat),
        lng: Number(place.lon),
      },
    };
  }
}
