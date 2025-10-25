from typing import List
from selenium import webdriver
from selenium.webdriver.common.by import By
from pydantic import BaseModel

class DevpostProject(BaseModel):
    name: str
    tagline: str
    url: str
    thumbnail_url: str
    # description: str


options = webdriver.ChromeOptions()
options.add_argument("--headless")
driver = webdriver.Chrome(options=options)

devpost_url = input("Enter Devpost URL: ")
driver.get(devpost_url)

devpost_projects: List[DevpostProject] = []
project_containers = driver.find_elements(By.CSS_SELECTOR, "a.link-to-software")
projects_count = len(project_containers)

print(f"Projects count: {projects_count}")

for i, project_container in enumerate(project_containers):
    # Get project summary
    project_url = project_container.get_attribute("href")
    project_thumbnail_url = project_container.find_element(By.CSS_SELECTOR, "img.software_thumbnail_image").get_attribute("src")
    project_body_container = project_container.find_element(By.CSS_SELECTOR, ".entry-body")
    project_name = project_body_container.find_element(By.TAG_NAME, "h5").text.strip()
    project_tagline = project_body_container.find_element(By.CSS_SELECTOR, "p.tagline").text.strip()

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

    print(f"Fetched project {i + 1} of {projects_count}")

print(devpost_projects)

driver.quit()