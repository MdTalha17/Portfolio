import random
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import httpx

from app.data import (
    PROFILE, SKILLS, EXPERIENCE, EDUCATION, PROJECTS,
    SOCIAL_LINKS, QUOTES, GOALS, COMMANDS_HELP
)

BASE_DIR = Path(__file__).resolve().parent.parent

app = FastAPI(title="Mohd Talha — Terminal Portfolio", debug=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

# Jinja2 templates
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# Simple in-memory cache for GitHub API
_github_cache: dict = {
    "data": None,
    "last_fetched": None
}


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse(
        request,
        "index.html",
        {
            "profile": PROFILE,
            "skills": SKILLS,
            "experience": EXPERIENCE,
            "education": EDUCATION,
            "projects": PROJECTS,
            "goals": GOALS
        }
    )


@app.get("/api/profile")
async def get_profile():
    return PROFILE


@app.get("/api/projects")
async def get_projects():
    return PROJECTS


@app.get("/api/skills")
async def get_skills():
    return SKILLS


@app.get("/api/experience")
async def get_experience():
    return EXPERIENCE


@app.get("/api/education")
async def get_education():
    return EDUCATION


@app.get("/api/github-stats")
async def get_github_stats():
    now = datetime.now()

    if (
        _github_cache["data"]
        and _github_cache["last_fetched"]
        and (now - _github_cache["last_fetched"]) < timedelta(minutes=5)
    ):
        return _github_cache["data"]

    username = PROFILE.get("github_username", "MdTalha17")
    url = f"https://api.github.com/users/{username}"

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            data = response.json()

            created = data.get("created_at", "")
            joined = ""
            if created:
                try:
                    dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                    joined = dt.strftime("%b %Y")
                except Exception:
                    joined = created[:10]

            stats = {
                "repos": data.get("public_repos", 0),
                "followers": data.get("followers", 0),
                "following": data.get("following", 0),
                "joined": joined,
                "profile": f"https://github.com/{username}"
            }
            _github_cache["data"] = stats
            _github_cache["last_fetched"] = now
            return stats
        except Exception as e:
            return {
                "repos": 19,
                "followers": 4,
                "following": 2,
                "joined": "Oct 2023",
                "profile": f"https://github.com/{username}",
                "error": str(e)
            }


@app.get("/api/quote")
async def get_quote():
    return random.choice(QUOTES)


@app.get("/api/commands")
async def get_commands():
    return COMMANDS_HELP


from pydantic import BaseModel
from app.ai import ask_ai

class AskRequest(BaseModel):
    question: str


@app.get("/api/goals")
async def get_goals():
    return GOALS


@app.post("/api/ask")
async def ask_question(body: AskRequest):
    answer = await ask_ai(body.question)
    return {"answer": answer}