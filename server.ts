import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { Room, Question, Student, GameStatus } from "./src/types";

dotenv.config();
dotenv.config({ path: ".env.local" });

// Initialize Firebase Admin with specific databaseId if provided
if (!getApps().length) {
  initializeApp({
    projectId: "evident-dynamo-58gvj",
  });
}

// Using the specific databaseId for Firestore
const db = getFirestore("ai-studio-ox-0e374956-96f2-416a-978c-4c93bf66ca4c");

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory store for game rooms
const rooms = new Map<string, Room>();

// Helper to generate a unique 4-digit code
function generateRoomCode(): string {
  let code = "";
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms.has(code));
  return code;
}

// Lazy initialization of Gemini API Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it in the Secrets panel.");
    }
    aiClient = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Timer tick background interval (runs every 1s)
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    // Cleanup inactive rooms (e.g. no activity for 2 hours)
    if (now - room.lastActive > 2 * 60 * 60 * 1000) {
      rooms.delete(code);
      continue;
    }

    if (room.timerActive && room.timeLeft > 0) {
      room.timeLeft -= 1;
      room.lastActive = now;

      // Auto-transition to reveal when time is up or all students have answered
      const activeStudents = room.students.length;
      const answeredCount = room.students.filter(s => s.lastAnswer !== undefined && s.lastAnswer !== null).length;

      if (room.timeLeft <= 0 || (activeStudents > 0 && answeredCount === activeStudents)) {
        room.timeLeft = 0;
        room.timerActive = false;
        room.status = 'reveal';
        
        // Calculate who got it correct and update scores
        const currentQ = room.questions[room.currentQuestionIndex];
        if (currentQ) {
          room.students.forEach(student => {
            const isCorrect = student.lastAnswer === currentQ.answer;
            student.isCorrect = isCorrect;
            if (isCorrect) {
              // Base 100 points for correct answer, plus speed bonus up to 50 points
              const timeBonus = student.lastAnswerTime 
                ? Math.max(0, Math.min(50, Math.round((room.timerDuration - (student.lastAnswerTime / 1000)) * (50 / room.timerDuration))))
                : 0;
              student.score += 100 + timeBonus;
            }
          });
        }
      }
    }
  }
}, 1000);

// --- API Endpoints ---

// Create Room
app.post("/api/rooms", (req, res) => {
  try {
    const code = generateRoomCode();
    const newRoom: Room = {
      code,
      status: "lobby",
      questions: [],
      currentQuestionIndex: 0,
      students: [],
      timerDuration: 15,
      timeLeft: 0,
      timerActive: false,
      lastActive: Date.now(),
    };
    rooms.set(code, newRoom);
    res.json(newRoom);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Room State
app.get("/api/rooms/:code", (req, res) => {
  const { code } = req.params;
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: "방을 찾을 수 없습니다." });
  }
  room.lastActive = Date.now();
  res.json(room);
});

// Join Room (Student)
app.post("/api/rooms/:code/join", (req, res) => {
  const { code } = req.params;
  const { nickname } = req.body;

  if (!nickname || nickname.trim() === "") {
    return res.status(400).json({ error: "닉네임을 입력해주세요." });
  }

  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: "존재하지 않는 방 번호입니다." });
  }

  if (room.status !== "lobby") {
    return res.status(400).json({ error: "이미 게임이 진행 중이거나 종료되었습니다." });
  }

  // Check unique nickname
  const trimmed = nickname.trim();
  const exists = room.students.some(s => s.nickname.toLowerCase() === trimmed.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: "이미 사용 중인 닉네임입니다." });
  }

  const studentId = "student_" + Math.random().toString(36).substr(2, 9);
  const newStudent: Student = {
    id: studentId,
    nickname: trimmed,
    score: 0,
    lastAnswer: null,
    lastAnswerTime: null,
    isCorrect: null,
  };

  room.students.push(newStudent);
  room.lastActive = Date.now();

  res.json({ student: newStudent, room });
});

// AI Question Generation
app.post("/api/rooms/:code/questions/ai", async (req, res) => {
  const { code } = req.params;
  const { topic, count, difficulty, includeTraps } = req.body;

  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: "방을 찾을 수 없습니다." });
  }

  try {
    const qCount = Math.max(1, Math.min(20, Number(count) || 5));
    const level = difficulty || "medium";

    // Difficulty and Trap Logic Descriptions
    const difficultyContext = {
      easy: "초등학생이나 중학생도 충분히 알 수 있는 매우 기초적이고 상식적인 수준",
      medium: "성인이면 일반적으로 알고 있는 상식 및 교양 수준",
      hard: "전문 지식이 필요하거나 해당 분야의 깊은 통찰이 필요한 매니아 수준"
    }[level as 'easy' | 'medium' | 'hard'] || "일반 성인 상식 수준";

    let trapInstruction = "";
    if (includeTraps) {
      trapInstruction = `
- **함정 선지(Trap Questions) 필수 포함**: 사람들이 흔히 착각하거나 오해하기 쉬운 '오개념'을 이용해 함정을 만드세요. 
- 문장이 그럴듯해 보이지만 미묘하게 틀린 팩트를 포함하거나, 반대로 틀린 것 같지만 사실은 맞는 팩트를 활용하세요.
- 학생들의 오답률을 높일 수 있는 변별력 있는 문제를 최소 30% 이상 포함하세요.`;
    }

    const ai = getGeminiClient();
    const prompt = `주제: "${topic}"
난이도 상세: "${difficultyContext}"
문제 수: ${qCount}개
${trapInstruction}

위 조건에 맞는 교육적이고 흥미로운 OX 퀴즈 문제를 생성해주세요. 팩트에 기반해야 하며 애매모호하지 않고 참/거짓이 명확해야 합니다. 
결과는 반드시 JSON 배열 형태로만 응답하고, 각 항목은 다음 필드를 가져야 합니다:
- text (한국어로 작성된 명확한 문장)
- answer ("O" 또는 "X")
- explanation (왜 O인지 혹은 X인지 설명하는 1~2문장의 짧은 한국어 해설. 정답의 근거를 명확히 제시하세요.)

JSON 형식 예시:
[
  {"text": "지구는 태양계에서 가장 큰 행성이다.", "answer": "X", "explanation": "태양계에서 가장 큰 행성은 목성입니다."}
]`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const contentText = response.text;
    if (!contentText) {
      throw new Error("AI가 문제를 생성하는 데 실패했습니다. 응답이 비어 있습니다.");
    }

    const generated: any[] = JSON.parse(contentText);
    const parsedQuestions: Question[] = generated.map((q, idx) => ({
      id: "q_" + Date.now() + "_" + idx,
      text: q.text,
      answer: q.answer === "O" ? "O" : "X",
      explanation: q.explanation || "",
    }));

    room.questions = parsedQuestions;
    room.currentQuestionIndex = 0;
    room.lastActive = Date.now();

    res.json(room);
  } catch (error: any) {
    console.error("AI Generation error:", error);
    res.status(500).json({ error: error.message || "AI 생성 중 오류가 발생했습니다." });
  }
});

// Import Questions from Sheets (Copy/Paste parsing)
app.post("/api/rooms/:code/questions/import", (req, res) => {
  const { code } = req.params;
  const { rawText } = req.body;

  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: "방을 찾을 수 없습니다." });
  }

  if (!rawText || rawText.trim() === "") {
    return res.status(400).json({ error: "불러올 텍스트가 없습니다." });
  }

  try {
    const lines = rawText.trim().split("\n");
    const parsedQuestions: Question[] = [];

    lines.forEach((line: string, idx: number) => {
      if (!line.trim()) return;

      // Split by tab, comma, or pipeline
      let parts = line.split("\t");
      if (parts.length < 2) {
        parts = line.split("|");
      }
      if (parts.length < 2) {
        parts = line.split(",");
      }

      if (parts.length >= 2) {
        const text = parts[0].trim();
        let ansRaw = parts[1].trim().toUpperCase();
        let answer: 'O' | 'X' = 'O';
        
        // Normalize answer
        if (ansRaw === 'X' || ansRaw === 'FALSE' || ansRaw === 'F' || ansRaw === '틀림' || ansRaw === '0') {
          answer = 'X';
        } else {
          answer = 'O';
        }

        const explanation = parts[2] ? parts[2].trim() : "";

        parsedQuestions.push({
          id: "q_import_" + Date.now() + "_" + idx,
          text,
          answer,
          explanation,
        });
      }
    });

    if (parsedQuestions.length === 0) {
      return res.status(400).json({ error: "올바른 형식의 문제를 찾지 못했습니다. (예: 문제내용 [탭/쉼표/구분선] O 또는 X)" });
    }

    room.questions = parsedQuestions;
    room.currentQuestionIndex = 0;
    room.lastActive = Date.now();

    res.json(room);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start Game
app.post("/api/rooms/:code/start", (req, res) => {
  const { code } = req.params;
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: "방을 찾을 수 없습니다." });
  }

  if (room.questions.length === 0) {
    return res.status(400).json({ error: "퀴즈 문제가 생성/불러오기 되지 않았습니다." });
  }

  room.status = "active";
  room.currentQuestionIndex = 0;
  room.timeLeft = room.timerDuration;
  room.timerActive = true;
  room.lastActive = Date.now();

  // Reset student answers
  room.students.forEach(s => {
    s.lastAnswer = null;
    s.lastAnswerTime = null;
    s.isCorrect = null;
  });

  res.json(room);
});

