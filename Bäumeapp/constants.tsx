
import { Tree, Meadow, TreeCondition } from './types';

export const INITIAL_MEADOWS: Meadow[] = [
  {
    id: 'm1',
    name: 'Wieslauf-Wiese',
    area: 1.5,
    description: 'Schöne Wiese im Wieslauftal bei Rudersberg.',
    icon: 'sunny',
    lastChecked: '2 Tage',
    location: { lat: 48.8870, lng: 9.5330 }
  },
  {
    id: 'm2',
    name: 'Schlechtbacher Obstgarten',
    area: 4.2,
    description: 'Großer Obstgarten am Rande von Schlechtbach.',
    icon: 'water_drop',
    lastChecked: '1 Woche',
    location: { lat: 48.8840, lng: 9.5280 }
  },
  {
    id: 'm3',
    name: 'Garten Schulstraße',
    area: 0.1,
    description: 'Zentrale Lage im Ortskern von Rudersberg.',
    icon: 'home',
    lastChecked: 'Heute',
    location: { lat: 48.8850, lng: 9.5310 }
  }
];

export const INITIAL_TREES: Tree[] = [
  {
    id: 't1',
    variety: 'Tilia cordata (Winterlinde)',
    meadowId: 'm3',
    plantingDate: '2018-03-14',
    condition: TreeCondition.HEALTHY,
    location: { lat: 48.8854, lng: 9.5311, address: 'Marktplatz, Rudersberg' },
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBWDQ8sZpDZSYJK_dvFzjzg4OiqKTO1epYo8kLYEvIhrVgfyuIbLFn-82kQQrSCG8j5lBZ_2_ckrRgraJfmQL1qXLHR9LLjQk2i3_jMBQrNNx_Tz6QCm7zLpCh0uaTNY_rUXZ2DbrrJsJaLreTCEX6fXKWdXxb6iTu7A5x4_3Oj1bbrklBsWydS_vYTB7Of0qar2dLu--nedNCpqlj-gcFWsK5pARTYiZgi-xUX1y-WzGFJ-_nqKSaLaOCAyIcd_6LPKyAQxyqatFo'
  },
  {
    id: 't2',
    variety: 'Boskoop Apfelbaum',
    meadowId: 'm2',
    plantingDate: '2020-04-10',
    condition: TreeCondition.HEALTHY,
    location: { lat: 48.8845, lng: 9.5285 },
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD7a0P7Y5IFuibriAj_GszVtmCWy2P67P95W8vw39vkB7alAMwQXuKJHFDnfPPS96y7z-KP3VdZESJQhI0qkQgGeXhGpm3eqWuiOHEOhec8wBuzriHjCpzMBxjT7lNjrCWkF7GgqYn7WeAz1Wf-VbnOJbUfMBQseNLCFEaVuK5uYpbT8E3g0dR2bY5Ssmc86TU2sEpI7h8AJeauQnBYuA1OAs8MVif6ZaNrZdY_U2txkd-yualTl3rcdRApaloGlB0Werv5V0IRtT4'
  }
];

export const ASSET_MAP_BG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDSHVYnYOS3ClhvYacV6CuTBSXvLYzzS1IO1u_dHufsKZ-gMTCctL4v_D8PkLWR2_JWHzb4f8WPogdPpMq-vr1kUAjiOI0tkqYDmn9HePEEIDJpUdPuD98pc5aJqgbp26lja4piVjT71CfKgrfoXQbv3UAwgylAfSmH5Y75RWG6Mz_gho4AlmBFAE3pVQ_eVv0YwhcfRWjU35NeZbTzoFxiA-3P1ULfCSnrg1VFFIpr0vOZng6lmgcK2ZTdFmoSGhwmwTQSAwMHAeQ';
