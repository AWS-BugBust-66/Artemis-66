FROM openjdk:16-jdk-alpine

ENV SPRING_OUTPUT_ANSI_ENABLED=ALWAYS \
    JHIPSTER_SLEEP=0 \
    JAVA_OPTS=""

# Add a jhipster user to run our application so that it doesn't need to run as root
RUN adduser -D -s /bin/sh jhipster
WORKDIR /home/jhipster
USER jhipster

COPY build/libs/*.war app.war

ENTRYPOINT ["java","-jar","app.war"]

EXPOSE 8080
