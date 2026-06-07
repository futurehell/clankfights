# CLANK FIGHTS — Dockerized Markov Robot Rap Battle Arena
# Tiny, stupid, and fully containerized.

FROM nginx:alpine

LABEL org.opencontainers.image.title="clank-fights"
LABEL org.opencontainers.image.description="Markov chain robot rap battle simulator running in Docker"
LABEL org.opencontainers.image.authors="built with excessive hubris"

# Clean the default nginx welcome page
RUN rm -rf /usr/share/nginx/html/* && rm -f /etc/nginx/conf.d/default.conf

# Custom server config (gzip, caching, <base> injection for subpath hosting)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy only the web assets we actually need
COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY src/ /usr/share/nginx/html/src/
COPY assets/ /usr/share/nginx/html/assets/

# Expose the standard HTTP port
EXPOSE 80

# Run nginx in foreground (required for Docker)
CMD ["nginx", "-g", "daemon off;"]