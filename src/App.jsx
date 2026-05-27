
import React, { useMemo, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { motion } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import {
  QrCode, MapPin, Clock, Camera, CheckCircle2, AlertTriangle,
  ClipboardCheck, Send, Building2, UserRound, FileText, ShieldCheck,
  ArrowRight, Link as LinkIcon, RotateCcw
} from "lucide-react";
import "./style.css";

const MAKE_WEBHOOK_URL = ""; 
// Make Webhook 연결 후 위 따옴표 안에 Webhook URL을 넣으세요.
// 예: const MAKE_WEBHOOK_URL = "https://hook.eu2.make.com/xxxxxxx";

const FIELD_SITES = [
  {
    id: "reto_clinic",
    name: "리투의원",
    type: "병원 정기청소",
    address: "서울 강남구 청담동",
    worker: "지용",
    requiredCloseTime: "09:30 전 마감",
    priority: "높음",
    repeatedIssues: ["6층 관리실 거울", "세면대 선반", "출입문 유리", "파우더룸", "창틀 날파리", "원장실 쇼파 밑", "환자 베드 밑"],
  },
  {
    id: "heisa_crossfit",
    name: "HEISA 크로스핏",
    type: "피트니스 정기청소",
    address: "서울 서초구 사평대로26길 8",
    worker: "담당자",
    requiredCloseTime: "토요일 오후 작업",
    priority: "보통",
    repeatedIssues: ["남녀 탈의실", "화장실", "리커버리룸", "야외 테라스", "검정 매트 바닥"],
  },
];

const PHOTO_POINTS = {
  reto_clinic: [
    { key: "arrival", label: "출근 도착 사진", required: true, note: "입구 또는 지정 위치" },
    { key: "lobby", label: "로비/대기실 완료", required: true, note: "첫인상 구역" },
    { key: "glass", label: "5층·6층 출입문 유리", required: true, note: "손자국·얼룩 확인" },
    { key: "powder", label: "파우더룸 완료", required: true, note: "먼지·머리카락" },
    { key: "toilet", label: "화장실 완료", required: true, note: "세면대·거울·바닥" },
    { key: "trash", label: "쓰레기 배출", required: true, note: "배출 후 상태" },
    { key: "window", label: "창틀/날파리 구역", required: false, note: "요청 시 전후 사진" },
    { key: "director", label: "원장실 쇼파 밑/휴게공간", required: false, note: "요청 시 전후 사진" },
    { key: "leave", label: "퇴근 완료 사진", required: true, note: "최종 상태" },
  ],
  heisa_crossfit: [
    { key: "arrival", label: "출근 도착 사진", required: true, note: "입구 또는 지정 위치" },
    { key: "floor", label: "운동공간 바닥", required: true, note: "땀자국·먼지" },
    { key: "locker", label: "남녀 탈의실", required: true, note: "머리카락·먼지" },
    { key: "toilet", label: "화장실/샤워실", required: true, note: "물기·냄새" },
    { key: "recovery", label: "리커버리룸", required: false, note: "사용 흔적" },
    { key: "patio", label: "야외 테라스", required: false, note: "낙엽·쓰레기" },
    { key: "leave", label: "퇴근 완료 사진", required: true, note: "최종 상태" },
  ],
};

const ISSUE_TYPES = ["특이사항 없음", "소모품 부족", "시설 문제", "오염 심함", "고객 요청", "출입 제한", "날파리/벌레", "장비 접근 제한", "작업 미완료", "기타"];

function getInitialSiteId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("site") || "reto_clinic";
}

function getAppBaseUrl() {
  return window.location.origin + window.location.pathname;
}

