#!/bin/bash
set -e

latest_stable_json="https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json"
# Retrieve the JSON data using curl
json_data=$(curl -s "$latest_stable_json")

# Get the Linux x64 versions specifically
latest_chrome_linux_download_url="$(echo "$json_data" | jq -r '.channels.Stable.downloads.chrome[] | select(.platform == "linux64") | .url' | head -1)"
latest_chrome_driver_linux_download_url="$(echo "$json_data" | jq -r '.channels.Stable.downloads.chromedriver[] | select(.platform == "linux64") | .url' | head -1)"

# Validate URLs were found
if [ -z "$latest_chrome_linux_download_url" ] || [ "$latest_chrome_linux_download_url" = "null" ]; then
    echo "Error: Could not find Chrome Linux x64 download URL"
    exit 1
fi

if [ -z "$latest_chrome_driver_linux_download_url" ] || [ "$latest_chrome_driver_linux_download_url" = "null" ]; then
    echo "Error: Could not find ChromeDriver Linux x64 download URL"
    exit 1
fi

echo "Chrome URL: $latest_chrome_linux_download_url"
echo "ChromeDriver URL: $latest_chrome_driver_linux_download_url"

download_path_chrome_linux="/opt/chrome-headless-shell-linux.zip"
dowload_path_chrome_driver_linux="/opt/chrome-driver-linux.zip"

mkdir -p "/opt/chrome"
curl -Lo $download_path_chrome_linux $latest_chrome_linux_download_url
unzip -q $download_path_chrome_linux -d "/opt/chrome"
rm -rf $download_path_chrome_linux

mkdir -p "/opt/chrome-driver"
curl -Lo $dowload_path_chrome_driver_linux $latest_chrome_driver_linux_download_url
unzip -q $dowload_path_chrome_driver_linux -d "/opt/chrome-driver"
rm -rf $dowload_path_chrome_driver_linux