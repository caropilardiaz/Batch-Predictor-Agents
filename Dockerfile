# Dockerfile para aplicación monolítica Node.js + React
FROM node:20-alpine

WORKDIR /app

# Copiar dependencias y código del frontend
COPY package.json package-lock.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY macro-theme.css ./
COPY index.html ./
COPY logo_banco.jfif ./
COPY metadata.json ./
COPY types.ts ./
COPY ./components ./components
COPY ./data ./data
COPY ./services ./services
COPY ./utils ./utils

# Instalar dependencias del frontend
RUN npm install && npm run build

# Copiar backend
COPY ./server ./server

# Instalar dependencias del backend
WORKDIR /app/server
RUN npm install

# Volver al directorio principal
WORKDIR /app

# Comando para iniciar el backend (que sirve el frontend en producción)
CMD ["node", "server/index.js"]

EXPOSE 4000
