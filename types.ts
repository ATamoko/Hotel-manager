export enum EmailCategory {
  RENSEIGNEMENTS = 'Renseignements',
  PEC = 'PEC',
  FACTURES = 'Factures',
  SPAMS = 'Spams'
}

export enum EmailSubCategory {
  SEMINAIRES = 'Séminaires',
  NUITEES = 'Nuitée(s)',
  RESTAURATION = 'Restauration',
  NA = 'N/A'
}

export enum DossierStatus {
  NOUVEAU = 'Nouveau',
  ATTENTE_CLIENT = 'En attente d\'informations du client',
  ATTENTE_HOTEL = 'En attente d\'action de l\'hôtel',
  OPTION = 'Option posée',
  CONFIRME = 'Confirmé',
  CLOS = 'Clos'
}

export interface ExtractedInfo {
  nom_client: string;
  societe: string;
  dates_sejour: string;
  nb_personnes: number | string;
  type_prestation: string;
  budget_evoque: string;
  demandes_specifiques: string;
  urgence: boolean;
  langue_mail: string;
}

export interface ProcessedEmailResult {
  summary: string;
  category: EmailCategory;
  sub_category: EmailSubCategory;
  status: DossierStatus;
  extracted_info: ExtractedInfo;
  draft_response: string;
}

export interface EmailEntry extends ProcessedEmailResult {
  id: string;
  date_reception: string;
  expediteur: string; // Simplified for UI
  subject: string;
}

export interface IncomingEmail {
  id: string;
  sender: string;
  senderName: string;
  subject: string;
  content: string;
  receivedAt: string;
  read: boolean;
  platform: 'gmail' | 'outlook';
}