
import { GoogleGenAI, Type } from "@google/genai";
import { MetrajItem, ValidationResult, AIAnalysis, Language } from "../types";

export const analyzeExcelStructure = async (
  sampleData: any[][],
  lang: Language = 'TR'
): Promise<{ mapping: Record<string, number>, startRow: number }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analyze this construction quantity survey (metraj) spreadsheet data (first 10 rows).
    Identify the column index (0, 1, 2...) for each field.
    
    CRITICAL FIELDS TO MAP:
    - pozNumber: (Poz No, Kalem No, Poz)
    - description: (Açıklama, İşin Tanımı, İmalat Tanımı)
    - unit: (Birim, Ölçü Birimi)
    - multiplier: (Benzer, Çarpan, Adet/Benzer)
    - x: (Boyut X, En, Genişlik)
    - y: (Boyut Y, Boy, Uzunluk)
    - z: (Boyut Z, Yükseklik, Derinlik, Kalınlık)
    - area: (Alan, m2, Yüzey Alanı)
    - volume: (Hacim, m3, Küp)
    - unitWeight: (Birim Ağırlık, kg/m2, kg/m, Ağırlık)
    - count: (Adet, Sayı)
    - totalQuantity: (Manuel Miktar, Toplam, Metraj, Miktar, Hakediş Miktarı, Sonuç)
    - category: (Kategori, İmalat Grubu, İş Grubu)

    Data (Sample): ${JSON.stringify(sampleData)}
    
    Rules:
    1. Look for headers in the first 10 rows. Return the startRow where actual numeric data begins.
    2. Map "totalQuantity" to the column that contains the final manually entered metraj result.
    3. Return -1 for any field not found.
    4. RESPOND FAST.
  `;

  try {
    const response = await ai.models.generateContent({
      // Hız için Flash modeli kullanılıyor
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mapping: {
              type: Type.OBJECT,
              properties: {
                pozNumber: { type: Type.NUMBER },
                description: { type: Type.NUMBER },
                unit: { type: Type.NUMBER },
                multiplier: { type: Type.NUMBER },
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                z: { type: Type.NUMBER },
                area: { type: Type.NUMBER },
                volume: { type: Type.NUMBER },
                unitWeight: { type: Type.NUMBER },
                count: { type: Type.NUMBER },
                totalQuantity: { type: Type.NUMBER },
                category: { type: Type.NUMBER }
              }
            },
            startRow: { type: Type.NUMBER }
          },
          required: ["mapping", "startRow"]
        }
      }
    });

    if (!response.text) throw new Error("Empty response");
    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("AI Mapping failed:", error);
    return {
      mapping: { pozNumber: 0, description: 1, unit: 2, multiplier: 3, x: 4, y: 5, z: 6, area: -1, volume: -1, unitWeight: -1, count: 7, totalQuantity: 8, category: -1 },
      startRow: 1
    };
  }
};

export const getAIExpertAnalysis = async (
  items: MetrajItem[], 
  rulesResults: ValidationResult[],
  lang: Language = 'TR'
): Promise<AIAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Analyze this Metraj data. Respond in ${lang === 'TR' ? 'Turkish' : 'English'}.
    Review relationship between X,Y,Z dimensions and "totalQuantity" (Manual Total).
    
    DATA: ${JSON.stringify(items.slice(0, 30).map(i => ({ poz: i.pozNumber, total: i.totalQuantity })), null, 2)}
    ERRORS: ${JSON.stringify(rulesResults, null, 2)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskScore: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            findings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  standard: { type: Type.STRING },
                  severity: { type: Type.STRING, enum: ["CRITICAL", "WARNING", "INFO"] }
                },
                required: ["title", "explanation", "standard", "severity"]
              }
            }
          },
          required: ["riskScore", "summary", "findings"]
        }
      }
    });
    return JSON.parse(response.text?.trim() || "{}") as AIAnalysis;
  } catch (error) {
    return { riskScore: 0, summary: "Analysis failed", findings: [] };
  }
};
