import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// В новом SDK правильная инициализация пишется как new GoogleGenAI({ apiKey: ... })
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post("/api/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Please upload an X-ray image" });
    }

    const { symptoms } = req.body;

    const promptText = `
You are a professional pulmonologist and radiologist.
Analyze the uploaded chest X-ray image together with the patient symptoms.
Patient Symptoms: ${symptoms || "None reported"}

Return ONLY valid JSON. Do not include markdown blocks like \\\`json. No text outside JSON.

{
  "riskLevel": "High | Medium | Low",
  "diseases": [
    {
      "name": "Disease name",
      "probability": "85%"
    }
  ],
  "detailedAnalysis": "Detailed explanation",
  "specialists": [
    "Pulmonologist"
  ],
  "furtherExams": [
    "CT Scan"
  ],
  "recommendations": [
    "Recommendation"
  ]
}
`;

    // Исправленный вызов для актуального SDK: ai.models.generateContent
    // Вызов Gemini API с принудительной конфигурацией JSON
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Вернули легкую и доступную модель
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
        responseMimeType: "application/json", // Google гарантирует ответ строго в JSON без markdown разметки
      },
    });

    let resultText = response.text.trim();

    if (resultText.startsWith("```")) {
      resultText = resultText
        .replace(/^```json?/, "")
        .replace(/```$/, "")
        .trim();
    }

    const parsedData = JSON.parse(resultText);
    res.json(parsedData);
  } catch (error) {
    console.error("Detailed Server Error:", error);
    res.status(500).json({
      error:
        "Failed to analyze image. Check terminal logs or API key validity.",
    });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
