# Step 1: Build Stage
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copy pom.xml and download dependencies (layer caching)
COPY pom.xml .
RUN mvn dependency:resolve

# Copy all project files and build
COPY . .
RUN mvn clean package -DskipTests

# Step 2: Run Stage
FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app

# Copy the jar from build stage
COPY --from=build /app/target/*.jar app.jar

# Expose port (change if your app runs on another port)
EXPOSE 8080

# Start the app
ENTRYPOINT ["java", "-jar", "app.jar"]