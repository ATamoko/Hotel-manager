import { GoogleGenAI, Type } from "@google/genai";
import { ProcessedEmailResult } from "../types";

const SYSTEM_INSTRUCTION = `
IDENTITÉ ET RÔLE
Tu es Emma, agent IA spécialisé dans la gestion des emails pour un hôtel.

TES MISSIONS
1. Analyser le contenu du mail.
2. Extraire les informations (Nom, Dates, Pax, etc.).
3. Classifier le mail (Catégorie, Sous-catégorie, Statut).
4. Rédiger un brouillon de réponse professionnel (Validation humaine requise).
5. Préparer les données pour l'insertion en base de données.

RÈGLES ABSOLUES
- TU RÉPONDS TOUJOURS DANS LA LANGUE DU MAIL REÇU.
- N'INVENTE JAMAIS de tarifs ou disponibilités.
- Ton professionnel, courtois, haut de gamme.

CATÉGORIES DE CLASSIFICATION
- Renseignements (Séminaires, Nuitées, Restauration)
- PEC (Prise en charge)
- Factures
- Spams

STATUTS
- Nouveau, En attente d'informations du client, En attente d'action de l'hôtel, Option posée, Confirmé, Clos.
`;

const getEmmaResponse = async (emailContent: string, sender: string): Promise<ProcessedEmailResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
  Voici un nouvel email à traiter.
  Expéditeur: ${sender}
  Contenu:
  """
  ${emailContent}
  """

  Agis en tant qu'Emma et traite cet email selon tes instructions système.
  Retourne UNIQUEMENT un objet JSON.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING, description: "Résumé synthétique du mail en 2-4 phrases" },
          category: { type: Type.STRING, enum: ['Renseignements', 'PEC', 'Factures', 'Spams'] },
          sub_category: { type: Type.STRING, enum: ['Séminaires', 'Nuitée(s)', 'Restauration', 'N/A'] },
          status: { type: Type.STRING, enum: ['Nouveau', "En attente d'informations du client", "En attente d'action de l'hôtel", 'Option posée', 'Confirmé', 'Clos'] },
          extracted_info: {
            type: Type.OBJECT,
            properties: {
              nom_client: { type: Type.STRING },
              societe: { type: Type.STRING },
              dates_sejour: { type: Type.STRING },
              nb_personnes: { type: Type.STRING }, // Keeping string to allow "approx 20"
              type_prestation: { type: Type.STRING },
              budget_evoque: { type: Type.STRING },
              demandes_specifiques: { type: Type.STRING },
              urgence: { type: Type.BOOLEAN },
              langue_mail: { type: Type.STRING },
            }
          },
          draft_response: { type: Type.STRING, description: "Le brouillon de réponse complet, incluant l'objet." }
        }
      }
    }
  });

  if (!response.text) {
    throw new Error("No response from AI");
  }

  return JSON.parse(response.text) as ProcessedEmailResult;
};

export { getEmmaResponse };