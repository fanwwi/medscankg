import React, { useState, useRef } from "react";
import axios from "axios";
import { Upload, FileImage, Activity, Shield, Zap } from "lucide-react";
import "./App.css";

const BACKEND_URL = "https://medscankg.onrender.com";

function App() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);

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
      setError("Please select an X-ray image.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("image", image);
    formData.append("symptoms", symptoms);

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

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="nav-logo">
          <Activity size={28} />
          MedScan<span>KG</span>
        </div>
      </nav>

      <main className="main-content">
        <section className="hero">
          <h1>
            Advanced <span>Chest X-Ray </span>Analysis
          </h1>
          <p>
            Instantly upload chest radiographs and get comprehensive diagnostic
            insights without data tracking.
          </p>
        </section>

        <div className="analysis-container">
          {/* Левая колонка: Форма */}
          <div className="analysis-form-panel">
            <h2 style={{ marginBottom: "1.5rem" }}>Start Diagnosis</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Chest X-Ray Image</label>
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
                    Click to choose JPG, PNG, JPEG, or WEBP
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
                <label>Patient Symptoms</label>
                <textarea
                  className="textarea-input"
                  placeholder="e.g. cough, chest pain, fever, shortness of breath..."
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
                {loading ? "Analyzing..." : "Analyze Image"}
              </button>
            </form>
          </div>

          {/* Правая колонка: Единый контейнер для результатов и состояний */}
          <div className="analysis-result-panel">
            {loading && (
              <div className="loading-box">
                <div className="spinner"></div>
                <h3>Processing Radiograph</h3>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    marginTop: "0.5rem",
                  }}
                >
                  AI is examining structures and computing metric risks...
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
                    <div className="risk-title">Assessed Risk Level</div>
                    <div className="risk-value">{result.riskLevel}</div>
                  </div>
                </div>

                <div className="result-section">
                  <h3>Possible Diagnoses</h3>
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>Disease</th>
                        <th>Probability</th>
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
                  <h3>Detailed Analysis</h3>
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
                  <h3>Recommended Specialists</h3>
                  <ul className="info-list">
                    {result.specialists?.map((spec, idx) => (
                      <li key={idx}>{spec}</li>
                    ))}
                  </ul>
                </div>

                <div className="result-section">
                  <h3>Further Exams</h3>
                  <ul className="info-list">
                    {result.furtherExams?.map((exam, idx) => (
                      <li key={idx}>{exam}</li>
                    ))}
                  </ul>
                </div>

                <div className="result-section">
                  <h3>Recommendations</h3>
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
                <p style={{ color: "var(--text-secondary)" }}>
                  Upload an image and run the diagnostics pipeline to see
                  results.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
