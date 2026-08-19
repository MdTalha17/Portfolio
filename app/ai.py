import os
import httpx
from dotenv import load_dotenv
from app.data import PROFILE, SKILLS, EXPERIENCE, EDUCATION, PROJECTS, GOALS, SOCIAL_LINKS

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODELS_TO_TRY = ["groq/compound-mini", "openai/gpt-oss-20b", "qwen/qwen3.6-27b", "groq/compound"]

def build_system_prompt() -> str:
    skills_text = "\n".join([f"  - {cat}: {', '.join(items)}" for cat, items in SKILLS.items()])
    exp_text = "\n".join([f"  - {e['title']} @ {e['company']}: {' '.join(e.get('bullets', [e.get('description', '')]))}" for e in EXPERIENCE])
    edu_text = "\n".join([f"  - {e['degree']} at {e['institution']} ({e['duration']})" for e in EDUCATION])
    proj_text = "\n".join([f"  - {p['name']} ({p.get('language', 'N/A')}): {p['description']} ({p['url']})" for p in PROJECTS])
    goals_text = "\n".join([f"  - {g}" for g in GOALS])

    return f"""You are the AI Assistant embedded inside Mohd Talha's terminal portfolio website.
Your job is to answer questions from visitors about Mohd Talha cleanly, professionally, and concisely.

Context about Mohd Talha:
- Name: {PROFILE['name']}
- Role: {PROFILE['role']}
- Current position: {PROFILE['current']}
- Bio: {PROFILE['bio']}
- Email: {PROFILE['email']}
- GitHub: {PROFILE['github']}
- LinkedIn: {PROFILE['linkedin']}

Skills:
{skills_text}

Experience:
{exp_text}

Education:
{edu_text}

Projects:
{proj_text}

Goals:
{goals_text}

Instructions:
1. Answer in character as Mohd Talha's AI Assistant inside a terminal environment.
2. Keep your answers brief, informative, and direct (1 to 4 concise sentences).
3. Do not use complex HTML or markdown headers. Simple plain text or basic bullet points are preferred.
4. If asked about something unrelated to Mohd Talha, computer science, software engineering, or AI/ML, politely redirect the user back to asking about Talha's background, skills, or projects.
5. Never invent false details not present in the context.
"""

async def ask_ai(question: str) -> str:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    
    if not api_key:
        return (
            "🤖 AI Assistant Notice:\n"
            "GROQ_API_KEY is not set in backend .env file.\n"
            "Please add GROQ_API_KEY=your_key in d:\\Projects\\portfolio\\.env to enable AI answers.\n"
            "You can get a free key at: https://console.groq.com/keys"
        )
    
    system_prompt = build_system_prompt()
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        last_error = ""
        for model in MODELS_TO_TRY:
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": question}
                ],
                "temperature": 0.5,
                "max_tokens": 250
            }
            try:
                resp = await client.post(GROQ_API_URL, json=payload, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    answer = data["choices"][0]["message"]["content"].strip()
                    if "</Think>" in answer:
                        answer = answer.split("</Think>")[-1].strip()
                    return answer
                elif resp.status_code == 401:
                    return "🤖 Error: Invalid GROQ_API_KEY provided in .env file."
                else:
                    last_error = f"Status {resp.status_code}: {resp.text[:150]}"
            except httpx.TimeoutException:
                last_error = "Timeout connecting to Groq"
            except Exception as e:
                last_error = str(e)
                
        return f"🤖 AI Assistant Error: {last_error}"

