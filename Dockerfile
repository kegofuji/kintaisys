# Multi-stage build for Spring Boot
FROM eclipse-temurin:17-jdk as java-builder

# Install Maven
RUN apt-get update && apt-get install -y maven && rm -rf /var/lib/apt/lists/*

# Copy pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jdk

# Install system dependencies
RUN apt-get update && apt-get install -y \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Java application
COPY --from=java-builder /target/kintai-0.0.1-SNAPSHOT.jar ./app.jar

# Expose port
EXPOSE 8080

# Start Spring Boot application
CMD ["java", "-jar", "app.jar"]
