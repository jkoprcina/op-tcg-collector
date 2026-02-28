export type SetSummary = {
  id: string; // e.g., OP01
  name: string; // e.g., Romance Dawn
};

export type Card = {
  inventory_price: number | null;
  market_price: number | null;
  cardmarket_price: number | null;
  card_name: string;
  set_name: string;
  set_id: string; // e.g., OP-01
  rarity: string;
  card_set_id: string; // e.g., OP01-001
  card_color: string | null;
  card_type: string | null;
  life: string | null;
  card_cost: string | null;
  card_power: string | null;
  sub_types: string | null;
  counter_amount: string | null;
  attribute: string | null;
  date_scraped: string | null;
  card_image_id: string;
  card_image: string; // URL
  card_text?: string | null; // Optional: present in detailed card data
  collected_count?: number;
  collection_card_id?: string;
  binder_position?: number;
};
