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
You are an advanced vision AI analyst specializing in medical imaging structures.
Analyze the provided chest radiograph and notice any structural patterns alongside the reported clinical signs.
Clinical Signs / Notes: ${symptoms || "None reported"}

Generate a structural data summary based strictly on the provided layout. 
Return ONLY a valid JSON object. Do not include markdown blocks like \\\`json. No text outside JSON.

{
  "riskLevel": "High | Medium | Low (translate this value to ${targetLanguage}, e.g., Высокий / Средний / Низкий)",
  "diseases": [
    {
      "name": "Name of noted condition or structural pattern in ${targetLanguage}",
      "probability": "85%"
    }
  ],
  "detailedAnalysis": "Technical evaluation of the image zones and patterns in ${targetLanguage}",
  "specialists": [
    "Recommended clinical department or specialist to consult in ${targetLanguage}"
  ],
  "furtherExams": [
    "Suggested next imaging step or lab check in ${targetLanguage}"
  ],
  "recommendations": [
    "General supportive care or wellness notice in ${targetLanguage}"
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

    // Новейший SDK упаковывает текст глубоко в candidates. Проверяем все возможные пути:
    let resultText = "";
    if (response.text) {
      resultText = response.text;
    } else if (
      response.candidates &&
      response.candidates[0]?.content?.parts?.[0]?.text
    ) {
      resultText = response.candidates[0].content.parts[0].text;
    }

    resultText = resultText ? resultText.trim() : "";

    console.log("Extracted raw text length:", resultText.length);
    if (resultText.length > 0) {
      console.log("Raw text preview:", resultText.substring(0, 100));
    }

    if (!resultText) {
      console.error(
        "Error: Could not extract text from Gemini response structure. Full response:",
        JSON.stringify(response),
      );
      return res.status(500).json({
        error:
          "Model returned an unparseable response structure. Please try again.",
      });
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
