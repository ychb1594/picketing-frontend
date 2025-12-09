import { BrowserRouter, Routes, Route } from "react-router-dom";
import ChatbotMock from "./ChatbotMock";
import BrandList from "./BrandList";
import AnalysisView from "./AnalysisView";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BrandList />} />           // 목록 + 등록
        <Route path="/chatbot/:brandId" element={<ChatbotMock />} />  // 브랜드별 챗봇
        <Route path="/analysis/:reportId" element={<AnalysisView />} /> // 분석 결과
      </Routes>
    </BrowserRouter>
  );
}
