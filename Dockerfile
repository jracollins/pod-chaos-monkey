# Base Image - To prevent redefining node version and WORKDIR folder several times
FROM node:18-alpine as base
RUN mkdir -p /app
WORKDIR /app

# Dev Dependencies Base Image - To prevent having to reinstall prod dependencies from layer invalidation
FROM base as dev_dependencies
COPY package.json package-lock.json /app/
RUN npm ci

# Instead of a slow `COPY --from` of node_modules, we continue from dev_dependencies image, which has installed node_modules and we then prune/remove the dev dependencies remove to avoid redownloading
FROM dev_dependencies as prod_dependencies
RUN npm ci --production

# We copy all the source code (and tests) to this interim image, so that we can --target this image specifically and run any tests before a build
FROM dev_dependencies as testable
COPY . /app

# We now build the app - this stage executable in parallel with prod_dependencies prevents production install layer being invalidated if it fails
FROM testable as builder
RUN npm run build

# PROD IMAGE - Copy from cached prod_dependencies layer & just the build output from build image
FROM base as production
USER node

COPY --from=builder /app /app
# We make sure only to copy outputs from the build command from the `builder` image, not any source code, or node_modules
# COPY --from=builder /app/.next /app/.next
COPY --from=builder /app/package.json /app/package.json

CMD [ "node", "dist/index.js" ]