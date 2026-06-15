import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import axios from "axios";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  }),
);

app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.get("/", (req, res) => {
  res.send("LungAI Backend via Hugging Face is running successfully!");
});

app.post("/api/analyze", upload.single("image"), async (req, res) => {
  try {
    console.log("=== Incoming Analyze Request ===");

    if (!req.file) {
      return res.status(400).json({ error: "Please upload an X-ray image" });
    }

    const hfToken = process.env.HF_API_KEY;
    if (!hfToken) {
      console.error("Missing HF_API_KEY");
      return res
        .status(500)
        .json({ error: "Server configuration error: Missing API Key" });
    }

    const { symptoms, language } = req.body;
    const targetLanguage = language === "ru" ? "RUSSIAN" : "ENGLISH";

    const base64Image = req.file.buffer.toString("base64");
    const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    const promptText = `You are a professional medical imaging AI data structure extractor.
Analyze the provided chest X-ray image and the patient's symptoms.
Patient Symptoms: ${symptoms || "None reported"}

CRITICAL: You must write all textual explanations and fields inside the JSON strictly in ${targetLanguage} language.

Return ONLY a valid JSON object. No markdown, no triple backticks, no words outside JSON.

{
  "riskLevel": "High | Medium | Low (translate this to ${targetLanguage})",
  "diseases": [
    {
      "name": "Condition or pattern name in ${targetLanguage}",
      "probability": "85%"
    }
  ],
  "detailedAnalysis": "Detailed technical analysis of the X-ray in ${targetLanguage}",
  "specialists": [
    "Recommended specialist to visit in ${targetLanguage}"
  ],
  "furtherExams": [
    "Recommended next exam or test in ${targetLanguage}"
  ],
  "recommendations": [
    "Patient recommendation in ${targetLanguage}"
  ]
}`;

    console.log(
      "Sending request to Hugging Face Inference API via Direct IP...",
    );

    // Используем прямой IP-адрес Cloudflare (основной прокси для Hugging Face)
    // и передаем оригинальный домен в заголовке Host, чтобы Cloudflare понял, куда слать запрос
    const hfUrl = "https://172.67.171.18/v1/chat/completions";

    const response = await axios.post(
      hfUrl,
      {
        model: "meta-llama/Llama-3.2-11B-Vision-Instruct",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: promptText },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 1000,
        response_format: { type: "json_object" },
      },
      {
        headers: {
          Authorization: `Bearer ${hfToken.trim()}`,
          "Content-Type": "application/json",
          Host: "api-inference.huggingface.co", // КЛЮЧЕВОЙ ХАК: заменяет DNS-резолв
        },
        timeout: 25000,
      },
    );

    console.log("Hugging Face responded successfully");

    const data = response.data;
    let resultText = data.choices?.[0]?.message?.content;

    if (!resultText) {
      throw new Error("Empty response content from Hugging Face");
    }

    resultText = resultText.trim();

    if (resultText.startsWith("```")) {
      resultText = resultText
        .replace(/^```json?/, "")
        .replace(/```$/, "")
        .trim();
    }

    const parsedData = JSON.parse(resultText);
    res.json(parsedData);
  } catch (error) {
    console.error(
      "CRITICAL ROUTE ERROR:",
      error.response?.data || error.message,
    );

    // Если упало по таймауту или ошибке сети, выводим подробности
    const status = error.response?.status || 500;
    const errorMessage =
      error.response?.data?.error || error.message || "Internal Server Error";

    res.status(status).json({
      error: `Analysis failed: ${errorMessage}`,
    });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
