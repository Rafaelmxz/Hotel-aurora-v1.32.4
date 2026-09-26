/** Payload Pix (BR Code EMV) no padrão do Banco Central. */

function tlv(id: string, value: string) {
  return id + String(value.length).padStart(2, "0") + value;
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function asciiField(value: string, max: number) {
  const clean = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  return (clean || "HOTEL").slice(0, max);
}

export function pixCityFromAddress(address: string) {
  const slash = address.match(/([^,—\-]+)\s*\/\s*[A-Za-z]{2}/);
  const city = (slash?.[1] ?? address.split("—").pop() ?? "SAO PAULO").trim();
  return asciiField(city, 15);
}

export function pixTxid(seed: string) {
  const raw = seed.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const body = (raw || Date.now().toString(36).toUpperCase()).slice(-21);
  return `AUR${body}`.slice(0, 25);
}

export function buildPixPayload(input: {
  key: string;
  name: string;
  city: string;
  amount: number;
  txid: string;
  description?: string;
}) {
  const key = input.key.trim();
  if (!key) throw new Error("Informe a chave Pix do hotel.");
  const amount = Math.round(input.amount * 100) / 100;
  if (!(amount > 0)) throw new Error("Valor do Pix inválido.");
  const merchant =
    tlv("00", "BR.GOV.BCB.PIX") +
    tlv("01", key) +
    (input.description ? tlv("02", input.description.slice(0, 72)) : "");
  const additional = tlv("05", pixTxid(input.txid) || "***");
  const body =
    tlv("00", "01") +
    tlv("26", merchant) +
    tlv("52", "0000") +
    tlv("53", "986") +
    tlv("54", amount.toFixed(2)) +
    tlv("58", "BR") +
    tlv("59", asciiField(input.name, 25)) +
    tlv("60", asciiField(input.city, 15)) +
    tlv("62", additional) +
    "6304";
  return body + crc16(body);
}
