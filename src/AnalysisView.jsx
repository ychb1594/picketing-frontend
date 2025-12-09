import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const API_BASE = "http://3.38.101.140:8000";

/* =======================================================
   SUMMARY 안전 추출 함수
======================================================== */
function extractSummary(report) {
  if (!report || typeof report !== "object") return null;

  // 가장 흔한 위치
  if (report.summary) return report.summary;

  // adlog 형태 대응
  if (report.adlog?.payload?.summary) return report.adlog.payload.summary;
  if (report.adlog?.data?.summary) return report.adlog.data.summary;
  if (report.adlog?.summary) return report.adlog.summary;

  // 재귀 탐색 (어디든 summary가 있을 수 있음)
  const search = (obj) => {
    if (!obj || typeof obj !== "object") return null;
    if (obj.summary) return obj.summary;

    for (const key in obj) {
      const result = search(obj[key]);
      if (result) return result;
    }
    return null;
  };

  return search(report);
}

/* =======================================================
   MAIN COMPONENT
======================================================== */
export default function AnalysisView() {
  const { reportId } = useParams();
  const [raw, setRaw] = useState(null);
  const [report, setReport] = useState(null); // 🔥 정규화된 report
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* =======================================================
     리포트 로드
  ======================================================== */
  async function loadReport() {
    try {
      setLoading(true);
      setError(null);

      const r = await fetch(`${API_BASE}/v1/report/${reportId}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);

      const js = await r.json();
      if (js.error) throw new Error(js.error);

      console.log("📥 로드된 REPORT:", js);

      const reportJson = js.data;
      setRaw(reportJson);

      /* ------------------------------------------
         🔥 report_json 구조 정규화 (핵심 해결)
         - {report:{...}}
         - {result:{...}}
         - {register:{...}, report:{...}}
         - { ... 직접적인 분석 json ... }
        ------------------------------------------ */
      let normalized = reportJson;

      if (reportJson?.report) normalized = reportJson.report;
      if (reportJson?.result) normalized = reportJson.result;
      if (reportJson?.data?.report) normalized = reportJson.data.report;

      // register 항목은 분석과 무관 → 제거
      if (normalized?.register) delete normalized.register;

      setReport(normalized);
    } catch (e) {
      console.error("❌ Load error:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (reportId) loadReport();
  }, [reportId]);

  /* =======================================================
     로딩/에러/노데이터 처리
  ======================================================== */
  if (loading)
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <h2>🔄 리포트 로딩 중...</h2>
      </div>
    );

  if (error)
    return (
      <div style={{ padding: 20, textAlign: "center", color: "red" }}>
        <h2>⚠️ 오류 발생</h2>
        <p>{error}</p>
        <button onClick={loadReport}>다시 시도</button>
      </div>
    );

  if (!report)
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <h2>⚠️ 리포트 데이터가 없습니다</h2>
        <p>Report ID: {reportId}</p>
      </div>
    );

  /* =======================================================
     SUMMARY
  ======================================================== */
  const summary = extractSummary(report);

  if (!summary) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <h2>⚠️ Summary 없음</h2>

        <details>
          <summary>원본 데이터 보기</summary>
          <pre style={{ background: "#f5f5f5", padding: 10 }}>
            {JSON.stringify(raw, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  /* =======================================================
     SUMMARY 내부 KEY 정리
  ======================================================== */
  const meta = summary.meta || {};
  const my = summary.my_store || {};
  const top10 = summary.top10 || {};
  const rising = summary.rising || {};

  /* ---------------- 키워드 분석 ---------------- */
  const keywordAnalysis = report.keyword_analysis || {};
  const keywordMain = keywordAnalysis.main || {};
  const relatedSearch = keywordAnalysis.related || [];

  const gender = keywordAnalysis.ratio?.gender_ratio_pct || {};
  const age = keywordAnalysis.ratio?.age_ratio_pct || {};
  const bids = keywordAnalysis.bids || {};

  /* ---------------- 연관 키워드 ---------------- */
  const relatedKeywords = report.related_keywords || {};
  const relatedTags = relatedKeywords.related?.map((x) => x.title) || [];

  /* =======================================================
     공통 UI 섹션
  ======================================================== */
  const section = (title, content) => (
    <div
      style={{
        padding: "18px",
        background: "#fff",
        borderRadius: "14px",
        marginBottom: "18px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}
    >
      <h2 style={{ fontSize: "20px", fontWeight: "600" }}>{title}</h2>
      {content}
    </div>
  );

  /* =======================================================
     MAIN RENDER
  ======================================================== */
  return (
    <div
      style={{
        padding: 20,
        maxWidth: 900,
        margin: "0 auto",
        background: "#f8f9fa",
        minHeight: "100vh",
      }}
    >
      {/* 브랜드명 */}
      <div style={{ fontSize: "28px", fontWeight: "700", marginBottom: 10 }}>
        {meta.biz || raw?.brand || "브랜드명 없음"}
      </div>

      <h1 style={{ fontSize: "22px", marginBottom: 30 }}>📌 AI 플레이스 분석</h1>

      {/* ----------------------------------------------------- */}
      {/* 1. 상위 달성률 */}
      {/* ----------------------------------------------------- */}
      {section(
        "상위 달성률",
        <div>
          <p style={{ fontSize: "18px", fontWeight: "600", color: "#4CAF50" }}>
            상위 {my.top_percent ? (my.top_percent * 100).toFixed(1) : "-"}%
          </p>
          <p style={{ fontSize: "16px" }}>
            전체 {meta.total_places || "?"}곳 중 {my.rank_number || "?"}위
          </p>
          <p style={{ fontSize: "14px", color: "#666" }}>
            키워드: {meta.keyword || "?"}
          </p>
          <p style={{ fontSize: "14px", color: "#666" }}>
            월 검색량: {meta.monthly || "?"}
          </p>
        </div>
      )}

      {/* ----------------------------------------------------- */}
      {/* 2. 고객 DNA */}
      {/* ----------------------------------------------------- */}
      {section(
        "우리 고객 DNA",
        <div>
          <p>👩 여성 비율: {gender.female || 0}%</p>
          <p>📱 모바일 검색량: {keywordMain.mobile_search || 0}</p>

          {/* 최고 연령대 */}
          {(() => {
            const maxAge = Object.entries(age).reduce(
              (max, [k, v]) => (v > max.value ? { key: k, value: v } : max),
              { key: "", value: 0 }
            );
            return maxAge.key ? (
              <p style={{ fontSize: "16px", color: "#2196F3" }}>
                가장 많은 연령대: {maxAge.key.replace("age_", "")}대 (
                {maxAge.value}%)
              </p>
            ) : null;
          })()}

          {/* 연령대 UI */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {Object.keys(age)
              .sort(
                (a, b) =>
                  parseInt(a.replace("age_", "")) -
                  parseInt(b.replace("age_", ""))
              )
              .map((k) => (
                <div
                  key={k}
                  style={{
                    background: "#e3f2fd",
                    padding: "8px 12px",
                    borderRadius: "8px",
                  }}
                >
                  {k.replace("age_", "")}대 · {age[k]}%
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------- */}
      {/* 3. 대표 키워드 */}
      {/* ----------------------------------------------------- */}
      {relatedSearch.length > 0 &&
        section(
          "대표 키워드",
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {relatedSearch.map((kw, i) => (
              <span
                key={i}
                style={{
                  background: "#e6f0ff",
                  padding: "8px 14px",
                  borderRadius: "20px",
                  color: "#1976d2",
                }}
              >
                #{kw}
              </span>
            ))}
          </div>
        )}

      {/* ----------------------------------------------------- */}
      {/* 4. 연관 검색어 */}
      {/* ----------------------------------------------------- */}
      {relatedTags.length > 0 &&
        section(
          `'${meta.keyword}' 연관 검색`,
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {relatedTags.map((kw, i) => (
              <span
                key={i}
                style={{
                  background: "#f3e5f5",
                  padding: "8px 14px",
                  borderRadius: "20px",
                  color: "#7b1fa2",
                }}
              >
                #{kw}
              </span>
            ))}
          </div>
        )}

      {/* ----------------------------------------------------- */}
      {/* 5. TOP10 비교 */}
      {/* ----------------------------------------------------- */}
      {section(
        "TOP10 비교",
        <div>
          <p>방문자 리뷰: {my.visit || "?"} / 평균 {top10.visit_avg || "?"}</p>
          <p>블로그 리뷰: {my.blog || "?"} / 평균 {top10.blog_avg || "?"}</p>
        </div>
      )}

      {/* ----------------------------------------------------- */}
      {/* 6. 급상승 경쟁사 */}
      {/* ----------------------------------------------------- */}
      {section(
        "급상승 경쟁사",
        rising?.name ? (
          <div>
            <p style={{ fontSize: "18px", color: "#ff5722" }}>
              🔥 {rising.name}
            </p>
            <p>변화폭: {rising.move}</p>
            <p>
              방문자: {rising.visit || "?"} · 블로그:{" "}
              {rising.blog || "?"}
            </p>
          </div>
        ) : (
          <p style={{ color: "#888" }}>급상승 매장 없음</p>
        )
      )}

      {/* ----------------------------------------------------- */}
      {/* 7. CPC 입찰가 */}
      {/* ----------------------------------------------------- */}
      {section(
        "1위 달성 예상 CPC",
        bids.MOBILE ? (
          <div>
            {[1, 2, 3, 4, 5].map((rank) => (
              <p key={rank}>
                {rank}위: {bids.MOBILE[rank] || "?"}원
              </p>
            ))}
          </div>
        ) : (
          <p style={{ color: "#888" }}>입찰가 데이터 없음</p>
        )
      )}

      {/* 개발용 디버그 */}
      {process.env.NODE_ENV === "development" && (
        <details
          style={{
            marginTop: 40,
            padding: 20,
            background: "#eee",
            borderRadius: 8,
          }}
        >
          <summary>원본 데이터 보기</summary>
          <pre>{JSON.stringify(raw, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