function StatusBadge({ children, tone = "default" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function Button({ children, onClick, variant = "primary", disabled = false, type = "button" }) {
  return <button type={type} onClick={onClick} disabled={disabled} className={`btn ${variant}`} >{children}</button>;
}

function Card({ children, className = "" }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export default function App() {
  const [mode, setMode] = useState("qr");
  const [siteId, setSiteId] = useState(getInitialSiteId());
  const [worker, setWorker] = useState("");
  const [step, setStep] = useState(1);
  const [checkType, setCheckType] = useState("출근");
  const [photos, setPhotos] = useState({});
  const [checked, setChecked] = useState({});
  const [issueType, setIssueType] = useState("특이사항 없음");
  const [memo, setMemo] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [geo, setGeo] = useState(null);

  const site = FIELD_SITES.find((s) => s.id === siteId) || FIELD_SITES[0];
  const photoPoints = PHOTO_POINTS[site.id] || [];
  const requiredPoints = photoPoints.filter((p) => p.required);
  const uploadedRequired = requiredPoints.filter((p) => photos[p.key]).length;
  const checkedRequired = requiredPoints.filter((p) => checked[p.key]).length;
  const completion = Math.round(((uploadedRequired + checkedRequired) / (requiredPoints.length * 2)) * 100);
  const siteUrl = `${getAppBaseUrl()}?site=${site.id}`;

  useEffect(() => {
    setWorker(site.worker || "");
  }, [site.id]);

  const now = useMemo(() => {
    const d = new Date();
    return d.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  }, [submitted, step]);

  const getLocation = () => {
    if (!navigator.geolocation) {
      setSubmitMessage("이 기기는 위치 기록을 지원하지 않습니다.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setSubmitMessage("위치가 기록되었습니다.");
      },
      () => setSubmitMessage("위치 권한이 거부되었습니다. 위치 없이 제출할 수 있습니다.")
    );
  };

  const notionPayload = {
    site: site.name,
    siteId: site.id,
    worker,
    checkType,
    submittedAt: now,
    status: completion >= 85 ? "완료" : "확인필요",
    requiredPhotoCount: requiredPoints.length,
    uploadedRequired,
    completion,
    issueType,
    memo,
    location: geo,
    photos,
    checklist: checked,
  };

  const handlePhoto = (key, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotos((prev) => ({
        ...prev,
        [key]: {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          base64: reader.result
        }
      }));
      setChecked((prev) => ({ ...prev, [key]: true }));
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setStep(1);
    setCheckType("출근");
    setPhotos({});
    setChecked({});
    setIssueType("특이사항 없음");
    setMemo("");
    setSubmitted(false);
    setSubmitMessage("");
    setGeo(null);
  };

  const submitToWebhook = async () => {
    setSubmitMessage("제출 중입니다...");
    if (!MAKE_WEBHOOK_URL) {
      setSubmitted(true);
      setSubmitMessage("Webhook URL이 아직 비어 있어 화면상 제출만 완료했습니다. Make Webhook 연결 후 실제 Notion 저장됩니다.");
      setMode("admin");
      return;
    }
    try {
      const res = await fetch(MAKE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notionPayload),
      });
      if (!res.ok) throw new Error("Webhook error");
      setSubmitted(true);
      setSubmitMessage("제출 완료. Make/Notion으로 전송되었습니다.");
      setMode("admin");
    } catch (e) {
      setSubmitMessage("전송 실패. Webhook URL 또는 Make 시나리오를 확인하세요.");
    }
  };

  return (
    <div className="app">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="hero">
          <div>
            <div className="eyebrow"><ShieldCheck size={16} /> KB클린 정기청소 현장관리 v0.1</div>
            <h1>QR 출근 · 사진증빙 · Notion 저장 웹앱</h1>
            <p>직원이 현장 QR을 찍고 출근, 필수 사진, 퇴근, 특이사항을 등록하는 모바일용 프로토타입입니다.</p>
          </div>
          <div className="heroStats">
            <div><b>{completion}%</b><span>완료율</span></div>
            <div><b>{uploadedRequired}/{requiredPoints.length}</b><span>필수사진</span></div>
          </div>
        </motion.div>

        <div className="tabs">
          {[
            ["qr", "1. QR 생성", QrCode],
            ["mobile", "2. 모바일 등록", Camera],
            ["admin", "3. 관리자 확인", ClipboardCheck],
            ["notion", "4. 전송 데이터", FileText],
          ].map(([key, label, Icon]) => (
            <button key={key} onClick={() => setMode(key)} className={mode === key ? "tab active" : "tab"}>
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {mode === "qr" && (
          <div className="grid two">
            <Card>
              <h2><QrCode size={24} /> 현장 QR</h2>
              <div className="siteList">
                {FIELD_SITES.map((s) => (
                  <button key={s.id} onClick={() => setSiteId(s.id)} className={site.id === s.id ? "site active" : "site"}>
                    <strong>{s.name}</strong>
                    <small>{s.type}</small>
                    <StatusBadge tone={s.priority === "높음" ? "warn" : "default"}>중요도 {s.priority}</StatusBadge>
                  </button>
                ))}
              </div>
              <div className="qrBox">
                <QRCodeCanvas value={siteUrl} size={210} includeMargin />
                <strong>{site.name} QR</strong>
              </div>
            </Card>

            <Card>
              <div className="cardHeader">
                <div>
                  <h2>{site.name} 접속 정보</h2>
                  <p>이 링크를 QR로 변환해서 현장에 붙이면 됩니다.</p>
                </div>
                <StatusBadge tone="good">QR 준비</StatusBadge>
              </div>
              <div className="linkBox">
                <LinkIcon size={16} /> <span>{siteUrl}</span>
              </div>
              <div className="infoGrid">
                <Info icon={Building2} label="현장 유형" value={site.type} />
                <Info icon={UserRound} label="기본 작업자" value={site.worker} />
                <Info icon={Clock} label="시간 기준" value={site.requiredCloseTime} />
                <Info icon={MapPin} label="주소" value={site.address} />
              </div>
              <div className="issueBox">
                <strong>반복 요청사항</strong>
                <div className="chips">
                  {site.repeatedIssues.map((x) => <StatusBadge key={x} tone="warn">{x}</StatusBadge>)}
                </div>
              </div>
              <Button onClick={() => { setMode("mobile"); resetForm(); }}>
                모바일 등록화면 열기 <ArrowRight size={18} />
              </Button>
            </Card>
          </div>
        )}

        {mode === "mobile" && (
          <div className="phoneWrap">
            <div className="phone">
              <div className="phoneTop">직원 모바일 등록 화면</div>
              <div className="phoneBody">
                <div className="siteSummary">
                  <small>현재 현장</small>
                  <strong>{site.name}</strong>
                  <div className="chips">
                    <StatusBadge>{site.type}</StatusBadge>
                    <StatusBadge tone={site.priority === "높음" ? "warn" : "default"}>{site.requiredCloseTime}</StatusBadge>
                  </div>
                </div>

                {!submitted ? (
                  <>
                    <StepDots step={step} />
                    {step === 1 && (
                      <MobileSection title="1. 출근/퇴근 선택" subtitle="QR로 들어오면 현장이 자동 선택됩니다.">
                        <label>작업자명</label>
                        <input value={worker} onChange={(e) => setWorker(e.target.value)} />
                        <label>등록 구분</label>
                        <div className="segmented">
                          {["출근", "퇴근"].map((x) => (
                            <button key={x} onClick={() => setCheckType(x)} className={checkType === x ? "selected" : ""}>{x}</button>
                          ))}
                        </div>
                        <div className="timeBox"><Clock size={16} /> 자동 기록 시간: {now}</div>
                        <Button variant="secondary" onClick={getLocation}>현재 위치 기록</Button>
                        {geo && <div className="timeBox">위치: {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}</div>}
                        <Button onClick={() => setStep(2)}>다음</Button>
                      </MobileSection>
                    )}

                    {step === 2 && (
                      <MobileSection title="2. 필수 사진 촬영" subtitle="사진이 없으면 작업 확인이 어렵습니다.">
                        <div className="photoList">
                          {photoPoints.map((p) => (
                            <div key={p.key} className="photoItem">
                              <div className="photoMeta">
                                <div><strong>{p.label}</strong><small>{p.note}</small></div>
                                {p.required ? <StatusBadge tone="danger">필수</StatusBadge> : <StatusBadge>선택</StatusBadge>}
                              </div>
                              <label className={photos[p.key] ? "upload done" : "upload"}>
                                <Camera size={16} />
                                {photos[p.key] ? photos[p.key].fileName : "사진 선택/촬영"}
                                <input type="file" accept="image/*" capture="environment" onChange={(e) => handlePhoto(p.key, e.target.files?.[0])} />
                              </label>
                            </div>
                          ))}
                        </div>
                        <div className="navButtons">
                          <Button variant="ghost" onClick={() => setStep(1)}>이전</Button>
                          <Button onClick={() => setStep(3)}>다음</Button>
                        </div>
                      </MobileSection>
                    )}

                    {step === 3 && (
                      <MobileSection title="3. 특이사항 입력" subtitle="문제가 없으면 ‘특이사항 없음’을 선택합니다.">
                        <label>특이사항 구분</label>
                        <select value={issueType} onChange={(e) => setIssueType(e.target.value)}>
                          {ISSUE_TYPES.map((x) => <option key={x}>{x}</option>)}
                        </select>
                        <label>메모</label>
                        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 원장실 창틀 날파리 사체 제거 완료 / 고가 장비 때문에 안쪽은 접근 제한" />
                        {issueType !== "특이사항 없음" && <div className="warnBox"><AlertTriangle size={16} /> 특이사항은 관리자 확인 대상으로 저장됩니다.</div>}
                        <div className="navButtons">
                          <Button variant="ghost" onClick={() => setStep(2)}>이전</Button>
                          <Button onClick={() => setStep(4)}>다음</Button>
                        </div>
                      </MobileSection>
                    )}

                    {step === 4 && (
                      <MobileSection title="4. 최종 제출" subtitle="제출하면 Make Webhook으로 전송됩니다.">
                        <div className="summaryBox">
                          <Row label="현장" value={site.name} />
                          <Row label="작업자" value={worker} />
                          <Row label="구분" value={checkType} />
                          <Row label="필수사진" value={`${uploadedRequired}/${requiredPoints.length}`} />
                          <Row label="완료율" value={`${completion}%`} />
                          <Row label="특이사항" value={issueType} />
                        </div>
                        {uploadedRequired < requiredPoints.length && <div className="dangerBox">필수 사진이 부족합니다. 제출 시 ‘확인필요’ 상태로 저장됩니다.</div>}
                        {submitMessage && <div className="timeBox">{submitMessage}</div>}
                        <div className="navButtons">
                          <Button variant="ghost" onClick={() => setStep(3)}>이전</Button>
                          <Button onClick={submitToWebhook}><Send size={16} /> 제출</Button>
                        </div>
                      </MobileSection>
                    )}
                  </>
                ) : (
                  <div className="success">
                    <CheckCircle2 size={52} />
                    <strong>제출 완료</strong>
                    <p>{submitMessage}</p>
                    <Button variant="secondary" onClick={resetForm}><RotateCcw size={16} /> 새 등록</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {mode === "admin" && (
          <div className="grid two">
            <Card>
              <h2><ClipboardCheck size={24} /> 대표/관리자 확인 화면</h2>
              <div className="metrics">
                <Metric label="완료율" value={`${completion}%`} tone={completion >= 85 ? "good" : "warn"} />
                <Metric label="필수사진" value={`${uploadedRequired}/${requiredPoints.length}`} tone={uploadedRequired === requiredPoints.length ? "good" : "danger"} />
                <Metric label="특이사항" value={issueType === "특이사항 없음" ? "없음" : "있음"} tone={issueType === "특이사항 없음" ? "good" : "warn"} />
                <Metric label="상태" value={completion >= 85 ? "완료" : "확인필요"} tone={completion >= 85 ? "good" : "danger"} />
              </div>
              <div className="adminList">
                {photoPoints.map((p) => (
                  <div key={p.key} className="adminRow">
                    <div><strong>{p.label}</strong><small>{p.note}</small></div>
                    {photos[p.key] ? <StatusBadge tone="good">사진등록</StatusBadge> : p.required ? <StatusBadge tone="danger">누락</StatusBadge> : <StatusBadge>선택</StatusBadge>}
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2>관리자 조치 필요</h2>
              <div className="alertList">
                {uploadedRequired < requiredPoints.length && <AdminAlert title="필수 사진 누락" body="작업자에게 추가 업로드 요청이 필요합니다." danger />}
                {issueType !== "특이사항 없음" && <AdminAlert title={issueType} body={memo || "특이사항 내용 확인 후 처리상태를 기록해야 합니다."} />}
                {site.id === "reto_clinic" && <AdminAlert title="리투의원 반복 요청 구역" body="거울, 선반, 유리문, 창틀, 파우더룸, 원장실은 다음 작업에도 우선 확인 대상으로 유지합니다." />}
                {uploadedRequired === requiredPoints.length && issueType === "특이사항 없음" && <AdminAlert title="정상 완료" body="필수 사진과 특이사항 기준상 정상 완료입니다." good />}
              </div>
              <Button onClick={() => setMode("notion")}>전송 데이터 보기</Button>
            </Card>
          </div>
        )}

        {mode === "notion" && (
          <Card>
            <div className="cardHeader">
              <div>
                <h2><FileText size={24} /> Make / Notion 전송 데이터</h2>
                <p>Make Webhook URL 연결 시 아래 JSON이 전송됩니다.</p>
              </div>
              <StatusBadge tone="good">연동 준비</StatusBadge>
            </div>
            <pre>{JSON.stringify(notionPayload, null, 2)}</pre>
            <div className="nextBox">
              <strong>다음 단계</strong>
              <ol>
                <li>Make에서 Custom Webhook 생성</li>
                <li>src/App.jsx 상단 MAKE_WEBHOOK_URL에 붙여넣기</li>
                <li>Vercel에 재배포</li>
                <li>Make에서 Google Drive 사진 저장 → Notion DB 생성 연결</li>
              </ol>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return <div className="info"><div><Icon size={16} />{label}</div><strong>{value}</strong></div>;
}

function Row({ label, value }) {
  return <div className="row"><span>{label}</span><strong>{value}</strong></div>;
}

function StepDots({ step }) {
  return <div className="steps">{[1,2,3,4].map((n) => <div key={n} className={step >= n ? "on" : ""} />)}</div>;
}

function MobileSection({ title, subtitle, children }) {
  return <div className="mobileSection"><h2>{title}</h2><p>{subtitle}</p>{children}</div>;
}

function Metric({ label, value, tone }) {
  return <div className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

function AdminAlert({ title, body, danger, good }) {
  return <div className={`adminAlert ${good ? "good" : danger ? "danger" : "warn"}`}><strong>{title}</strong><p>{body}</p></div>;
}

createRoot(document.getElementById("root")).render(<App />);
