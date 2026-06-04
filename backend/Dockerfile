# --- Stage 1: Build Environment using Buster ---
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copy dependency configuration
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and compile
COPY src ./src
RUN mvn clean package -DskipTests

# --- Stage 2: Runtime Environment using Alpine ---
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Run as unprivileged user for security (Alpine Syntax)
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]