...existing code...
     docker run -p 4000:4000 agente-rangos-app
     ```
5. **Abrir la aplicación**
   - Ve a tu navegador y accede a:
     http://localhost:4000

¡Listo! Tu aplicación funcionará igual en cualquier ambiente que tenga Docker instalado.

---
# Backend básico para Agente de Rangos Dinámicos

## Instalación manual (opcional, sin Docker)

1. Ve a la carpeta `server`:
   ```sh
   cd server
   ```
2. Instala dependencias:
   ```sh
   npm install
   ```
3. Inicia el servidor:
   ```sh
   npm start
   ```

## Endpoints
- `/api/hello`: Devuelve un mensaje de prueba.

## Producción
- El backend sirve los archivos estáticos del frontend desde la carpeta `dist`.

---
## Variables de entorno

Para usar la IA de Gemini, debes crear un archivo `.env.local` en la raíz y agregar tu API key:

```
GEMINI_API_KEY=tu_api_key_aqui
```

---
## Desarrollo local (sin Docker)

**Prerequisitos:** Node.js

1. Instala dependencias:
   ```sh
   npm install
   ```
2. Configura la API key de Gemini en `.env.local`.
3. Ejecuta la app:
   ```sh
   npm run dev
   ```
>>>>>>> 4ff25bc (Versión estable antes de limpiar lógica frontend)
