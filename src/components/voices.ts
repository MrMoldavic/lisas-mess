export type Voice = {
  welcome: string;
  done: (reward: number) => string;
  /** Morning, afternoon, evening. */
  hello: [string, string, string];
  prompt: string;
};

/** The companion's tone, bought in the shop; `default` when none is equipped. */
export const VOICES: Record<string, Voice> = {
  default: {
    welcome: "Bienvenue à l'atelier ! Commence par photographier une pièce.",
    done: (reward) => `Défi réussi, bravo ! +${reward} bobinous dans ton bocal.`,
    hello: ['Bonjour Lisa !', 'Coucou Lisa !', 'Bonsoir Lisa !'],
    prompt: "Un nouveau défi t'attend, on se crée une tenue ?",
  },
  'voix-poete': {
    welcome: "Ô atelier vide ! Qu'une photo vienne t'emplir.",
    done: (reward) => `Victoire ! ${reward} bobinous chantent dans ton bocal.`,
    hello: ["Lisa, l'aube te sourit !", 'Lisa, douce après-midi !', 'Lisa, voici venir le soir !'],
    prompt: "Un défi luit à l'horizon : composons une tenue !",
  },
  'voix-raleur': {
    welcome: 'Pas une seule pièce ? Allez, une photo, et vite.',
    done: (reward) => `Bon, c'est réussi. ${reward} bobinous, et pas un de plus.`,
    hello: ['Déjà debout, Lisa ?', 'Ah, te revoilà, Lisa.', 'Encore toi, Lisa ? À cette heure ?'],
    prompt: 'Le défi ne va pas se faire tout seul, hein.',
  },
};

export function voiceFor(id: string | null): Voice {
  return VOICES[id ?? 'default'] ?? VOICES.default;
}
