# Configuración de Variables de Entorno en Vercel

## 🔍 Verificar configuración actual

Primero, verifica qué variables están configuradas en producción:

```bash
# Accede a tu proyecto en Vercel y ve a Settings > Environment Variables
# O usa el CLI de Vercel:
vercel env ls
```

## 📋 Variables requeridas para WhatsApp

### Variables obligatorias:
- `WHATSAPP_TOKEN` - Token de acceso de WhatsApp Business API
- `WHATSAPP_PHONE_NUMBER_ID` - ID del número de teléfono (puede ser cualquiera de los dos)

### Variables opcionales:
- `NEXT_PUBLIC_BASE_URL` - URL base de tu aplicación (ej: https://ingenit.cl)
- `EMAIL_USER` - Email para alertas
- `EMAIL_PASS` - Contraseña del email

## 🔧 Configurar en Vercel

### Opción 1: Dashboard de Vercel
1. Ve a tu proyecto en [vercel.com](https://vercel.com)
2. Navega a **Settings** > **Environment Variables**
3. Agrega las variables:

```
WHATSAPP_TOKEN=EAA... (tu token completo)
WHATSAPP_PHONE_NUMBER_ID=720256401177655 (o 731956903332850)
NEXT_PUBLIC_BASE_URL=https://ingenit.cl
EMAIL_USER=gerencia@ingenit.cl
EMAIL_PASS=tu_contraseña
```

### Opción 2: CLI de Vercel
```bash
# Instalar Vercel CLI si no lo tienes
npm i -g vercel

# Login
vercel login

# Agregar variables
vercel env add WHATSAPP_TOKEN
vercel env add WHATSAPP_PHONE_NUMBER_ID
vercel env add NEXT_PUBLIC_BASE_URL
vercel env add EMAIL_USER
vercel env add EMAIL_PASS
```

## 🧪 Verificar configuración

Después de configurar las variables, verifica que estén funcionando:

```bash
# Hacer deploy
vercel --prod

# Verificar variables
curl https://ingenit.cl/api/debug-env
```

## 📱 Tokens de WhatsApp

### Número 1: +56 9 7538 5487
- Phone ID: `720256401177655`
- Business Account ID: `512985415236720`

### Número 2: +56 9 9020 6618  
- Phone ID: `731956903332850`
- Business Account ID: `512985415236720`

## 🔄 Redeploy después de cambios

Después de agregar/modificar variables de entorno:

```bash
vercel --prod
```

O desde el dashboard de Vercel, haz un nuevo deploy.

## 🚨 Solución de problemas

### Error: "WhatsApp Token not configured"
- Verifica que `WHATSAPP_TOKEN` esté configurado en Vercel
- Asegúrate de que el token sea válido y no haya expirado
- Verifica que el token tenga permisos para enviar mensajes

### Error: "WhatsApp Phone Number ID not configured"
- Verifica que `WHATSAPP_PHONE_NUMBER_ID` esté configurado
- Usa uno de los Phone IDs válidos: `720256401177655` o `731956903332850`

### Error: "API Error"
- Verifica que el token tenga permisos correctos
- Asegúrate de que el número de teléfono esté verificado en WhatsApp Business
- Revisa los logs en Vercel para más detalles





