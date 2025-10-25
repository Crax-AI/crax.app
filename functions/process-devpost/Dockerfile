FROM python:3.13-slim

RUN apt-get update
RUN 

WORKDIR /app
COPY . .

RUN pip install -r requirements.txt

CMD ["python", "main.py"]