# ✅ Verificación de Webhook WhatsApp en Producción

## 🔧 Cambios Implementados

### 1. **Endpoint GET para Verificación**
- ✅ Agregado `export async function GET` en `/api/webhook-ingenit/route.ts`
- ✅ Valida el token de verificación de WhatsApp
- ✅ Responde con el challenge token cuando la verificación es correcta

### 2. **Logging Mejorado**
- ✅ Logs de ambiente (NODE_ENV)
- ✅ Logs de URL base configurada
- ✅ Manejo de errores con try/catch y stack traces
- ✅ Logs detallados en cada paso del proceso

---

## 📋 Pasos para Configurar en Producción

### **PASO 1: Configurar Variables de Entorno en Vercel**

Ve a tu proyecto en Vercel → Settings → Environment Variables y agrega:

```bash
# Token de verificación del webhook (crea uno único y seguro)
WHATSAPP_VERIFY_TOKEN=ingenit_webhook_verify_token_2024

# URL base de producción
NEXT_PUBLIC_BASE_URL=https://ingenit.cl

# Token de acceso de WhatsApp Business API
WHATSAPP_TOKEN=tu_token_aqui
# O también puede llamarse:
WHATSAPP_ACCESS_TOKEN=tu_token_aqui

# Supabase Service Role Key (para subir archivos)
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

**⚠️ IMPORTANTE**: Después de agregar las variables, **redeploy tu aplicación** en Vercel.

---

### **PASO 2: Configurar Webhook en Meta/WhatsApp Business**

1. Ve a [Meta for Developers](https://developers.facebook.com/)
2. Selecciona tu aplicación de WhatsApp Business
3. Ve a **WhatsApp** → **Configuration** → **Webhooks**
4. Haz clic en **Edit** o **Configure Webhooks**

5. **Ingresa la URL del Webhook:**
   ```
   https://ingenit.cl/api/webhook-ingenit
   ```

6. **Ingresa el Verify Token:**
   ```
   ingenit_webhook_verify_token_2024
   ```
   (O el token que hayas configurado en Vercel)

7. Haz clic en **Verify and Save**

8. **Suscríbete a los eventos de mensajes:**
   - ✅ `messages` (mensajes entrantes)
   - ✅ `message_status` (opcional, para confirmaciones de lectura)
   - ✅ Cualquier otro evento que necesites

9. Guarda los cambios

---

### **PASO 3: Verificar que Funciona**

#### A. **Revisar Logs en Vercel**

1. Ve a tu proyecto en Vercel
2. Ve a **Deployments** → Selecciona el último deployment
3. Haz clic en **Functions** → Busca `/api/webhook-ingenit`
4. Revisa los logs en tiempo real

Deberías ver algo como:
```
🔐 Verificación de webhook recibida: { mode: 'subscribe', token: '...', challenge: '...' }
✅ Webhook verificado correctamente
```

#### B. **Probar Enviando un Mensaje**

1. Envía un mensaje de WhatsApp a tu número business (+56975385487 o +56990206618)
2. Revisa los logs en Vercel Functions
3. Deberías ver:
   ```
   🟡 INGENIT - endpoint alcanzado
   📍 Ambiente: production
   🟢 Webhook recibido en INGENIT: {...}
   📱 Mensaje de +56... a +56... (tipo: text)
   ✅ Mensaje válido de +56... a +56...
   💾 Guardando mensaje en BD
   ✅ Mensaje guardado exitosamente en BD
   ```

#### C. **Verificar en Supabase**

1. Ve a tu proyecto Supabase
2. Abre la tabla `rt_messages`
3. Verifica que los mensajes se estén guardando correctamente

---

## 🚨 Problemas Comunes y Soluciones

### ❌ "Webhook verification failed"

**Causa**: El token de verificación no coincide

**Solución**:
1. Verifica que `WHATSAPP_VERIFY_TOKEN` en Vercel sea exactamente igual al token en Meta
2. Redeploy la aplicación en Vercel
3. Intenta verificar nuevamente en Meta

### ❌ "Mensajes no llegan a Supabase"

**Causa**: Error en las credenciales de Supabase o en el token de WhatsApp

**Solución**:
1. Verifica que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` estén configurados
2. Verifica que `SUPABASE_SERVICE_ROLE_KEY` esté configurado (para archivos multimedia)
3. Verifica que `WHATSAPP_TOKEN` esté configurado
4. Revisa los logs en Vercel para ver el error específico

### ❌ "403 Forbidden" en verificación

**Causa**: El modo o token son incorrectos

**Solución**:
1. Meta debe enviar `hub.mode=subscribe`
2. El `hub.verify_token` debe coincidir exactamente
3. Revisa los logs para ver qué valores está recibiendo el webhook

### ❌ "500 Internal Server Error"

**Causa**: Error en el código o falta alguna variable de entorno

**Solución**:
1. Revisa los logs en Vercel Functions
2. El error ahora incluye stack trace completo
3. Verifica que todas las variables de entorno necesarias estén configuradas

---

## 🔍 Diferencias entre Desarrollo y Producción

### **Desarrollo (con ngrok)**
- URL temporal: `https://xxxx.ngrok.io/api/webhook-ingenit`
- Variables de entorno en `.env.local`
- Logs en la consola local
- Puede que ngrok no valide el webhook estrictamente

### **Producción (Vercel)**
- URL permanente: `https://ingenit.cl/api/webhook-ingenit`
- Variables de entorno en Vercel Dashboard
- Logs en Vercel Functions
- WhatsApp valida el webhook con GET antes de enviar mensajes

---

## ✅ Checklist Final

Antes de considerar que todo funciona, verifica:

- [ ] Variables de entorno configuradas en Vercel
- [ ] Aplicación redeployada en Vercel
- [ ] Webhook configurado en Meta/WhatsApp Business
- [ ] Verificación del webhook exitosa (GET request)
- [ ] Mensaje de prueba enviado
- [ ] Mensaje aparece en logs de Vercel
- [ ] Mensaje guardado en tabla `rt_messages` de Supabase
- [ ] Archivos multimedia se suben correctamente (si aplica)
- [ ] Alertas de nuevo contacto funcionan (si aplica)

---

## 📞 Números WhatsApp Business Configurados

- **Principal**: +56975385487
- **Secundario**: +56990206618

Ambos números están configurados en el webhook y deberían recibir mensajes correctamente.

---

## 🔗 URLs Importantes

- **Webhook URL**: `https://ingenit.cl/api/webhook-ingenit`
- **Meta Developers**: https://developers.facebook.com/
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://app.supabase.com/

---

## 📝 Notas Adicionales

- El webhook ahora tiene **mejor manejo de errores** con try/catch
- Los **logs son más detallados** para facilitar el debugging
- El **endpoint GET** es **obligatorio** para que WhatsApp acepte el webhook
- El token de verificación puede ser cualquier string, pero debe ser el mismo en ambos lados

---

**Última actualización**: Enero 3, 2026
