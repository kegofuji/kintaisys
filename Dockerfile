# Multi-stage build for Spring Boot + FastAPI
FROM openjdk:17-jdk-slim as java-builder

# Install Maven
RUN apt-get update && apt-get install -y maven && rm -rf /var/lib/apt/lists/*

# Copy pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# Python stage for FastAPI
FROM python:3.13-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    openjdk-17-jre-headless \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Java application
COPY --from=java-builder /target/kintai-0.0.1-SNAPSHOT.jar ./app.jar

# Copy FastAPI application
COPY fastapi_pdf_service/ ./fastapi_pdf_service/

# Install Python dependencies
RUN pip install --no-cache-dir -r fastapi_pdf_service/requirements.txt

# Create startup script
RUN echo '#!/bin/bash\n\
# Start FastAPI in background\n\
cd fastapi_pdf_service\n\
python main.py &\n\
PDF_PID=$!\n\
\n\
# Start Spring Boot\n\
java -jar app.jar\n\
\n\
# Wait for any process to exit\n\
wait $PDF_PID\n\
' > start.sh && chmod +x start.sh

# Expose ports
EXPOSE 8080 8081

# Start both services
CMD ["./start.sh"]
