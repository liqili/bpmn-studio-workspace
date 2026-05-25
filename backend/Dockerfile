# --- Stage 1: Build Environment using Buster ---
FROM maven:3.8.4-openjdk-17-buster AS build
WORKDIR /app

# Copy dependency configuration
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and compile
COPY src ./src
RUN mvn clean package -DskipTests

# --- Stage 2: Runtime Environment using Buster ---
# CHANGED: Switched from openjdk:17-slim to openjdk:17-slim-buster
FROM openjdk:17-slim-buster
WORKDIR /app

# Run as unprivileged user for security
RUN groupadd -r spring && useradd -r -g spring spring
USER spring:spring

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
