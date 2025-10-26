from dotenv import load_dotenv
import os
import requests

load_dotenv()

RAI_API_KEY = os.getenv("RAI_API_KEY")
RAI_REGION = os.getenv("RAI_REGION")
RAI_PROJECT = os.getenv("RAI_PROJECT")
RAI_LINKEDIN_TOOL_ID = os.getenv("RAI_LINKEDIN_TOOL_ID")

linkedin_url = input("Enter LinkedIn URL: ")

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
print(profile)
