from typing import List
from selenium.webdriver.remote.webelement import WebElement


from selenium.webdriver.remote.webelement import WebElement


from selenium import webdriver
from selenium.webdriver.common.by import By
from dotenv import load_dotenv
from supabase import create_client, Client
from pydantic import BaseModel
import os

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")

class ProjectPreview(BaseModel):
    title: str
    tagline: str
    devpost_url: str
    thumbnail_url: str

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

options = webdriver.ChromeOptions()
options.add_argument("--headless")
driver = webdriver.Chrome(options=options)

user_id = input("Enter user ID: ")

devpost_url = supabase.table("profiles").select("devpost_url").eq("id", user_id).execute().data[0]["devpost_url"]
driver.get(devpost_url)

project_containers = driver.find_elements(By.CSS_SELECTOR, "a.link-to-software")
projects_count = len(project_containers)

print(f"Projects count: {projects_count}")

project_previews: List[ProjectPreview] = []
for i, project_container in enumerate[WebElement](project_containers):
    # Get project summary data BEFORE navigating away
    project_url = project_container.get_attribute("href")
    project_thumbnail_url = project_container.find_element(By.CSS_SELECTOR, "img.software_thumbnail_image").get_attribute("src")
    project_body_container = project_container.find_element(By.CSS_SELECTOR, ".entry-body")
    project_name = project_body_container.find_element(By.TAG_NAME, "h5").text.strip()
    project_tagline = project_body_container.find_element(By.CSS_SELECTOR, "p.tagline").text.strip()

    project_previews.append(
        ProjectPreview(
            title=project_name,
            tagline=project_tagline,
            devpost_url=project_url,
            thumbnail_url=project_thumbnail_url,
        )
    )

for i, project in enumerate(project_previews):
    # Navigate to project page to get additional details
    driver.get(project.devpost_url)
    
    try:
        project_details_container = driver.find_element(By.ID, "app-details-left")
        project_description = project_details_container.find_element(By.XPATH, "./div[not(@id)]").text.strip()
    except Exception as e:
        print(f"Error getting project description for {project.title}: {e}")
        project_description = ""

    try:
        software_urls_container = driver.find_element(By.CSS_SELECTOR, 'ul[data-role="software-urls"]')
        
        # Get GitHub URL
        github_a_elem = None
        for a in software_urls_container.find_elements(By.TAG_NAME, "a"):
            try:
                i_elem = a.find_element(By.XPATH, "./i[contains(@class, 'ss-octocat')]")
                if i_elem:
                    github_a_elem = a
                    break
            except Exception:
                continue
        github_url = github_a_elem.get_attribute("href") if github_a_elem else None
    except Exception as e:
        print(f"Error getting GitHub URL for {project_name}: {e}")
        github_url = None

    try:
        time_elem = driver.find_element(By.CSS_SELECTOR, "time.timeago")
        started_at = time_elem.get_attribute("datetime") if time_elem else None
    except Exception as e:
        print(f"Error getting start date for {project.title}: {e}")
        started_at = None

    supabase.table("projects").insert({
        "user_id": user_id,
        "title": project.title,
        "tagline": project.tagline,
        "description": project_description,
        "github_url": github_url,
        "devpost_url": project.devpost_url,
        "thumbnail_url": project.thumbnail_url,
        "started_at": started_at,
        "type": "hackathon",
        "is_public": True,
    }).execute()
    
    print(f"Project: {project_name}")
    print(f"Description: {project_description}")
    print(f"GitHub URL: {github_url}")
    print(f"Started at: {started_at}")
    print(f"Fetched project {i + 1} of {projects_count}")
    print("-" * 50)

driver.quit()
