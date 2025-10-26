from dotenv import load_dotenv
import os
import requests
from supabase import create_client, Client

load_dotenv()

RAI_API_KEY = os.getenv("RAI_API_KEY")
RAI_REGION = os.getenv("RAI_REGION")
RAI_PROJECT = os.getenv("RAI_PROJECT")
RAI_LINKEDIN_TOOL_ID = os.getenv("RAI_LINKEDIN_TOOL_ID")
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SECRET_KEY"))

# linkedin_url = input("Enter LinkedIn URL: ")

def sync_linkedin(user_id: str, linkedin_url: str) -> None:
    print(f"Processing {linkedin_url} for user {user_id}")
    url = f"https://api-{RAI_REGION}.stack.tryrelevance.com/latest/studios/{RAI_LINKEDIN_TOOL_ID}/trigger_limited"
    headers = {
        "Authorization": f"{RAI_PROJECT}:{RAI_API_KEY}"
    }
    body = {
        "params": {
            "url": linkedin_url,
        },
        "project": RAI_PROJECT,
    }

    response = requests.post(url, headers=headers, json=body)
    if response.status_code != 200:
        raise Exception(f"Failed to scrape LinkedIn profile: status code {response.status_code}")

    result = response.json()
    if len(result.get("errors", [])) > 0:
        raise Exception(f"Failed to scrape LinkedIn profile: {result.get("errors")}")

    profile = result["output"]["linkedin_profile"]
    supabase.table("profiles").update({
        "linkedin_data_raw": profile,
        "about": profile["about"],
        "headline": profile["headline"],
    }).eq("id", user_id).execute()

profiles = supabase.table("profiles").select("id, linkedin_url").is_("linkedin_data_raw", None).neq("linkedin_url", "").execute().data
for profile in profiles:
    sync_linkedin(profile["id"], profile["linkedin_url"])