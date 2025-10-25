import logging
import json
import os
from tempfile import mkdtemp
from typing import List
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options as ChromeOptions
from pydantic import BaseModel
from selenium.webdriver.common.by import By
from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel as PydanticBaseModel
from supabase import create_client, Client


class DevpostProject(BaseModel):
    name: str
    tagline: str
    url: str
    thumbnail_url: str
    # description: str


class ProcessDevpostRequest(PydanticBaseModel):
    devpost_url: str
    user_id: str


class ProcessDevpostResponse(PydanticBaseModel):
    status: str
    projects: List[DevpostProject]
    inserted_count: int


logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize Supabase client
def get_supabase_client() -> Client:
    logger.info("Initializing Supabase client")
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        logger.error("Supabase configuration missing - check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables")
        raise HTTPException(status_code=500, detail="Supabase configuration missing")
    
    logger.info("Supabase configuration found, creating client")
    return create_client(supabase_url, supabase_key)

# Authorization dependency
def verify_authorization(authorization: str = Header(None)):
    logger.info("Verifying authorization token")
    
    if not authorization:
        logger.warning("Authorization header missing")
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    if not authorization.startswith("Bearer "):
        logger.warning("Invalid authorization format - missing Bearer prefix")
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    token = authorization.split(" ")[1]
    expected_token = os.environ.get("CRAX_SECRET_KEY")
    
    if not expected_token:
        logger.error("CRAX_SECRET_KEY environment variable not configured")
        raise HTTPException(status_code=500, detail="CRAX_SECRET_KEY not configured")
    
    if token != expected_token:
        logger.warning("Invalid authorization token provided")
        raise HTTPException(status_code=401, detail="Invalid authorization token")
    
    logger.info("Authorization token verified successfully")
    return token


def initialise_driver():
    chrome_options = ChromeOptions()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--disable-dev-tools")
    chrome_options.add_argument("--no-zygote")
    chrome_options.add_argument("--single-process")
    chrome_options.add_argument(f"--user-data-dir={mkdtemp()}")
    chrome_options.add_argument(f"--data-path={mkdtemp()}")
    chrome_options.add_argument(f"--disk-cache-dir={mkdtemp()}")
    chrome_options.add_argument("--remote-debugging-pipe")
    chrome_options.add_argument("--verbose")
    chrome_options.add_argument("--log-path=/tmp")
    chrome_options.binary_location = "/opt/chrome/chrome-linux64/chrome"

    service = Service(
        executable_path="/opt/chrome-driver/chromedriver-linux64/chromedriver",
        service_log_path="/tmp/chromedriver.log",
    )

    driver = webdriver.Chrome(service=service, options=chrome_options)

    return driver


def process_devpost_projects(devpost_url: str):
    logger.info(f"Initializing Chrome driver for devpost URL: {devpost_url}")
    driver = initialise_driver()
    logger.info("Chrome driver initialized successfully")
    
    logger.info(f"Navigating to devpost URL: {devpost_url}")
    driver.get(devpost_url)

    devpost_projects: List[DevpostProject] = []
    project_containers = driver.find_elements(By.CSS_SELECTOR, "a.link-to-software")
    projects_count = len(project_containers)

    logger.info(f"Found {projects_count} project containers on the page")

    for i, project_container in enumerate(project_containers):
        # Get project summary
        project_url = project_container.get_attribute("href")
        project_thumbnail_url = project_container.find_element(
            By.CSS_SELECTOR, "img.software_thumbnail_image"
        ).get_attribute("src")
        project_body_container = project_container.find_element(
            By.CSS_SELECTOR, ".entry-body"
        )
        project_name = project_body_container.find_element(
            By.TAG_NAME, "h5"
        ).text.strip()
        project_tagline = project_body_container.find_element(
            By.CSS_SELECTOR, "p.tagline"
        ).text.strip()

        # Get full project
        # driver.get(project_url)
        # project_details_container = driver.find_element(By.ID, "app-details-left")
        # project_description = project_details_container.find_element(By.XPATH, "./div[not(@id)]").text.strip()

        devpost_projects.append(
            DevpostProject(
                name=project_name,
                tagline=project_tagline,
                url=project_url,
                thumbnail_url=project_thumbnail_url,
                # description=project_description,
            )
        )

        logger.info(f"Fetched project {i + 1} of {projects_count}: {project_name}")

    logger.info(f"Completed scraping {len(devpost_projects)} projects from devpost")
    logger.info("Closing Chrome driver")
    driver.quit()
    
    return devpost_projects


def insert_projects_to_database(projects: List[DevpostProject], user_id: str, supabase: Client) -> int:
    """Insert projects into the database and return the count of inserted projects."""
    if not projects:
        logger.info("No projects to insert into database")
        return 0
    
    logger.info(f"Preparing {len(projects)} projects for database insertion")
    
    # Prepare projects for insertion
    projects_to_insert = []
    for project in projects:
        project_data = {
            "user_id": user_id,
            "title": project.name,
            "tagline": project.tagline,
            "description": project.tagline,  # Using tagline as description since description is required
            "devpost_url": project.url,
            "thumbnail_url": project.thumbnail_url,
            "type": "hackathon"
        }
        projects_to_insert.append(project_data)
        logger.info(f"Prepared project for insertion: {project.name}")
    
    try:
        logger.info(f"Executing database insert for {len(projects_to_insert)} projects")
        # Insert projects into the database
        result = supabase.table("projects").insert(projects_to_insert).execute()
        logger.info(f"Successfully inserted {len(projects_to_insert)} projects into database")
        return len(projects_to_insert)
    except Exception as e:
        logger.error(f"Error inserting projects: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to insert projects: {str(e)}")


# Initialize FastAPI app
app = FastAPI(title="Devpost Processor", version="1.0.0")


@app.post('/process-devpost', response_model=ProcessDevpostResponse)
async def handle_process_devpost(
    request: ProcessDevpostRequest,
    authorization: str = Depends(verify_authorization)
):
    try:
        logger.info(f"Processing devpost request for user {request.user_id} with URL: {request.devpost_url}")
        
        # Get Supabase client
        supabase = get_supabase_client()
        logger.info("Supabase client initialized successfully")
        
        # Process devpost projects
        logger.info("Starting devpost projects scraping...")
        projects = process_devpost_projects(request.devpost_url)
        logger.info(f"Successfully scraped {len(projects)} projects from devpost")
        
        # Insert projects into database
        logger.info(f"Inserting {len(projects)} projects into database for user {request.user_id}")
        inserted_count = insert_projects_to_database(projects, request.user_id, supabase)
        logger.info(f"Successfully inserted {inserted_count} projects into database")
        
        return ProcessDevpostResponse(
            status='success',
            projects=projects,
            inserted_count=inserted_count
        )
        
    except Exception as e:
        logger.error(f"Error processing devpost: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/health')
async def health_check():
    return {'status': 'healthy'}


if __name__ == '__main__':
    import uvicorn
    port = int(os.environ.get('PORT', 8080))
    uvicorn.run(app, host='0.0.0.0', port=port)
