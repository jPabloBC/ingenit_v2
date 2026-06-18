# 🔐 Implementación de Validación de Status para CN Users

## 📋 Problema Identificado

Actualmente, la columna `status` en `cn_users` es solo informativa. Cambiar el estado de un usuario a `inactive` o `pending` **NO bloquea su acceso** al sistema porque no existe validación en el proceso de autenticación.

## ✅ Solución Propuesta

### 1. Agregar Middleware de Validación en el Login

Necesitas validar el `status` del usuario durante el proceso de autenticación. Aquí hay dos enfoques:

#### Opción A: Validación en el Backend (Recomendado)

Crear una función que valide el status después de la autenticación pero antes de crear la sesión:

```typescript
// src/lib/cnAuth.ts (NUEVO ARCHIVO)
import { supabase } from '@/lib/supabaseClient';

export async function validateCNUserStatus(userId: string): Promise<{
  isValid: boolean;
  status: string | null;
  message: string;
}> {
  try {
    const { data: user, error } = await supabase
      .from('cn_users')
      .select('status')
      .eq('id', userId)
      .single();

    if (error) {
      return {
        isValid: false,
        status: null,
        message: 'Error al verificar usuario'
      };
    }

    if (!user) {
      return {
        isValid: false,
        status: null,
        message: 'Usuario no encontrado'
      };
    }

    // Solo usuarios con status 'active' pueden acceder
    if (user.status !== 'active') {
      const messages = {
        inactive: 'Tu cuenta ha sido desactivada. Contacta al administrador.',
        pending: 'Tu cuenta está pendiente de activación.'
      };
      
      return {
        isValid: false,
        status: user.status,
        message: messages[user.status as keyof typeof messages] || 'Acceso no autorizado'
      };
    }

    return {
      isValid: true,
      status: user.status,
      message: 'OK'
    };
  } catch (error) {
    console.error('Error validating user status:', error);
    return {
      isValid: false,
      status: null,
      message: 'Error del sistema'
    };
  }
}
```

#### Opción B: Row Level Security (RLS) en Supabase (Más Seguro)

Agregar una política RLS que automáticamente bloquee el acceso a nivel de base de datos:

```sql
-- Política para cn_sessions: solo usuarios activos pueden crear sesiones
CREATE POLICY "cn_sessions_insert_only_active_users" 
ON cn_sessions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cn_users 
    WHERE cn_users.id = cn_sessions.user_id 
    AND cn_users.status = 'active'
  )
);

-- Política para cn_sessions: solo usuarios activos pueden tener sesiones activas
CREATE POLICY "cn_sessions_select_only_active_users" 
ON cn_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM cn_users 
    WHERE cn_users.id = cn_sessions.user_id 
    AND cn_users.status = 'active'
  )
);
```

### 2. Implementar en el Flujo de Login

Si tienes un endpoint de login para CN, agregar la validación:

```typescript
// src/app/api/cn/auth/login/route.ts (EJEMPLO)
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateCNUserStatus } from '@/lib/cnAuth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    
    // 1. Autenticar con Supabase
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // 2. Validar el status del usuario
    const validation = await validateCNUserStatus(authData.user.id);
    
    if (!validation.isValid) {
      // Cerrar la sesión si el usuario no está activo
      await supabaseAdmin.auth.signOut();
      
      return NextResponse.json(
        { error: validation.message, status: validation.status },
        { status: 403 }
      );
    }

    // 3. Crear sesión en cn_sessions
    const { error: sessionError } = await supabaseAdmin
      .from('cn_sessions')
      .insert({
        user_id: authData.user.id,
        revoked: false,
        last_activity: new Date().toISOString()
      });

    if (sessionError) {
      console.error('Error creating session:', sessionError);
    }

    return NextResponse.json({
      success: true,
      user: authData.user,
      session: authData.session
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    );
  }
}
```

### 3. Validar en Cada Request (Middleware)

Para mayor seguridad, validar el status en cada petición protegida:

```typescript
// src/middleware/cnAuthMiddleware.ts (NUEVO ARCHIVO)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function cnAuthMiddleware(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Obtener el usuario de la sesión
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }

  // Verificar el status
  const { data: cnUser } = await supabaseAdmin
    .from('cn_users')
    .select('status')
    .eq('id', user.id)
    .single();

  if (!cnUser || cnUser.status !== 'active') {
    return NextResponse.json(
      { error: 'Cuenta inactiva o suspendida' },
      { status: 403 }
    );
  }

  // Continuar con la petición
  return NextResponse.next();
}
```

### 4. Revocar Sesiones Existentes al Desactivar

Cuando cambias el status a `inactive`, deberías revocar todas las sesiones activas:

```typescript
// Agregar a src/app/api/admin/cn/users/route.ts en la función PUT
if (updates.status && updates.status !== 'active') {
  // Revocar todas las sesiones del usuario
  await supabaseAdmin
    .from('cn_sessions')
    .update({ revoked: true })
    .eq('user_id', id);
    
  // También cerrar la sesión de auth si existe
  // Nota: Esto requiere el user_id de auth, no el id de cn_users
}
```

## 🎯 Implementación Paso a Paso

1. **Crear el archivo de validación** `src/lib/cnAuth.ts`
2. **Implementar RLS en Supabase** (ejecutar SQL)
3. **Modificar el endpoint de login** para validar status
4. **Actualizar el PUT de users** para revocar sesiones
5. **Probar el flujo completo**

## 🧪 Testing

```typescript
// Tests a realizar:
1. Usuario con status='active' → Debe poder iniciar sesión ✅
2. Usuario con status='inactive' → Debe ser rechazado ❌
3. Usuario con status='pending' → Debe ser rechazado ❌
4. Cambiar status a 'inactive' → Debe cerrar sesión activa ❌
```

## 📚 Documentación

- **Valores permitidos**: `'active'`, `'inactive'`, `'pending'`
- **Comportamiento**: Solo usuarios `'active'` pueden acceder
- **Gestión**: Se controla desde `/admin/cn/users`
- **Seguridad**: Validación en RLS + Backend
