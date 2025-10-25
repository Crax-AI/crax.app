import logging
import json

from tempfile import mkdtemp
from typing import List
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options as ChromeOptions
from pydantic import BaseModel
from selenium.webdriver.common.by import By


class DevpostProject(BaseModel):
    name: str
    tagline: str
    url: str
    thumbnail_url: str
    # description: str


logger = logging.getLogger()
logger.setLevel(logging.INFO)


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


def lambda_handler(event, context):
    devpost_url = event.get("devpost_url")

    driver = initialise_driver()
    driver.get(devpost_url)

    options = webdriver.ChromeOptions()
    options.add_argument("--headless")
    driver = webdriver.Chrome(options=options)

    devpost_url = input("Enter Devpost URL: ")
    driver.get(devpost_url)

    devpost_projects: List[DevpostProject] = []
    project_containers = driver.find_elements(By.CSS_SELECTOR, "a.link-to-software")
    projects_count = len(project_containers)

    logger.info(f"Projects count: {projects_count}")

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

        logger.info(f"Fetched project {i + 1} of {projects_count}")

    logger.info(devpost_projects)

    return {
      "statusCode": 200,
      "headers": {
        "Content-Type": "application/json",
      },
      "body": json.dumps(devpost_projects),
    }
