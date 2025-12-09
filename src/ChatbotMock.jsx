// ChatbotMock.jsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ChatbotMock() {
  const API_BASE = "http://3.38.101.140:8000";

  const navigate = useNavigate();

  const [messages, setMessages] = useState([
    { role: "bot", text: "안녕하세요! 브랜드 분석을 시작할까요?" },
  ]);

  const [brandList, setBrandList] = useState([]);
  
  // 입력 필드
  const [placeUrl, setPlaceUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  
  // 업장 정보 확인 상태
  const [placeInfo, setPlaceInfo] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, brandList]);

  // 컴포넌트 마운트 시 브랜드 목록 로드
  useEffect(() => {
    loadBrandList();
  }, []);

  // 업장 정보 확인
  async function verifyPlace() {
    if (!placeUrl || !keyword) {
      alert("플레이스 URL과 키워드를 모두 입력해주세요!");
      return;
    }

    setIsVerifying(true);
    
    try {
      const res = await fetch(`${API_BASE}/place/info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword,
          place_url: placeUrl,
        }),
      });

      const result = await res.json();
      
      console.log("✅ 업장 정보:", result);

      if (result.success) {
        setPlaceInfo(result.data);
        setMessages((m) => [
          ...m,
          {
            role: "bot",
            text: `업장 정보를 찾았습니다! 아래 정보가 맞는지 확인해주세요.`,
          },
        ]);
      } else {
        alert("업장 정보를 찾을 수 없습니다: " + result.error);
        setPlaceInfo(null);
      }
    } catch (err) {
      console.error("❌ 업장 확인 에러:", err);
      alert("업장 정보 조회 실패: " + err.message);
      setPlaceInfo(null);
    } finally {
      setIsVerifying(false);
    }
  }

  // 브랜드 등록하기
  async function registerBrand() {
    if (!placeInfo) {
      alert("먼저 업장 정보를 확인해주세요!");
      return;
    }

    try {
      const result = await fetch(`${API_BASE}/brand/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_name: placeInfo.name, // 업장명을 브랜드명으로 사용
          place_url: placeUrl,
          keyword: keyword,
        }),
      }).then((r) => r.json());

      console.log("✅ 등록 완료:", result);

      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: `브랜드 '${placeInfo.name}' 등록 완료! Agent가 처리 중입니다. (Task ID: ${result.task_id})`,
        },
      ]);

      // 입력 필드 및 확인 정보 초기화
      setPlaceUrl("");
      setKeyword("");
      setPlaceInfo(null);

      // 목록 새로고침
      loadBrandList();
    } catch (err) {
      console.error("❌ 등록 에러:", err);
      alert("등록 실패: " + err.message);
    }
  }

  // 브랜드 목록 불러오기
  async function loadBrandList() {
    try {
      const res = await fetch(`${API_BASE}/v1/adlinks`);
      const json = await res.json();
      
      console.log("📋 브랜드 목록:", json);

      if (json.data) {
        // 배열을 객체로 변환
        const brands = json.data.map((row) => ({
          id: row[0],
          brand_name: row[1],
          input_url: row[2],
          place_id: row[3],
          m_place_url: row[4],
          share_url: row[5],
          keyword: row[6],
          created_at: row[12],
        }));
        setBrandList(brands);
      }
    } catch (err) {
      console.error("❌ 목록 로드 실패:", err);
    }
  }

  // 분석하기 (report task 생성)
  async function startAnalysis(brandData) {
    if (!brandData.share_url) {
      alert("아직 share_url이 생성되지 않았습니다. Agent가 처리 중입니다.");
      return;
    }

    try {
      const result = await fetch(`${API_BASE}/task/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "report",
          brand_name: brandData.brand_name,
          place_url: brandData.input_url,
          share_url: brandData.share_url,
          keyword: brandData.keyword,
        }),
      }).then((r) => r.json());

      console.log("✅ 분석 시작:", result);

      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: `'${brandData.brand_name}' 분석 시작! 1~2분 후 확인하세요. (Task ID: ${result.task_id})`,
        },
      ]);

      alert(`분석 시작! Task ID: ${result.task_id}`);
    } catch (err) {
      console.error("❌ 분석 시작 실패:", err);
      alert("분석 시작 실패: " + err.message);
    }
  }

  // 최신 리포트 열기
  async function handleOpenLatestReport(brand) {
    try {
      const res = await fetch(`${API_BASE}/v1/reports`);
      const json = await res.json();

      console.log("📊 리포트 응답:", json);

      if (!json || !json.reports) {
        console.error("❌ /v1/reports 응답 오류:", json);
        alert("리포트 조회 실패");
        return;
      }

      const filtered = json.reports.filter((x) => x.brand_name === brand);

      if (filtered.length === 0) {
        alert("아직 생성된 리포트가 없습니다.");
        return;
      }

      const latest = filtered[0];

      // report_id로 navigate
      navigate(`/analysis/${latest.report_id}`);

    } catch (err) {
      console.error("❌ handleOpenLatestReport Error:", err);
      alert("리포트 조회 실패: " + err.message);
    }
  }


  return (
    <div style={{ width: "100%", height: "100vh", padding: 24 }}>
      <h2>브랜드 등록 및 분석</h2>

      {/* 입력창 */}
      <div style={{ marginTop: 20 }}>
        <input
          placeholder="플레이스 URL"
          value={placeUrl}
          onChange={(e) => setPlaceUrl(e.target.value)}
          style={{ width: 300, marginRight: 8 }}
        />
        <input
          placeholder="타겟 키워드"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: 300, marginRight: 8 }}
        />

        <button
          onClick={verifyPlace}
          disabled={isVerifying}
          style={{
            padding: "8px 16px",
            background: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isVerifying ? "wait" : "pointer",
          }}
        >
          {isVerifying ? "확인 중..." : "업장 확인"}
        </button>
      </div>

      {/* 업장 정보 확인 영역 */}
      {placeInfo && (
        <div
          style={{
            marginTop: 20,
            padding: 20,
            background: "#e3f2fd",
            borderRadius: 8,
            border: "2px solid #2196F3",
          }}
        >
          <h3 style={{ marginTop: 0 }}>✅ 업장 정보 확인</h3>
          <div style={{ marginBottom: 8 }}>
            <strong>업장명:</strong> {placeInfo.name}
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>카테고리:</strong> {placeInfo.category?.join(" > ") || "정보 없음"}
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>주소:</strong> {placeInfo.address || "정보 없음"}
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>도로명주소:</strong> {placeInfo.roadAddress || "정보 없음"}
          </div>
          {placeInfo.tel && (
            <div style={{ marginBottom: 8 }}>
              <strong>전화번호:</strong> {placeInfo.tel}
            </div>
          )}
          
          <div style={{ marginTop: 16 }}>
            <button
              onClick={registerBrand}
              style={{
                padding: "10px 20px",
                background: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            >
              이 업장으로 등록하기
            </button>
            <button
              onClick={() => {
                setPlaceInfo(null);
                setPlaceUrl("");
                setKeyword("");
              }}
              style={{
                marginLeft: 8,
                padding: "10px 20px",
                background: "#f44336",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 브랜드 목록 */}
      <div style={{ marginTop: 40 }}>
        <h3>등록된 브랜드 목록</h3>
        {brandList.length === 0 && <p>등록된 브랜드가 없습니다.</p>}

        {brandList.map((b) => (
          <div
            key={b.id}
            style={{
              marginBottom: 12,
              padding: 12,
              background: "#f7f7f7",
              borderRadius: 8,
              border: "1px solid #ddd",
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <b style={{ fontSize: "16px" }}>{b.brand_name}</b>
            </div>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: 4 }}>
              URL: {b.input_url}
            </div>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: 4 }}>
              키워드: {b.keyword}
            </div>
            <div style={{ fontSize: "14px", color: "#666", marginBottom: 8 }}>
              Share URL: {b.share_url || "생성 중..."}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button 
                style={{ 
                  padding: "6px 12px",
                  background: b.share_url ? "#4CAF50" : "#ccc",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: b.share_url ? "pointer" : "not-allowed",
                }}
                onClick={() => startAnalysis(b)}
                disabled={!b.share_url}
              >
                분석하기
              </button>
              
              <button 
                style={{ 
                  padding: "6px 12px",
                  background: "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
                onClick={() => handleOpenLatestReport(b.brand_name)}
              >
                최신 분석 보기
              </button>
            </div>
          </div>
        ))}
      </div>

      <div ref={endRef} />
    </div>
  );
}