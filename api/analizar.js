export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { descripcion } = req.body;
    const prompt = `Eres un psicólogo escolar experto en inclusión educativa en Colombia. Analiza la siguiente descripción de un caso escolar y responde ÚNICAMENTE en JSON válido, sin texto adicional, sin markdown, sin explicaciones.

Descripción del docente: "${descripcion}"

Responde con este JSON exacto:
{
  "dx_estandarizado": "nombre del diagnóstico estandarizado más probable",
  "categoria": "una de: Cognitiva, Psicológica, Médica, Mixta, En observación",
  "prioridad": "una de: Alta, Media, Baja",
  "proceso_sugerido": "una de: DUA, PIAR, En definición",
  "recomendaciones": "3 recomendaciones cortas para el docente, separadas por •",
  "senales": "2-3 señales observables, separadas por •",
  "seguimiento": "una acción de seguimiento concreta"
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.REACT_APP_ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content.map(i => i.text || "").join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
