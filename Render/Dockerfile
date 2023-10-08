# Use the official lightweight Python image.
# https://hub.docker.com/_/python
FROM python:3.7-slim

# Copy local code to the container image.
ENV APP_HOME /app
WORKDIR $APP_HOME
COPY . ./

# Get system dependencies
RUN set -e; \
    apt-get update -y && apt-get install -y \
    tini \
    gnupg \
    curl \
    lsb-release; \
    gcsFuseRepo=gcsfuse-`lsb_release -c -s`; \
    echo "deb http://packages.cloud.google.com/apt $gcsFuseRepo main" | \
    tee /etc/apt/sources.list.d/gcsfuse.list; \
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | \
    apt-key add -;

RUN apt-get update -y && apt-get install -y \
    libmagic-dev \
    ffmpeg \
    gcsfuse \
    && apt-get clean

# Set mount directory
ENV MNT_DIR /mnt/content
ENV BUCKET addlyrics-content

# Ensure the startup script is executable
RUN chmod +x /app/run.sh

# Install production dependencies.
RUN pip install -r requirements.txt

# Add credentials
RUN set GOOGLE_APPLICATION_CREDENTIALS="/app/google-authorisation.json"
EXPOSE 8080
ENV PORT 8080

ENTRYPOINT ["/usr/bin/tini", "--"] 

CMD ["/app/run.sh"]
