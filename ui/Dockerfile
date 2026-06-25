# Stage 1: build
FROM node:20-alpine AS build

WORKDIR /app

# نسخ ملفات البكج أولاً للاستفادة من الكاش
COPY package*.json ./
RUN npm install

# نسخ بقية المشروع
COPY . .

# بناء نسخة الإنتاج
RUN npm run build

# Stage 2: serve with a simple web server (nginx)
FROM nginx:alpine

# نسخ ملفات build إلى nginx
COPY --from=build /app/dist /usr/share/nginx/html

# حذف default config (اختياري)
RUN rm /etc/nginx/conf.d/default.conf

# إضافة إعداد بسيط
RUN printf 'server {\n\
    listen 80;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
      try_files $uri /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/ui.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
