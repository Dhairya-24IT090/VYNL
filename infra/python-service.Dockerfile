FROM python:3.12-slim
ARG SERVICE_DIR
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PYTHONPATH="/app/shared/service-kit:/app/${SERVICE_DIR}"
WORKDIR /app
COPY shared/service-kit /app/shared/service-kit
RUN pip install --no-cache-dir /app/shared/service-kit
COPY ${SERVICE_DIR} /app/${SERVICE_DIR}
EXPOSE 8000
CMD ["python", "-m", "playlist_service.runtime"]
