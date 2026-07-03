# 1단계: React 빌드
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
# i18next(^26)가 peerOptional로 typescript ^5||^6을 요구하는데, react-scripts 5.0.1이
# 물고 오는 typescript는 4.9.5라 npm 7+ 기본 설정(strict peer resolution)에서 ERESOLVE로 빌드가 죽음.
# 타입체크용 peer 요구사항이라 런타임 동작에는 영향 없어 --legacy-peer-deps로 우회
RUN npm install --legacy-peer-deps

COPY . .
ENV REACT_APP_API_URL=""
RUN npm run build

# 2단계: Nginx로 정적 파일만 서빙
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf