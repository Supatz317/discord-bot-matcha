FROM oven/bun

# Use production node environment by default.
ENV NODE_ENV=production


WORKDIR /usr/src/app

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.local/share/pnpm/store to speed up subsequent builds.
# Leverage a bind mounts to package.json and pnpm-lock.yaml to avoid having to copy them into
COPY . .
# into this layer.
RUN bun install --prod --frozen-lockfile

# Run the application as a non-root user.
USER bun

# Copy the rest of the source files into the image.


# Run the application.
CMD bun index.js
