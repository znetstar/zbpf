FROM node:18-slim

WORKDIR /app

ADD ./package-lock.json /app/package-lock.json

ADD ./package.json /app/package.json

RUN npm ci

ADD ./ /app

RUN npm run build && \
    chmod +x /app/bin/run && \
    chmod +x /app/bin/dev

FROM node:18-alpine

WORKDIR /app

COPY --from=0 /app/bin /app/bin
COPY --from=0 /app/dist /app/dist
COPY --from=0 /app/package.json /app/package.json
COPY --from=0 /app/node_modules  /app/node_modules

RUN chmod +x /app/bin/run /app/bin/dev

ENTRYPOINT [ "/app/bin/run" ]
