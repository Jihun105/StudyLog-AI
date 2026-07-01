# 1단계: React 빌드
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
ENV REACT_APP_API_URL=""
RUN npm run build

# 2단계: Nginx로 정적 파일만 서빙
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf