# Dr. Susan Black | AI Career Counselor

An empowering, pragmatic AI career counseling application built with **React, TypeScript, Tailwind CSS, and a Multi-Provider AI Architecture (Google Gemini, OpenAI, xAI/Grok, and DeepSeek)**, inspired by the career guidance philosophy of **Dr. Sue Black OBE** (Professor of Computer Science at Durham University, founder of BCSWomen, #techmums, and the TechUPWomen program).

The assistant focuses on skills-first career development, non-traditional educational pathways, cognitive fit (practical problem solving over abstract theory), self-advocacy, and shaping careers around real-life family, financial, and geographic constraints.

---

## Key Features

### 1. Multi-Provider AI System with Automatic Fallback
- **Supported Providers**:
  - **Google Gemini** (`gemini-3.8-flash`, `gemini-2.5-flash`, `gemini-2.5-pro`)
  - **OpenAI** (`gpt-4o-mini`, `gpt-4o`, `gpt-3.5-turbo`)
  - **xAI / Grok** (`grok-2-latest`, `grok-beta`)
  - **DeepSeek** (`deepseek-chat`, `deepseek-reasoner`)
- **Automatic Fallback**: Configure any one provider or all four. If your primary provider experiences quota exhaustion, rate limits, or temporary outages, the app automatically fails over to your next configured provider in your priority order.
- **Provider Priority Controls**: Easily adjust provider priority (Up / Down) in Settings.
- **Connection Testing**: Test connection for each provider directly in Settings before starting counseling.
- **Privacy & Security**: API keys are kept strictly in browser `localStorage` and sent directly to provider APIs. Keys are never committed to git or exposed to external servers.

### 2. Central Counselor Interface
- **Prominent Header**: **“Dr. Susan Black | Career Counselor”** with quick theme toggle, voice readout switch, and session history.
- **Start Voice Counseling**: Hands-free spoken career questionnaire with automatic question readout and silence-detected answer capture.
- **Text Questionnaire**: Step-by-step 12-question form with quick suggestions and voice dictation.

### 3. Structured Career Assessment & Mobile-Friendly Chat
- **Profile Summary**: Concise bullet points highlighting student strengths, values, constraints, and vision.
- **Top 3 Ranked Career Paths**: Tailored explanations grounded in Dr. Sue Black OBE's philosophy.
- **Interactive Follow-Up Chat**: Clean, formatted responses with concise career advice, roadmaps, course recommendations, and guardrails against off-topic queries.
- **Voice Readout**: Integrated speech synthesis reads counselor responses aloud when enabled.

---

## Local Development & Testing

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd <repo-name>
npm install
```

### 2. Configure API Keys (Two Options)

#### Option A: In the Application UI (Recommended)
1. Start the dev server: `npm run dev`
2. Open `http://localhost:3000` in your browser.
3. The setup modal will appear. Select your provider (**Google Gemini**, **OpenAI**, **xAI / Grok**, or **DeepSeek**) and paste your API key.
4. Open **Settings** (gear icon) anytime to add more providers, reorder priority, and test connections.

#### Option B: In a Local `.env` File
Create a `.env` file in the root directory (based on `.env.example`):
```env
# Add whichever keys you have available:
GEMINI_API_KEY="your-gemini-key"
OPENAI_API_KEY="your-openai-key"
XAI_API_KEY="your-xai-key"
DEEPSEEK_API_KEY="your-deepseek-key"
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
npm run preview
```

---

## Pushing to GitHub

The `.gitignore` file already excludes `.env`, `node_modules`, and build artifacts.

To push safely to GitHub:
```bash
git add .
git commit -m "Add multi-provider AI architecture with automatic fallback"
git push origin main
```

---

## Technical Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons
- **AI Providers**: Google GenAI SDK (`@google/genai`), OpenAI REST API, xAI REST API, DeepSeek REST API
- **Storage**: Browser IndexedDB (`CareerCounselorDB`) for conversation history and local questionnaires; localStorage for isolated user credentials
- **Voice APIs**: Web Speech API (`SpeechRecognition` & `SpeechSynthesis`) + Multimodal Gemini STT
