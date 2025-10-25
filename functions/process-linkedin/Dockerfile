# Use the official Python runtime as a parent image
FROM python:3.13-slim

# Set the working directory in the container
WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install any system dependencies and Python packages
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY main.py .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

# Expose the port the app runs on
EXPOSE 8080

# Run the application
CMD exec functions-framework --target=process_linkedin_webhook --port=$PORT --host=0.0.0.0