// Submit Student Answer
app.post("/api/rooms/:code/answer", (req, res) => {
  const { code } = req.params;
  const { studentId, answer, timeSpent } = req.body; // timeSpent in ms

  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: "방을 찾을 수 없습니다." });
  }

  if (room.status !== "active" || !room.timerActive) {
    return res.status(400).json({ error: "현재 답변을 제출할 수 있는 시간이 아닙니다." });
  }

  const student = room.students.find(s => s.id === studentId);
  if (!student) {
    return res.status(404).json({ error: "학생 정보를 찾을 수 없습니다." });
  }

  student.lastAnswer = answer === 'O' ? 'O' : 'X';
  student.lastAnswerTime = timeSpent || 0;
  room.lastActive = Date.now();

  // Check if all students answered
  const activeStudents = room.students.length;
  const answeredCount = room.students.filter(s => s.lastAnswer !== null && s.lastAnswer !== undefined).length;

  if (answeredCount === activeStudents && activeStudents > 0) {
    // Trigger immediate reveal in next timer tick
    room.timeLeft = 0;
  }

  res.json({ success: true, room });
});

// Show Scoreboard / Leaderboard between rounds
app.post("/api/rooms/:code/leaderboard", (req, res) => {
  const { code } = req.params;
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: "방을 찾을 수 없습니다." });
  }

  room.status = "leaderboard";
  room.timerActive = false;
  room.lastActive = Date.now();

  res.json(room);
});

// Next Question
app.post("/api/rooms/:code/next", (req, res) => {
  const { code } = req.params;
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: "방을 찾을 수 없습니다." });
  }

  const nextIndex = room.currentQuestionIndex + 1;
  if (nextIndex >= room.questions.length) {
    room.status = "gameover";
    room.timerActive = false;
  } else {
    room.status = "active";
    room.currentQuestionIndex = nextIndex;
    room.timeLeft = room.timerDuration;
    room.timerActive = true;

    // Reset student answers for the next question
    room.students.forEach(s => {
      s.lastAnswer = null;
      s.lastAnswerTime = null;
      s.isCorrect = null;
    });
  }

  room.lastActive = Date.now();
  res.json(room);
});

// Force Reveal Answer
app.post("/api/rooms/:code/reveal", (req, res) => {
  const { code } = req.params;
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: "방을 찾을 수 없습니다." });
  }

  room.timeLeft = 0;
  room.timerActive = false;
  room.status = "reveal";

  // Process answers
  const currentQ = room.questions[room.currentQuestionIndex];
  if (currentQ) {
    room.students.forEach(student => {
      const isCorrect = student.lastAnswer === currentQ.answer;
      student.isCorrect = isCorrect;
      if (isCorrect) {
        const timeBonus = student.lastAnswerTime 
          ? Math.max(0, Math.min(50, Math.round((room.timerDuration - (student.lastAnswerTime / 1000)) * (50 / room.timerDuration))))
          : 0;
        student.score += 100 + timeBonus;
      }
    });
  }

  room.lastActive = Date.now();
  res.json(room);
});

// Reset Room (Back to Lobby)
app.post("/api/rooms/:code/reset", (req, res) => {
  const { code } = req.params;
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: "방을 찾을 수 없습니다." });
  }

  room.status = "lobby";
  room.currentQuestionIndex = 0;
  room.timeLeft = 0;
  room.timerActive = false;
  room.lastActive = Date.now();
  
  // Reset student stats
  room.students.forEach(s => {
    s.score = 0;
    s.lastAnswer = null;
    s.lastAnswerTime = null;
    s.isCorrect = null;
  });

  res.json(room);
});


// --- Vite Middleware & Static Assets ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
