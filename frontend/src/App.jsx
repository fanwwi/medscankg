import React, { useState, useRef } from "react";
import axios from "axios";
import { Upload, FileImage, Activity, Globe } from "lucide-react";
import "./App.css";

const BACKEND_URL = "https://medscankg.onrender.com";

// Словарик для статического контента фронтенда
const translations = {
  en: {
    heroTitle: "Advanced Chest X-Ray Analysis",
    heroDesc:
      "Instantly upload chest radiographs and get comprehensive diagnostic insights without data tracking.",
    startDiag: "Start Diagnosis",
    labelImg: "Chest X-Ray Image",
    dropzoneText: "Click to choose JPG, PNG, JPEG, or WEBP",
    labelSymptoms: "Patient Symptoms",
    placeholderSymptoms:
      "e.g. cough, chest pain, fever, shortness of breath...",
    btnAnalyze: "Analyze Image",
    btnAnalyzing: "Analyzing...",
    processing: "Processing Radiograph",
    loadingDesc: "AI is examining structures and computing metric risks...",
    assessedRisk: "Assessed Risk Level",
    possibleDiag: "Possible Diagnoses",
    thDisease: "Disease",
    thProb: "Probability",
    detailedAnalysis: "Detailed Analysis",
    recSpecialists: "Recommended Specialists",
    furtherExams: "Further Exams",
    recommendations: "Recommendations",
    emptyText:
      "Upload an image and run the diagnostics pipeline to see results.",
    errSelect: "Please select an X-ray image.",
  },
  ru: {
    heroTitle: "Продвинутый Анализ Рентгенограмм",
    heroDesc:
      "Мгновенно загружайте снимки грудной клетки и получайте полные диагностические данные без отслеживания истории.",
    startDiag: "Начать диагностику",
    labelImg: "Снимок рентгена",
    dropzoneText: "Нажмите, чтобы выбрать JPG, PNG, JPEG или WEBP",
    labelSymptoms: "Симптомы пациента",
    placeholderSymptoms:
      "например: кашель, боль в груди, температура, одышка...",
    btnAnalyze: "Анализировать снимок",
    btnAnalyzing: "Анализ...",
    processing: "Обработка снимка",
    loadingDesc: "ИИ исследует структуру тканей и рассчитывает риски...",
    assessedRisk: "Оцененный уровень риска",
    possibleDiag: "Возможные диагнозы",
    thDisease: "Заболевание",
    thProb: "Вероятность",
    detailedAnalysis: "Подробный разбор",
    recSpecialists: "Рекомендуемые специалисты",
    furtherExams: "Дополнительные обследования",
    recommendations: "Рекомендации",
    emptyText:
      "Загрузите снимок и запустите диагностику, чтобы увидеть результаты.",
    errSelect: "Пожалуйста, выберите снимок рентгена.",
  },
};

function App() {
  const [lang, setLang] = useState("en"); // Переключение языка (en/ru)
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);
  const t = translations[lang];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) {
      setError(t.errSelect);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("image", image);
    formData.append("symptoms", symptoms);
    formData.append("language", lang); // Передаем язык на бэкенд для Gemini!

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/analyze`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      setResult(response.data);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error || "An error occurred during analysis.",
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleLang = () => {
    setLang((prev) => (prev === "en" ? "ru" : "en"));
  };

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="nav-logo">
          <Activity size={28} />
          MedScan<span>KG</span>
        </div>
        <button className="lang-toggle-btn" onClick={toggleLang}>
          <Globe size={18} />
          {lang === "en" ? "Русский" : "English"}
        </button>
      </nav>

      <main className="main-content">
        <section className="hero">
          <h1>
            {lang === "en" ? (
              <>
                Advanced <span>Chest X-Ray </span>Analysis
              </>
            ) : (
              <>
                Продвинутый <span>Анализ </span>Рентгенограмм
              </>
            )}
          </h1>
          <p>{t.heroDesc}</p>
        </section>

        <div className="analysis-container">
          {/* Левая колонка: Форма */}
          <div className="analysis-form-panel">
            <h2 style={{ marginBottom: "1.5rem" }}>{t.startDiag}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{t.labelImg}</label>
                <div
                  className="dropzone"
                  onClick={() => fileInputRef.current.click()}
                >
                  <Upload
                    className="feature-icon"
                    size={24}
                    style={{ margin: "0 auto 0.5rem" }}
                  />
                  <p
                    style={{
                      fontSize: "0.9rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {t.dropzoneText}
                  </p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="file-input"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>

                {preview && (
                  <div className="preview-container">
                    <img
                      src={preview}
                      alt="Preview"
                      className="preview-image"
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>{t.labelSymptoms}</label>
                <textarea
                  className="textarea-input"
                  placeholder={t.placeholderSymptoms}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
              </div>

              {error && (
                <p style={{ color: "var(--risk-high)", marginBottom: "1rem" }}>
                  {error}
                </p>
              )}

              <button type="submit" className="btn btn-full" disabled={loading}>
                {loading ? t.btnAnalyzing : t.btnAnalyze}
              </button>
            </form>
          </div>

          {/* Правая колонка: Результаты */}
          <div className="analysis-result-panel">
            {loading && (
              <div className="loading-box">
                <div className="spinner"></div>
                <h3>{t.processing}</h3>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    marginTop: "0.5rem",
                  }}
                >
                  {t.loadingDesc}
                </p>
              </div>
            )}

            {result && (
              <div className="result-panel">
                <div className="result-header-block">
                  {preview && (
                    <img src={preview} alt="X-Ray" className="result-xray" />
                  )}
                  <div
                    className={`risk-card ${(result.riskLevel || "Low").toLowerCase()}`}
                  >
                    <div className="risk-title">{t.assessedRisk}</div>
                    <div className="risk-value">{result.riskLevel}</div>
                  </div>
                </div>

                <div className="result-section">
                  <h3>{t.possibleDiag}</h3>
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>{t.thDisease}</th>
                        <th>{t.thProb}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.diseases?.map((d, idx) => (
                        <tr key={idx}>
                          <td>
                            <strong>{d.name}</strong>
                          </td>
                          <td>{d.probability}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="result-section">
                  <h3>{t.detailedAnalysis}</h3>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      lineHeight: "1.6",
                      marginTop: "0.5rem",
                    }}
                  >
                    {result.detailedAnalysis}
                  </p>
                </div>

                <div className="result-section">
                  <h3>{t.recSpecialists}</h3>
                  <ul className="info-list">
                    {result.specialists?.map((spec, idx) => (
                      <li key={idx}>{spec}</li>
                    ))}
                  </ul>
                </div>

                <div className="result-section">
                  <h3>{t.furtherExams}</h3>
                  <ul className="info-list">
                    {result.furtherExams?.map((exam, idx) => (
                      <li key={idx}>{exam}</li>
                    ))}
                  </ul>
                </div>

                <div className="result-section">
                  <h3>{t.recommendations}</h3>
                  <ul className="info-list">
                    {result.recommendations?.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {!loading && !result && (
              <div className="empty-box">
                <FileImage
                  size={48}
                  style={{ opacity: 0.3, marginBottom: "1rem" }}
                />
                <p style={{ color: "var(--text-secondary)" }}>{t.emptyText}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
