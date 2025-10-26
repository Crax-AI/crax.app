import requests
from dotenv import load_dotenv
from supabase import create_client, Client
from base64 import b64decode
import os

load_dotenv()

supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SECRET_KEY"))

github_username = input("Enter GitHub username: ")
user_id = supabase.table("profiles").select("id").eq("github_url", f"https://github.com/{github_username}").single().execute().data["id"]

url = f"https://api.github.com/users/{github_username}/repos"
response = requests.get(url, headers={
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
})
if response.status_code != 200:
    raise Exception(f"Failed to get GitHub repos: status code {response.status_code}")

repos = response.json()
print(repos)

for repo in repos:
    description = repo["description"]
    response = requests.get(repo["contents_url"].replace("{+path}", "README.md"), headers={
        "Accept": "application/vnd.github.object",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    if response.status_code == 200:
        content = str(b64decode(response.json()["content"]))
        description = content

    # supabase.table("projects").insert({
    #     "user_id": user_id,
    #     "title": repo["name"],
    #     "tagline": repo["description"],
    #     "description": description,
    #     "github_url": repo["html_url"],
    #     "devpost_url": None,
    #     "thumbnail_url": repo["owner"]["avatar_url"],
    #     "started_at": repo["created_at"],
    #     "type": "codebase",
    #     "is_public": True,
    # }).execute()