import { IncomingEmail } from "../types";

const MOCK_EMAILS: IncomingEmail[] = [
  {
    id: 'email_001',
    sender: 'sophie.lemaire@example.com',
    senderName: 'Sophie Lemaire',
    subject: 'Réservation chambre double - Février',
    content: `Bonjour,
Je souhaite réserver une chambre double pour le 25 et 26 février.
Nous sommes 2 personnes.
Quel est le tarif ?

Cordialement,
Sophie Lemaire`,
    receivedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    read: false,
    platform: 'gmail'
  },
  {
    id: 'email_002',
    sender: 'pierre.martin@techsolutions.com',
    senderName: 'Pierre Martin',
    subject: 'Organisation Séminaire Annuel',
    content: `Bonjour,
Je souhaiterais organiser un séminaire pour mon équipe début mars.
Nous sommes environ 20 personnes.
Pouvez-vous me faire un devis ?

Bien à vous,
Pierre Martin
TechSolutions`,
    receivedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    read: false,
    platform: 'outlook'
  },
  {
    id: 'email_003',
    sender: 'noreply@booking.com',
    senderName: 'Booking.com',
    subject: 'Confirmation de réservation #12345',
    content: `Ceci est une confirmation automatique de votre réservation.
Numéro de référence: 12345
Client: Jean Dupont
Dates: 12-14 Mars`,
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    read: false,
    platform: 'gmail'
  }
];

export const fetchNewEmails = async (): Promise<IncomingEmail[]> => {
  // Simulate API latency
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_EMAILS);
    }, 1500);
  });
};