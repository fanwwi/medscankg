import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Настройка CORS
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

// Базовый роут
app.get("/", (req, res) => {
  res.send("LungAI Backend is running successfully!");
});

// Основной роут
app.post("/api/analyze", upload.single("image"), async (req, res) => {
  try {
    console.log("=== Incoming Analyze Request ===");

    if (!req.file) {
      console.log("Error: No file uploaded");
      return res.status(400).json({ error: "Please upload an X-ray image" });
    }

    // Очищаем ключ от возможных кавычек и пробелов
    const apiKey = process.env.GEMINI_API_KEY
      ? process.env.GEMINI_API_KEY.replace(/['"]/g, "").trim()
      : null;

    if (!apiKey) {
      console.log("Error: GEMINI_API_KEY is missing or empty");
      return res
        .status(500)
        .json({ error: "Server configuration error: Missing API Key" });
    }

    console.log("Using API Key starting with:", apiKey.substring(0, 6));

    // Инициализация ИИ
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Получаем симптомы и выбранный язык с фронтенда
    const { symptoms, language } = req.body;

    // Определяем целевой язык для генерации ответа модели
    const targetLanguage = language === "ru" ? "RUSSIAN" : "ENGLISH";
    console.log(`Target language for Gemini analysis: ${targetLanguage}`);

    const promptText = `
You are a professional pulmonologist and radiologist.
Analyze the uploaded chest X-ray image together with the patient symptoms.
Patient Symptoms: ${symptoms || "None reported"}

CRITICAL: You must generate all text values inside the JSON object strictly in ${targetLanguage} language.

Return ONLY valid JSON. Do not include markdown blocks like \\\`json. No text outside JSON.

{
  "riskLevel": "High | Medium | Low (strictly translate this value to ${targetLanguage} too, e.g., Высокий / Средний / Низкий)",
  "diseases": [
    {
      "name": "Disease name in ${targetLanguage}",
      "probability": "85%"
    }
  ],
  "detailedAnalysis": "Detailed explanation in ${targetLanguage}",
  "specialists": [
    "Required specialist in ${targetLanguage}"
  ],
  "furtherExams": [
    "Further recommended exam in ${targetLanguage}"
  ],
  "recommendations": [
    "Medical recommendation in ${targetLanguage}"
  ]
}
`;

    console.log("Sending request to Gemini API...");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        promptText,
        {
          inlineData: {
            data: req.file.buffer.toString("base64"),
            mimeType: req.file.mimetype,
          },
        },
      ],
      config: {
        responseMimeType: "application/json",
        // ОТКЛЮЧАЕМ БЛОКИРОВКУ МЕДИЦИНСКОГО КОНТЕНТА
        safetySettings: [
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE",
          },
        ],
      },
    });

    console.log("Gemini API responded successfully");

    // БЕЗОПАСНО: Проверяем существование текста перед вызовом .trim()
    let resultText = response.text ? response.text.trim() : "";

    if (!resultText) {
      console.error("Error: Gemini returned an empty response.");
      return res.status(500).json({
        error: "Model returned an empty text response. Please try again.",
      });
    }

    // Очищаем от markdown-кавычек, если они есть
    if (resultText.startsWith("```")) {
      resultText = resultText
        .replace(/^```json?/, "")
        .replace(/```$/, "")
        .trim();
    }

    // БЕЗОПАСНО: Проверяем структуру JSON перед отправкой на фронтенд
    try {
      const parsedData = JSON.parse(resultText);
      res.json(parsedData);
    } catch (parseError) {
      console.error("JSON Parse Error. Raw text was:", resultText);
      res
        .status(500)
        .json({ error: "Failed to parse AI response into valid JSON." });
    }
  } catch (error) {
    console.error("CRITICAL ROUTE ERROR:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error during analysis",
    });
  }
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception thrown:", err);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
