// BrandList.jsx — PostgreSQL 서버 대응 완전 안정판

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function BrandList() {
  const API_BASE = "/api";
  const navigate = useNavigate();

  const [brandList, setBrandList] = useState([]);

  // 입력 필드
  const [placeUrl, setPlaceUrl] = useState("");
  const [keyword, setKeyword] = useState("");

  // 업장 기본 정보
  const [placeInfo, setPlaceInfo] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // 초기 로딩
  useEffect(() => {
    loadBrandList();
  }, []);

  /* ==========================================
     브랜드 목록 조회
  ========================================== */
  async function loadBrandList() {
    try {
      const r = await fetch(`${API_BASE}/v1/adlinks`);
      const js = await r.json();

      console.log("📋 브랜드 목록:", js);

      if (Array.isArray(js.data)) {
        setBrandList(js.data);
      }
    } catch (err) {
      console.error("❌ 브랜드 목록 로드 실패:", err);
    }
  }

  /* ==========================================
     업장 기본 정보 조회 (/place/info)
  ========================================== */
  async function verifyPlace() {
    if (!placeUrl.trim() || !keyword.trim()) {
      alert("플레이스 URL과 키워드를 입력해주세요.");
      return;
    }

    setIsVerifying(true);
    setPlaceInfo(null);

    try {
      const res = await fetch(`${API_BASE}/place/info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          place_url: placeUrl
        }),
      });

      const js = await res.json();
      console.log("🔍 업장정보:", js);

      if (js.success) {
        setPlaceInfo(js.data);
      } else {
        alert(`업장 정보 조회 실패: ${js.error}`);
      }
    } catch (e) {
      console.error("❌ 업장 확인 오류:", e);
      alert("업장 확인 중 오류 발생");
    } finally {
      setIsVerifying(false);
    }
  }

  /* ==========================================
     브랜드 등록 (/brand/register)
     → Agent가 register 작업 처리
  ========================================== */
  async function registerBrand() {
    if (!placeInfo) {
      alert("업장 확인이 먼저 필요합니다.");
      return;
    }

    try {
      const r = await fetch(`${API_BASE}/brand/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_name: placeInfo.name,
          place_url: placeUrl,
          keyword,
        })
      });

      const js = await r.json();
      console.log("📝 등록 결과:", js);

      alert(`브랜드 '${placeInfo.name}' 등록 완료! (Task ${js.task_id})`);

      // 초기화
      setPlaceUrl("");
      setKeyword("");
      setPlaceInfo(null);

      // 목록 새로고침
      loadBrandList();
    } catch (err) {
      console.error("❌ 등록 오류:", err);
      alert("등록 실패: " + err.message);
    }
  }

  /* ==========================================
     분석 요청 (task/create → report)
  ========================================== */
  async function startAnalysis(row) {
    if (!row.share_url || !row.success) {
      alert("Agent가 아직 share_url을 생성하지 않았습니다.");
      return;
    }

    try {
      const r = await fetch(`${API_BASE}/task/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "report",
          brand_name: row.brand_name,
          place_url: row.place_id,   // place_id 사용!
          share_url: row.share_url,
          keyword: row.keyword
        })
      });

      const js = await r.json();
      console.log("📊 분석 시작:", js);

      alert(`분석 작업 시작 (Task ${js.task_id})\n1~2분 뒤 '최신 분석 보기'를 눌러 확인하세요.`);
    } catch (e) {
      console.error("❌ 분석 생성 오류:", e);
      alert("분석 실패: " + e.message);
    }
  }

  /* ==========================================
     최신 분석 보기 (/v1/reports → navigate)
  ========================================== */
  async function openLatestReport(brandName) {
    try {
      const r = await fetch(`${API_BASE}/v1/reports`);
      const js = await r.json();

      if (!js.reports || js.reports.length === 0) {
        alert("아직 생성된 리포트가 없습니다.");
        return;
      }

      // 해당 브랜드만 필터링
      const filtered = js.reports.filter(x => x.brand_name === brandName);

      if (filtered.length === 0) {
        alert("해당 브랜드의 리포트가 없습니다.");
        return;
      }

      const latest = filtered[0];
      console.log("📄 최신 리포트:", latest);

      navigate(`/analysis/${latest.id}`); // report_id → id correctly
    } catch (err) {
      console.error(err);
      alert("리포트 조회 오류");
    }
  }

  /* ==========================================
     화면 렌더
  ========================================== */
  return (
    <div style={{ width: "100%", padding: 24 }}>
      <h1>브랜드 관리</h1>

      {/* ------------------------------ */}
      {/* 신규 브랜드 등록 */}
      {/* ------------------------------ */}
      <div style={{ background: "#fff", padding: 20, borderRadius: 8, marginBottom: 30 }}>
        <h2>새 브랜드 등록</h2>

        <div style={{ marginBottom: 15 }}>
          <input
            placeholder="플레이스 URL"
            value={placeUrl}
            onChange={(e) => setPlaceUrl(e.target.value)}
            style={{ width: 300, marginRight: 8 }}
          />
          <input
            placeholder="키워드"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 200, marginRight: 8 }}
          />
          <button onClick={verifyPlace} disabled={isVerifying}>
            {isVerifying ? "확인 중..." : "업장 확인"}
          </button>
        </div>

        {placeInfo && (
          <div style={{ background: "#e3f2fd", padding: 15, borderRadius: 8 }}>
            <b>업장명:</b> {placeInfo.name}<br />
            <b>카테고리:</b> {Array.isArray(placeInfo.category) ? placeInfo.category.join(" > ") : placeInfo.category}<br />
            <b>주소:</b> {placeInfo.address}<br />

            <button
              onClick={registerBrand}
              style={{ marginTop: 10, padding: "8px 16px", background: "#4caf50", color: "white" }}
            >
              이 업장으로 등록하기
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------ */}
      {/* 브랜드 목록 */}
      {/* ------------------------------ */}
      <div style={{ background: "#fff", padding: 20, borderRadius: 8 }}>
        <h2>등록된 브랜드</h2>

        {brandList.length === 0 && <p>아직 등록된 브랜드가 없습니다.</p>}

        {brandList.map((row) => (
          <div key={row.id} style={{ border: "1px solid #ddd", padding: 15, marginBottom: 15, borderRadius: 8 }}>
            <h3>{row.brand_name}</h3>

            <p>📌 Place ID: {row.place_id}</p>
            <p>🔗 Share URL: {row.share_url || "생성 중..."}</p>
            <p>🎯 Keyword: {row.keyword}</p>

            {row.error && <p style={{ color: "red" }}>⚠ 오류: {row.error}</p>}

            <button
              onClick={() => startAnalysis(row)}
              disabled={!row.share_url || !row.success}
              style={{
                background: row.share_url && row.success ? "#4caf50" : "#ccc",
                color: "white",
                marginRight: 10,
                padding: "8px 16px"
              }}
            >
              분석하기
            </button>

            <button
              onClick={() => openLatestReport(row.brand_name)}
              style={{ background: "#2196f3", color: "white", padding: "8px 16px" }}
            >
              최신 분석 보기
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
