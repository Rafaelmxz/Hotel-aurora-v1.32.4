import type { RoomType } from "@/mocks/hotelData";

export type RoomCatalogItem = {
  type: RoomType;
  photo: string;
  capacity: number;
  description: string;
  highlights: string[];
};

export const PROPERTY_AMENITIES = [
  "Wi-Fi em todos os quartos",
  "Café da manhã incluso",
  "Estacionamento",
  "Piscina",
  "Recepção 24h",
  "Ar-condicionado",
];

export const ROOM_CATALOG: RoomCatalogItem[] = [
  {
    type: "Standard",
    photo: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=60",
    capacity: 3,
    description: "Quarto aconchegante com cama queen, mesa de trabalho e vista para o jardim.",
    highlights: ["Cama queen", "Banheiro privativo", "Frigobar"],
  },
  {
    type: "Luxo",
    photo: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=60",
    capacity: 3,
    description: "Ambiente amplo com varanda, cama king e amenidades de spa.",
    highlights: ["Cama king", "Varanda", "Banheira"],
  },
  {
    type: "Suíte",
    photo: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=60",
    capacity: 4,
    description: "Suíte master com sala de estar, hidromassagem e vista panorâmica.",
    highlights: ["Sala de estar", "Hidromassagem", "Até 4 pessoas"],
  },
];

export type ExtraStory = {
  photo: string;
  blurb: string;
  included: string;
};

const FALLBACK_STORY: ExtraStory = {
  photo: ROOM_CATALOG[0].photo,
  blurb: "Serviço extra cobrado na conta da reserva.",
  included: "",
};

export const EXTRA_STORIES: Record<string, ExtraStory> = {
  cafe: {
    photo:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=60",
    blurb:
      "Mesa no restaurante das 7h às 10h, com pães, frutas, sucos e café. Cobra-se por hóspede da reserva.",
    included: "O café da diária continua incluso; este é o serviço extra, cobrado à parte.",
  },
  traslado: {
    photo:
      "https://images.unsplash.com/photo-1544620341-11cb2cd57ee8?auto=format&fit=crop&w=1200&q=60",
    blurb:
      "Van particular no check-in ou no check-out. Combine o horário com a recepção depois de confirmar. Valor único por estadia.",
    included: "Motorista e espera de até 45 minutos no aeroporto.",
  },
  cama: {
    photo:
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=60",
    blurb:
      "Berço ou cama extra montada no quarto antes da chegada, sujeito à capacidade. Cobra-se por noite.",
    included: "Roupa de cama e montagem no horário combinado.",
  },
};

export function extraStory(id: string): ExtraStory {
  return EXTRA_STORIES[id] ?? FALLBACK_STORY;
}
